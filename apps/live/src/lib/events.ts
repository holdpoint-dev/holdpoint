import type { EventV1, ProjectSummary, SessionSummary } from "@holdpoint/live-protocol";
import { basename } from "./format";

export type EventType = EventV1["type"];
export type Tone = "neutral" | "accent" | "danger" | "success" | "info";

export const EVENT_TYPES: EventType[] = [
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

export type ConflictEvent = Extract<EventV1, { type: "conflict" }>;
export type PermissionPendingEvent = Extract<EventV1, { type: "permission_pending" }>;
export type CheckRunEvent = Extract<EventV1, { type: "check_run" }>;

export function buildSessionKey(
  event: Pick<EventV1, "project_hash" | "engine" | "session_id">,
): string {
  return `${event.project_hash}:${event.engine}:${event.session_id}`;
}

export function sessionLabel(session: SessionSummary): string {
  return `${session.engine} · ${session.session_id.slice(0, 6)}`;
}

export function latestEvent(events: EventV1[]): EventV1 | null {
  return events[events.length - 1] ?? null;
}

export function openPendingPermissions(events: EventV1[]): PermissionPendingEvent[] {
  const open = new Map<string, PermissionPendingEvent>();
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

export function sessionStatus(events: EventV1[]): { label: string; tone: Tone } {
  if (openPendingPermissions(events).length > 0) {
    return { label: "Awaiting approval", tone: "accent" };
  }
  const last = latestEvent(events);
  if (!last) return { label: "Waiting", tone: "neutral" };
  if (last.type === "conflict") return { label: "Conflict", tone: "danger" };
  if (last.type === "stop_block") return { label: "Blocked", tone: "danger" };
  if (last.type === "tool_failure") return { label: "Tool failed", tone: "danger" };
  if (last.type === "tool_pre") return { label: "Running", tone: "accent" };
  if (last.type === "session_end") return { label: "Ended", tone: "neutral" };
  if (last.type === "tool_post" || last.type === "stop_pass")
    return { label: "Healthy", tone: "success" };
  return { label: "Active", tone: "neutral" };
}

export function mergeEvents(existing: EventV1[], incoming: EventV1[]): EventV1[] {
  const byId = new Map<string, EventV1>();
  for (const event of existing) byId.set(event.id, event);
  for (const event of incoming) byId.set(event.id, event);
  return [...byId.values()].sort((left, right) => {
    const leftSeq = left.seq ?? 0;
    const rightSeq = right.seq ?? 0;
    if (leftSeq !== rightSeq) return leftSeq - rightSeq;
    return left.ts - right.ts;
  });
}

export function upsertProject(projects: ProjectSummary[], event: EventV1): ProjectSummary[] {
  const next = [...projects];
  const index = next.findIndex((candidate) => candidate.project_hash === event.project_hash);
  if (index === -1) {
    next.push({
      project_hash: event.project_hash,
      name: basename(event.cwd),
      root: event.cwd,
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

export function upsertSession(sessions: SessionSummary[], event: EventV1): SessionSummary[] {
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

export function summarizeEvent(event: EventV1): string {
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
      return `${event.payload.tool_name} ${
        event.payload.success ? "completed" : "finished"
      } in ${event.payload.duration_ms}ms`;
    case "tool_failure":
      return `${event.payload.tool_name} failed: ${event.payload.error}`;
    case "prompt_submit":
      return event.payload.prompt;
    case "check_run":
      return `${event.payload.label} · ${event.payload.status}`;
    case "permission_pending":
      return `${event.payload.permission_kind} permission pending${
        event.payload.title ? ` · ${event.payload.title}` : ""
      }`;
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

/** Tone used to color-code an event row by its semantic category. */
export function eventTone(type: EventType): Tone {
  switch (type) {
    case "tool_failure":
    case "stop_block":
    case "conflict":
      return "danger";
    case "tool_post":
    case "stop_pass":
      return "success";
    case "tool_pre":
    case "permission_pending":
      return "accent";
    case "check_run":
    case "prompt_submit":
      return "info";
    default:
      return "neutral";
  }
}

export interface ProjectHealth {
  checkTotal: number;
  checkPass: number;
  checkFail: number;
  checkSkip: number;
  checkPassRate: number | null;
  stopBlocks: number;
  stopPasses: number;
  gatePassRate: number | null;
  toolRuns: number;
  toolFailures: number;
  toolSuccessRate: number | null;
  conflicts: number;
  avgStopMs: number | null;
  failingCheckLabels: { label: string; count: number }[];
}

/** Aggregate gate-effectiveness metrics from a project's full event history. */
export function deriveHealth(events: EventV1[]): ProjectHealth {
  let checkPass = 0;
  let checkFail = 0;
  let checkSkip = 0;
  let stopBlocks = 0;
  let stopPasses = 0;
  let toolRuns = 0;
  let toolFailures = 0;
  let conflicts = 0;
  let stopMsTotal = 0;
  let stopMsCount = 0;
  const failingCheckCounts = new Map<string, number>();

  for (const event of events) {
    switch (event.type) {
      case "check_run":
        if (event.payload.status === "pass") checkPass += 1;
        else if (event.payload.status === "fail") {
          checkFail += 1;
          const key = event.payload.label;
          failingCheckCounts.set(key, (failingCheckCounts.get(key) ?? 0) + 1);
        } else checkSkip += 1;
        break;
      case "stop_block":
        stopBlocks += 1;
        break;
      case "stop_pass":
        stopPasses += 1;
        stopMsTotal += event.payload.duration_ms;
        stopMsCount += 1;
        break;
      case "tool_post":
        toolRuns += 1;
        if (!event.payload.success) toolFailures += 1;
        break;
      case "tool_failure":
        toolRuns += 1;
        toolFailures += 1;
        break;
      case "conflict":
        conflicts += 1;
        break;
      default:
        break;
    }
  }

  const checkTotal = checkPass + checkFail + checkSkip;
  const gateTotal = stopBlocks + stopPasses;

  return {
    checkTotal,
    checkPass,
    checkFail,
    checkSkip,
    checkPassRate: checkTotal > 0 ? checkPass / checkTotal : null,
    stopBlocks,
    stopPasses,
    gatePassRate: gateTotal > 0 ? stopPasses / gateTotal : null,
    toolRuns,
    toolFailures,
    toolSuccessRate: toolRuns > 0 ? (toolRuns - toolFailures) / toolRuns : null,
    conflicts,
    avgStopMs: stopMsCount > 0 ? stopMsTotal / stopMsCount : null,
    failingCheckLabels: [...failingCheckCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };
}
