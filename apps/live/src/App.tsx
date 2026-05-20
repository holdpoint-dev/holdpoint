import React from "react";
import type {
  ControlCommand,
  EventV1,
  ProjectSummary,
  SessionSummary,
} from "@holdpoint/live-protocol";

type EventType = EventV1["type"];
type ConnectionState = "connecting" | "live" | "reconnecting" | "offline";
type ProjectHint = {
  project: string | null;
  name: string | null;
  root: string | null;
};

const EVENT_TYPES: EventType[] = [
  "session_start",
  "session_end",
  "prompt_submit",
  "tool_pre",
  "tool_post",
  "tool_failure",
  "notification",
  "stop_block",
  "stop_pass",
  "check_run",
  "permission_pending",
  "permission_resolved",
  "conflict",
  "control",
  "meta",
];

function buildSessionKey(event: Pick<EventV1, "project_hash" | "engine" | "session_id">): string {
  return `${event.project_hash}:${event.engine}:${event.session_id}`;
}

function readProjectHint(): ProjectHint {
  const params = new URLSearchParams(window.location.search);
  return {
    project: params.get("project"),
    name: params.get("name"),
    root: params.get("root"),
  };
}

function basename(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function formatClock(value: number): string {
  if (value <= 0) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function formatAgo(value: number): string {
  if (value <= 0) return "awaiting activity";
  const diffMs = Math.max(0, Date.now() - value);
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function formatProjectColor(projectHash: string): string {
  const hue = Number.parseInt(projectHash.slice(0, 6), 16) % 360;
  return `hsl(${hue} 75% 58%)`;
}

function sessionLabel(session: SessionSummary): string {
  return `${session.engine} · ${session.session_id.slice(0, 6)}`;
}

function latestEvent(events: EventV1[]): EventV1 | null {
  return events[events.length - 1] ?? null;
}

function openPendingPermissions(
  events: EventV1[],
): Extract<EventV1, { type: "permission_pending" }>[] {
  const open = new Map<string, Extract<EventV1, { type: "permission_pending" }>>();
  const ordered = [...events].sort((left, right) => {
    const leftSeq = left.seq ?? 0;
    const rightSeq = right.seq ?? 0;
    if (leftSeq !== rightSeq) return leftSeq - rightSeq;
    return left.ts - right.ts;
  });
  for (const event of ordered) {
    if (event.type === "permission_pending") {
      open.set(event.payload.request_id, event);
    }
    if (event.type === "permission_resolved") {
      open.delete(event.payload.request_id);
    }
  }
  return [...open.values()].sort((left, right) => (right.seq ?? 0) - (left.seq ?? 0));
}

function sessionStatus(events: EventV1[]): {
  label: string;
  tone: "neutral" | "accent" | "danger" | "success";
} {
  if (openPendingPermissions(events).length > 0) {
    return { label: "Awaiting approval", tone: "accent" };
  }
  const last = latestEvent(events);
  if (!last) return { label: "Waiting", tone: "neutral" };
  if (last.type === "conflict") return { label: "Conflict", tone: "danger" };
  if (last.type === "stop_block") return { label: "Blocked", tone: "danger" };
  if (last.type === "tool_pre") return { label: "Running", tone: "accent" };
  if (last.type === "tool_post" || last.type === "stop_pass")
    return { label: "Healthy", tone: "success" };
  return { label: "Active", tone: "neutral" };
}

function statusClasses(tone: "neutral" | "accent" | "danger" | "success"): string {
  switch (tone) {
    case "accent":
      return "border-orange-500/50 bg-orange-500/10 text-orange-200";
    case "danger":
      return "border-red-500/40 bg-red-500/10 text-red-200";
    case "success":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
    case "neutral":
      return "border-white/10 bg-white/5 text-stone-200";
  }
}

function mergeEvents(existing: EventV1[], incoming: EventV1[]): EventV1[] {
  const byId = new Map<string, EventV1>();
  for (const event of existing) {
    byId.set(event.id, event);
  }
  for (const event of incoming) {
    byId.set(event.id, event);
  }
  return [...byId.values()].sort((left, right) => {
    const leftSeq = left.seq ?? 0;
    const rightSeq = right.seq ?? 0;
    if (leftSeq !== rightSeq) {
      return leftSeq - rightSeq;
    }
    return left.ts - right.ts;
  });
}

function upsertProject(projects: ProjectSummary[], event: EventV1): ProjectSummary[] {
  const next = [...projects];
  const index = next.findIndex((candidate) => candidate.project_hash === event.project_hash);
  const fallbackRoot = event.cwd;
  const fallbackName = basename(fallbackRoot);
  if (index === -1) {
    next.push({
      project_hash: event.project_hash,
      name: fallbackName,
      root: fallbackRoot,
      last_active: event.ts,
      session_count: 1,
    });
  } else {
    const current = next[index];
    if (!current) return projects;
    next[index] = {
      ...current,
      last_active: Math.max(current.last_active, event.ts),
      session_count: Math.max(current.session_count, 1),
    };
  }

  return next.sort((left, right) => right.last_active - left.last_active);
}

function upsertSession(sessions: SessionSummary[], event: EventV1): SessionSummary[] {
  const key = buildSessionKey(event);
  const next = [...sessions];
  const index = next.findIndex((candidate) => candidate.key === key);
  if (index === -1) {
    next.push({
      key,
      project_hash: event.project_hash,
      engine: event.engine,
      session_id: event.session_id,
      cwd: event.cwd,
      last_event_at: event.ts,
      event_count: 1,
      ...(event.seq ? { last_seq: event.seq } : {}),
      ...(event.caps ? { caps: event.caps } : {}),
    });
  } else {
    const current = next[index];
    if (!current) return sessions;
    const nextLastSeq = Math.max(current.last_seq ?? 0, event.seq ?? 0);
    next[index] = {
      ...current,
      cwd: event.cwd,
      last_event_at: Math.max(current.last_event_at, event.ts),
      event_count: current.event_count + 1,
      ...(nextLastSeq > 0 ? { last_seq: nextLastSeq } : {}),
      ...(event.caps ? { caps: event.caps } : {}),
    };
  }

  return next.sort((left, right) => right.last_event_at - left.last_event_at);
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

function summarizeEvent(event: EventV1): string {
  const metaToolName =
    event.type === "meta" && typeof event.payload.tool_name === "string"
      ? event.payload.tool_name
      : "tool";
  const metaCommand =
    event.type === "meta" && typeof event.payload.command === "string"
      ? event.payload.command
      : "control command";
  switch (event.type) {
    case "tool_pre":
      return `${event.payload.tool_name} started`;
    case "tool_post":
      return `${event.payload.tool_name} ${event.payload.success ? "completed" : "finished"} in ${event.payload.duration_ms}ms`;
    case "tool_failure":
      return `${event.payload.tool_name} failed: ${event.payload.error}`;
    case "prompt_submit":
      return event.payload.prompt;
    case "check_run":
      return `${event.payload.label} · ${event.payload.status}`;
    case "permission_pending":
      return `${event.payload.permission_kind} permission pending${event.payload.title ? ` · ${event.payload.title}` : ""}`;
    case "permission_resolved":
      return `${event.payload.request_id} ${event.payload.outcome}`;
    case "stop_block":
      return `${event.payload.failing_checks.length} failing checks`;
    case "stop_pass":
      return `Stop passed in ${event.payload.duration_ms}ms`;
    case "notification":
      return `${event.payload.kind}: ${event.payload.message}`;
    case "conflict":
      return `${event.payload.file_path} is already being touched by ${event.payload.holder.engine}`;
    case "meta":
      switch (event.payload.kind) {
        case "control_socket_registered":
          return "Control socket connected";
        case "control_socket_disconnected":
          return "Control socket disconnected";
        case "inject_context_queued":
          return "Inject context queued";
        case "inject_context_consumed":
          return "Inject context consumed";
        case "inject_context_expired":
          return "Inject context expired";
        case "inject_context_dropped":
          return "Inject context dropped";
        case "trigger_tool_completed":
          return `Triggered ${metaToolName}`;
        case "trigger_tool_rejected":
          return `Rejected ${metaToolName}`;
        case "control_rejected":
          return `Rejected ${metaCommand}`;
        default:
          return event.payload.kind;
      }
    case "control":
      return `${event.payload.command} by user`;
    case "session_start":
      return "Session started";
    case "session_end":
      return `Session ended (${event.payload.reason ?? "unknown"})`;
    default:
      return "event";
  }
}

export default function App() {
  const projectHint = React.useMemo(() => readProjectHint(), []);
  const [projects, setProjects] = React.useState<ProjectSummary[]>([]);
  const [sessions, setSessions] = React.useState<SessionSummary[]>([]);
  const [eventsBySession, setEventsBySession] = React.useState<Record<string, EventV1[]>>({});
  const [hydratedProjects, setHydratedProjects] = React.useState<Record<string, true>>({});
  const [selectedProjectHash, setSelectedProjectHash] = React.useState<string | null>(
    projectHint.project,
  );
  const [connectionState, setConnectionState] = React.useState<ConnectionState>("connecting");
  const [error, setError] = React.useState<string | null>(null);
  const [controlBusy, setControlBusy] = React.useState<Record<string, boolean>>({});
  const [injectDrafts, setInjectDrafts] = React.useState<Record<string, string>>({});
  const [filters, setFilters] = React.useState<Record<EventType, boolean>>(
    () => Object.fromEntries(EVENT_TYPES.map((type) => [type, true])) as Record<EventType, boolean>,
  );
  const maxSeqRef = React.useRef(0);

  const ingestEvents = React.useCallback((incoming: EventV1[]) => {
    if (incoming.length === 0) {
      return;
    }

    for (const event of incoming) {
      maxSeqRef.current = Math.max(maxSeqRef.current, event.seq ?? 0);
    }

    setProjects((current) => incoming.reduce((next, event) => upsertProject(next, event), current));
    setSessions((current) => incoming.reduce((next, event) => upsertSession(next, event), current));
    setEventsBySession((current) => {
      const next = { ...current };
      for (const event of incoming) {
        const key = buildSessionKey(event);
        next[key] = mergeEvents(next[key] ?? [], [event]);
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      try {
        const [projectsResponse, sessionsResponse] = await Promise.all([
          fetchJson<{ projects: ProjectSummary[] }>("/v1/projects"),
          fetchJson<{ sessions: SessionSummary[] }>("/v1/sessions"),
        ]);
        if (cancelled) return;
        setProjects(projectsResponse.projects);
        setSessions(sessionsResponse.sessions);
        setSelectedProjectHash(
          (current) => current ?? projectsResponse.projects[0]?.project_hash ?? null,
        );
        setError(null);
      } catch (nextError) {
        if (!cancelled) {
          setError((nextError as Error).message);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const hydrateProject = React.useCallback(
    async (projectHash: string) => {
      if (hydratedProjects[projectHash]) {
        return;
      }

      const sessionsResponse = await fetchJson<{ sessions: SessionSummary[] }>(
        `/v1/sessions?project_hash=${encodeURIComponent(projectHash)}`,
      );
      setSessions((current) => {
        const next = [...current];
        for (const session of sessionsResponse.sessions) {
          const index = next.findIndex((candidate) => candidate.key === session.key);
          if (index === -1) {
            next.push(session);
          } else {
            next[index] = session;
          }
        }
        return next.sort((left, right) => right.last_event_at - left.last_event_at);
      });

      const eventResponses = await Promise.all(
        sessionsResponse.sessions.map(async (session) => {
          return await fetchJson<{
            session_key: string;
            since_seq: number;
            max_seq: number;
            events: EventV1[];
          }>(`/v1/sessions/${encodeURIComponent(session.key)}/events?since_seq=0&limit=500`);
        }),
      );

      const loadedEvents = eventResponses.flatMap((response) => response.events);
      ingestEvents(loadedEvents);
      setHydratedProjects((current) => ({ ...current, [projectHash]: true }));
    },
    [hydratedProjects, ingestEvents],
  );

  React.useEffect(() => {
    if (!selectedProjectHash) {
      return;
    }
    void hydrateProject(selectedProjectHash).catch((nextError) => {
      setError((nextError as Error).message);
    });
  }, [hydrateProject, selectedProjectHash]);

  React.useEffect(() => {
    let active = true;
    let socket: WebSocket | null = null;
    let reconnectDelay = 1_000;
    let reconnectTimer: number | undefined;

    function scheduleReconnect(): void {
      if (!active) {
        return;
      }
      setConnectionState("reconnecting");
      reconnectTimer = window.setTimeout(() => {
        connect();
      }, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 10_000);
    }

    function connect(): void {
      if (!active) {
        return;
      }

      setConnectionState("connecting");
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${protocol}//${window.location.host}/v1/stream`);

      socket.addEventListener("open", () => {
        reconnectDelay = 1_000;
        setConnectionState("live");
        socket?.send(
          JSON.stringify({
            type: "subscribe",
            scope: "all",
            since_seq: maxSeqRef.current,
          }),
        );
      });

      socket.addEventListener("message", (message) => {
        const parsed = JSON.parse(String(message.data)) as
          | { type: "event"; event: EventV1 }
          | { type: "events_batch"; events: EventV1[] }
          | { type: "error"; message: string };

        if (parsed.type === "event") {
          ingestEvents([parsed.event]);
        } else if (parsed.type === "events_batch") {
          ingestEvents(parsed.events);
        } else if (parsed.type === "error") {
          setError(parsed.message);
        }
      });

      socket.addEventListener("close", () => {
        socket = null;
        if (active) {
          scheduleReconnect();
        }
      });

      socket.addEventListener("error", () => {
        setConnectionState("offline");
      });
    }

    connect();
    return () => {
      active = false;
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [ingestEvents]);

  const availableProjects = React.useMemo(() => {
    if (
      !projectHint.project ||
      projects.some((project) => project.project_hash === projectHint.project)
    ) {
      return projects;
    }
    return [
      {
        project_hash: projectHint.project,
        name: projectHint.name ?? basename(projectHint.root ?? projectHint.project),
        root: projectHint.root ?? "Awaiting first event",
        last_active: 0,
        session_count: 0,
      },
      ...projects,
    ];
  }, [projectHint, projects]);

  React.useEffect(() => {
    if (!selectedProjectHash && availableProjects.length > 0) {
      setSelectedProjectHash(availableProjects[0]?.project_hash ?? null);
    }
  }, [availableProjects, selectedProjectHash]);

  const currentProject = React.useMemo(() => {
    return (
      availableProjects.find((project) => project.project_hash === selectedProjectHash) ?? null
    );
  }, [availableProjects, selectedProjectHash]);

  const currentSessions = React.useMemo(() => {
    if (!selectedProjectHash) return [];
    return sessions
      .filter((session) => session.project_hash === selectedProjectHash)
      .sort((left, right) => right.last_event_at - left.last_event_at);
  }, [selectedProjectHash, sessions]);

  const selectedProjectEvents = React.useMemo(() => {
    return currentSessions
      .flatMap((session) => eventsBySession[session.key] ?? [])
      .filter(
        (event, index, all) => all.findIndex((candidate) => candidate.id === event.id) === index,
      )
      .sort((left, right) => (right.seq ?? 0) - (left.seq ?? 0));
  }, [currentSessions, eventsBySession]);

  const filteredEvents = React.useMemo(() => {
    return selectedProjectEvents.filter((event) => filters[event.type]);
  }, [filters, selectedProjectEvents]);

  const recentConflicts = React.useMemo(() => {
    const seen = new Set<string>();
    return selectedProjectEvents.filter(
      (event): event is Extract<EventV1, { type: "conflict" }> => {
        if (event.type !== "conflict") return false;
        const key = `${event.payload.file_path}:${event.payload.holder.session_id}:${event.payload.requester.session_id}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      },
    );
  }, [selectedProjectEvents]);

  const sendControl = React.useCallback(async (sessionKey: string, command: ControlCommand) => {
    setControlBusy((current) => ({ ...current, [sessionKey]: true }));
    try {
      await postJson<{ ok: true; delivered: true }>("/v1/control", {
        session_key: sessionKey,
        command,
      });
      setError(null);
      return true;
    } catch (nextError) {
      setError((nextError as Error).message);
      return false;
    } finally {
      setControlBusy((current) => ({ ...current, [sessionKey]: false }));
    }
  }, []);

  return (
    <div className="flex h-full bg-[color:var(--color-canvas)] text-[color:var(--color-bone)]">
      <aside className="flex w-80 flex-col border-r border-white/10 bg-[color:var(--color-panel)]">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
            Holdpoint Live
          </div>
          <div className="mt-2 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Projects</h1>
            <span
              className={`rounded-full border px-2 py-1 text-xs ${statusClasses(
                connectionState === "live"
                  ? "success"
                  : connectionState === "reconnecting"
                    ? "accent"
                    : "neutral",
              )}`}
            >
              {connectionState}
            </span>
          </div>
          <p className="mt-2 text-sm text-[color:var(--color-muted)]">
            One active project view at a time. Sessions from different repos never mix in the main
            panel.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {availableProjects.length === 0 ? (
            <div className="px-5 py-6 text-sm text-[color:var(--color-muted)]">
              No live projects yet. Keep this window open; sessions will appear as soon as events
              arrive.
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {availableProjects.map((project) => (
                <li key={project.project_hash}>
                  <button
                    className={`flex w-full items-start gap-3 border-b border-white/5 px-5 py-4 text-left transition hover:bg-white/5 ${
                      selectedProjectHash === project.project_hash ? "bg-white/6" : ""
                    }`}
                    onClick={() => setSelectedProjectHash(project.project_hash)}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1 h-3 w-3 rounded-full"
                      style={{ backgroundColor: formatProjectColor(project.project_hash) }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{project.name}</span>
                      <span className="mt-1 block truncate text-xs text-[color:var(--color-muted)]">
                        {project.root}
                      </span>
                      <span className="mt-2 block text-xs text-[color:var(--color-muted)]">
                        {project.session_count} sessions · {formatAgo(project.last_active)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">
                {currentProject?.name ?? "Awaiting project selection"}
              </h2>
              <p className="mt-2 text-sm text-[color:var(--color-muted)]">
                {currentProject?.root ??
                  "Open Holdpoint from a project or wait for the first event."}
              </p>
            </div>
            <div className="grid gap-2 text-right text-xs text-[color:var(--color-muted)]">
              <span>{currentSessions.length} tracked sessions</span>
              <span>{filteredEvents.length} visible events</span>
              <span>Latest seq {maxSeqRef.current || "—"}</span>
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </div>

        {recentConflicts.length > 0 ? (
          <div className="border-b border-red-500/20 bg-red-500/8 px-6 py-4">
            <div className="mb-2 text-sm font-semibold text-red-200">Conflict warnings</div>
            <div className="flex flex-wrap gap-2">
              {recentConflicts.map((event) => (
                <span
                  key={event.id}
                  className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-100"
                >
                  {event.payload.file_path} · {event.payload.holder.engine} vs{" "}
                  {event.payload.requester.engine}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid h-[calc(100%-109px)] grid-cols-[minmax(320px,420px)_1fr]">
          <section className="min-h-0 border-r border-white/10 bg-black/10">
            <div className="border-b border-white/10 px-6 py-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                Sessions
              </h3>
            </div>
            <div className="min-h-0 overflow-y-auto px-4 py-4">
              {currentSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 px-5 py-6 text-sm text-[color:var(--color-muted)]">
                  {selectedProjectHash
                    ? "This project has no live sessions yet. If you opened Holdpoint before the first event, this placeholder is expected."
                    : "Select a project to inspect live sessions."}
                </div>
              ) : (
                <div className="grid gap-3">
                  {currentSessions.map((session) => {
                    const events = eventsBySession[session.key] ?? [];
                    const status = sessionStatus(events);
                    const latest = latestEvent(events);
                    const pendingPermissions = openPendingPermissions(events);
                    const canControl = Boolean(session.caps?.can_control);
                    const controlOnline = Boolean(session.caps?.control_online);
                    const injectDraft = injectDrafts[session.key] ?? "";
                    const busy = controlBusy[session.key] ?? false;
                    return (
                      <article
                        key={session.key}
                        className="rounded-2xl border border-white/10 bg-[color:var(--color-panel)] px-4 py-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">{sessionLabel(session)}</div>
                            <div className="mt-1 text-xs text-[color:var(--color-muted)]">
                              {session.cwd}
                            </div>
                          </div>
                          <span
                            className={`rounded-full border px-2 py-1 text-[11px] font-medium ${statusClasses(
                              status.tone,
                            )}`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-[color:var(--color-muted)]">
                          <div>
                            <dt className="uppercase tracking-[0.15em]">Last event</dt>
                            <dd className="mt-1 text-sm text-[color:var(--color-bone)]">
                              {formatClock(session.last_event_at)}
                            </dd>
                          </div>
                          <div>
                            <dt className="uppercase tracking-[0.15em]">Events</dt>
                            <dd className="mt-1 text-sm text-[color:var(--color-bone)]">
                              {session.event_count}
                            </dd>
                          </div>
                        </dl>
                        {latest ? (
                          <p className="mt-4 rounded-xl border border-white/8 bg-black/20 px-3 py-3 text-xs text-stone-200">
                            {summarizeEvent(latest)}
                          </p>
                        ) : null}
                        <div className="mt-4 rounded-xl border border-white/8 bg-black/20 px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                              Control
                            </div>
                            <span className="text-[11px] text-[color:var(--color-muted)]">
                              {!canControl
                                ? "observe only"
                                : controlOnline
                                  ? "live controls online"
                                  : "bridge offline"}
                            </span>
                          </div>

                          {pendingPermissions.length > 0 ? (
                            <div className="mt-3 grid gap-2">
                              {pendingPermissions.map((event) => (
                                <div
                                  key={event.payload.request_id}
                                  className="rounded-xl border border-orange-500/25 bg-orange-500/10 px-3 py-3"
                                >
                                  <div className="text-xs font-medium text-orange-100">
                                    {event.payload.title ?? event.payload.permission_kind}
                                  </div>
                                  <div className="mt-1 text-[11px] text-orange-50/85">
                                    {event.payload.details ??
                                      `${event.payload.permission_kind} permission pending`}
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                      disabled={!canControl || !controlOnline || busy}
                                      onClick={() =>
                                        void sendControl(session.key, {
                                          command: "approve_pending",
                                          args: { request_id: event.payload.request_id },
                                          actor: "user",
                                        })
                                      }
                                      type="button"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                      disabled={!canControl || !controlOnline || busy}
                                      onClick={() =>
                                        void sendControl(session.key, {
                                          command: "deny_pending",
                                          args: { request_id: event.payload.request_id },
                                          actor: "user",
                                        })
                                      }
                                      type="button"
                                    >
                                      Deny
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-3 text-xs text-[color:var(--color-muted)]">
                              {canControl
                                ? controlOnline
                                  ? "No pending approvals for this session."
                                  : "Control will appear when the Copilot bridge is connected."
                                : "This session does not expose active controls in Phase 4."}
                            </p>
                          )}

                          <div className="mt-3 grid gap-2">
                            <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                              Inject context
                            </label>
                            <div className="flex gap-2">
                              <input
                                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-stone-100 outline-none placeholder:text-stone-500"
                                disabled={!canControl || !controlOnline || busy}
                                onChange={(event) =>
                                  setInjectDrafts((current) => ({
                                    ...current,
                                    [session.key]: event.target.value,
                                  }))
                                }
                                placeholder="Queue a developer-style note for the next turn"
                                type="text"
                                value={injectDraft}
                              />
                              <button
                                className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={
                                  !canControl ||
                                  !controlOnline ||
                                  busy ||
                                  injectDraft.trim().length === 0
                                }
                                onClick={() => {
                                  const text = injectDraft.trim();
                                  if (!text) return;
                                  void sendControl(session.key, {
                                    command: "inject_context",
                                    args: { text },
                                    actor: "user",
                                  }).then((ok) => {
                                    if (ok) {
                                      setInjectDrafts((current) => ({
                                        ...current,
                                        [session.key]: "",
                                      }));
                                    }
                                  });
                                }}
                                type="button"
                              >
                                Inject
                              </button>
                            </div>
                            <button
                              className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={!canControl || !controlOnline || busy}
                              onClick={() =>
                                void sendControl(session.key, {
                                  command: "trigger_tool",
                                  args: {
                                    tool_name: "holdpoint_dry_run",
                                    input: {},
                                  },
                                  actor: "user",
                                })
                              }
                              type="button"
                            >
                              Trigger holdpoint_dry_run
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-col">
            <div className="border-b border-white/10 px-6 py-4">
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map((type) => {
                  const checked = filters[type];
                  return (
                    <label
                      key={type}
                      className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                        checked
                          ? "border-orange-500/40 bg-orange-500/10 text-orange-100"
                          : "border-white/10 bg-white/5 text-[color:var(--color-muted)]"
                      }`}
                    >
                      <input
                        checked={checked}
                        className="accent-orange-500"
                        onChange={() =>
                          setFilters((current) => ({
                            ...current,
                            [type]: !current[type],
                          }))
                        }
                        type="checkbox"
                      />
                      {type}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {filteredEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/3 px-5 py-6 text-sm text-[color:var(--color-muted)]">
                  No events match the current filters for this project yet.
                </div>
              ) : (
                <ol className="m-0 grid list-none gap-3 p-0">
                  {filteredEvents.map((event) => (
                    <li
                      key={event.id}
                      className="rounded-2xl border border-white/10 bg-[color:var(--color-panel)] px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-200">
                            {event.type}
                          </span>
                          <span className="text-xs text-[color:var(--color-muted)]">
                            {event.engine} · {event.session_id.slice(0, 6)}
                          </span>
                        </div>
                        <div className="text-xs text-[color:var(--color-muted)]">
                          seq {event.seq ?? "—"} · {formatClock(event.ts)}
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-stone-100">{summarizeEvent(event)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
