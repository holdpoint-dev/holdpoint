import React from "react";
import type {
  ControlCommand,
  EventV1,
  ProjectSummary,
  SessionSummary,
} from "@holdpoint/live-protocol";
import { fetchJson, postJson } from "../lib/api";
import { basename } from "../lib/format";
import { buildSessionKey, mergeEvents, upsertProject, upsertSession } from "../lib/events";

export type ConnectionState = "connecting" | "live" | "reconnecting" | "offline";

export interface ProjectHint {
  project: string | null;
  name: string | null;
  root: string | null;
}

function readProjectHint(): ProjectHint {
  const params = new URLSearchParams(window.location.search);
  return {
    project: params.get("project"),
    name: params.get("name"),
    root: params.get("root"),
  };
}

export interface LiveStore {
  projectHint: ProjectHint;
  projects: ProjectSummary[];
  sessions: SessionSummary[];
  eventsBySession: Record<string, EventV1[]>;
  connectionState: ConnectionState;
  error: string | null;
  maxSeq: number;
  selectedProjectHash: string | null;
  setSelectedProjectHash: (hash: string | null) => void;
  sendControl: (sessionKey: string, command: ControlCommand) => Promise<boolean>;
  controlBusy: Record<string, boolean>;
  clearError: () => void;
}

/**
 * Owns all live data: REST bootstrap/hydration, the WebSocket stream, and the
 * derived project/session/event maps. UI components consume the returned slice
 * and never talk to the daemon directly (except via `sendControl`).
 */
export function useLiveStore(): LiveStore {
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
  const [maxSeq, setMaxSeq] = React.useState(0);
  const maxSeqRef = React.useRef(0);

  const ingestEvents = React.useCallback((incoming: EventV1[]) => {
    if (incoming.length === 0) return;

    for (const event of incoming) {
      maxSeqRef.current = Math.max(maxSeqRef.current, event.seq ?? 0);
    }
    setMaxSeq(maxSeqRef.current);

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
        if (!cancelled) setError((nextError as Error).message);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const hydrateProject = React.useCallback(
    async (projectHash: string) => {
      if (hydratedProjects[projectHash]) return;

      const sessionsResponse = await fetchJson<{ sessions: SessionSummary[] }>(
        `/v1/sessions?project_hash=${encodeURIComponent(projectHash)}`,
      );
      setSessions((current) => {
        const next = [...current];
        for (const session of sessionsResponse.sessions) {
          const index = next.findIndex((candidate) => candidate.key === session.key);
          if (index === -1) next.push(session);
          else next[index] = session;
        }
        return next.sort((left, right) => right.last_event_at - left.last_event_at);
      });

      const eventResponses = await Promise.all(
        sessionsResponse.sessions.map((session) =>
          fetchJson<{
            session_key: string;
            since_seq: number;
            max_seq: number;
            events: EventV1[];
          }>(`/v1/sessions/${encodeURIComponent(session.key)}/events?since_seq=0&limit=500`),
        ),
      );

      ingestEvents(eventResponses.flatMap((response) => response.events));
      setHydratedProjects((current) => ({ ...current, [projectHash]: true }));
    },
    [hydratedProjects, ingestEvents],
  );

  React.useEffect(() => {
    if (!selectedProjectHash) return;
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
      if (!active) return;
      setConnectionState("reconnecting");
      reconnectTimer = window.setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 10_000);
    }

    function connect(): void {
      if (!active) return;
      setConnectionState("connecting");
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${protocol}//${window.location.host}/v1/stream`);

      socket.addEventListener("open", () => {
        reconnectDelay = 1_000;
        setConnectionState("live");
        socket?.send(
          JSON.stringify({ type: "subscribe", scope: "all", since_seq: maxSeqRef.current }),
        );
      });

      socket.addEventListener("message", (message) => {
        const parsed = JSON.parse(String(message.data)) as
          | { type: "event"; event: EventV1 }
          | { type: "events_batch"; events: EventV1[] }
          | { type: "error"; message: string };
        if (parsed.type === "event") ingestEvents([parsed.event]);
        else if (parsed.type === "events_batch") ingestEvents(parsed.events);
        else if (parsed.type === "error") setError(parsed.message);
      });

      socket.addEventListener("close", () => {
        socket = null;
        if (active) scheduleReconnect();
      });

      socket.addEventListener("error", () => setConnectionState("offline"));
    }

    connect();
    return () => {
      active = false;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [ingestEvents]);

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

  // Surface a project hint (from the URL) even before its first event arrives,
  // so a freshly-opened window isn't blank.
  const projectsWithHint = React.useMemo(() => {
    if (!projectHint.project || projects.some((p) => p.project_hash === projectHint.project)) {
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
    if (!selectedProjectHash && projectsWithHint.length > 0) {
      setSelectedProjectHash(projectsWithHint[0]?.project_hash ?? null);
    }
  }, [projectsWithHint, selectedProjectHash]);

  const clearError = React.useCallback(() => setError(null), []);

  return {
    projectHint,
    projects: projectsWithHint,
    sessions,
    eventsBySession,
    connectionState,
    error,
    maxSeq,
    selectedProjectHash,
    setSelectedProjectHash,
    sendControl,
    controlBusy,
    clearError,
  };
}
