// ─── Hook & when types ───────────────────────────────────────────────────────

/**
 * Lifecycle hook a check/action attaches to. `before_done` is the completion
 * gate (default). The others let checks seed context or run earlier in the loop:
 * - `session_start`  — a fresh session or resume
 * - `message_submit` — every user prompt
 * - `before_tool`    — immediately before a tool call (can block it)
 * - `after_tool`     — immediately after a tool call (advisory)
 * - `session_end`    — the session is ending (advisory)
 * - `before_done`    — the completion gate; blocks finishing on failure
 *
 * Engine support varies; engines honor what they can and skip the rest.
 */
export type HookEvent =
  | "session_start"
  | "message_submit"
  | "before_tool"
  | "after_tool"
  | "session_end"
  | "before_done";

/** Ordered list of all hook events, earliest-to-latest in the agent loop. */
export const HOOK_EVENTS: HookEvent[] = [
  "session_start",
  "message_submit",
  "before_tool",
  "after_tool",
  "session_end",
  "before_done",
];

/**
 * Context-seeding behavior: inject text, file contents, and/or the current
 * datetime as agent context at the check's hook point. An alternative to
 * `cmd` (command) and `prompt` (agent instruction).
 */
export interface InjectSpec {
  /** Literal text injected as agent context. */
  text?: string;
  /** Repo-relative files whose contents are injected as context. */
  files?: string[];
  /** Inject the current date and time. */
  datetime?: boolean;
}

/** Named file-scope filter. Custom regexes are plain strings not in this union. */
export type WhenScope =
  // Web / app layers
  | "frontend"
  | "backend"
  | "socket"
  | "visual"
  // Languages
  | "python"
  | "go"
  | "rust"
  | "java"
  | "ruby"
  // Cross-cutting concerns
  | "database"
  | "prisma"
  | "testing"
  | "infra"
  | "ci"
  | "docs"
  // Project structure / dependency manifests
  | "structural";

// ─── Condition types ─────────────────────────────────────────────────────────

export type ConditionOperator = "file_exists" | "file_contains" | "env_var_set" | "shell_returns_0";

export interface ConditionDef {
  id: string;
  operator: ConditionOperator;
  /** Path glob for file_exists / file_contains */
  path?: string;
  /** Substring to look for in file_contains */
  contains?: string;
  /** Env var name for env_var_set */
  envVar?: string;
  /** Shell command for shell_returns_0 */
  cmd?: string;
}

// ─── Check types ─────────────────────────────────────────────────────────────

export interface CheckDef {
  id: string;
  label: string;
  /** Lifecycle hook — defaults to "before_done" when absent */
  on?: HookEvent;
  /** File filter: a named WhenScope or a regex string. Absent = run always. */
  when?: string;
  /** Shell command — task (runs automatically) */
  cmd?: string;
  /** Structured prompt/instruction the agent must read and act on before finishing */
  prompt?: string;
  /** Context-seeding behavior — inject text/files/datetime at the hook point */
  inject?: InjectSpec;
  /** Reference to a ConditionDef id */
  conditionId?: string;
}

/** The effective hook of a check (`before_done` when unset). */
export function checkHook(check: CheckDef): HookEvent {
  return check.on ?? "before_done";
}

/** A check's behavior kind, derived from which behavior field is set. */
export type CheckBehavior = "cmd" | "prompt" | "inject";

export function checkBehavior(check: CheckDef): CheckBehavior {
  if (check.cmd !== undefined) return "cmd";
  if (check.inject !== undefined) return "inject";
  return "prompt";
}

// ─── Top-level config ─────────────────────────────────────────────────────────

export interface HoldpointContext {
  guides: Record<string, string>;
}

export interface HoldpointConfig {
  version: number;
  context: HoldpointContext;
  conditions: ConditionDef[];
  /** All checks — each has `on`, optional `when`, and either `cmd` (task) or `prompt` (agent instruction). */
  checks: CheckDef[];
  /**
   * Named regex patterns for use in `when:` fields.
   * Keys are human-readable names (e.g. "checks-file", "api-routes").
   * Values are regex strings matched against changed file paths.
   * Built-in scope names (frontend, backend, structural, etc.) cannot be overridden here.
   */
  patterns?: Record<string, string>;
  /**
   * Files to inject as `additionalContext` at the start of every agent session.
   * Paths are repo-root-relative. Useful for injecting MASTER_PROMPT.md, AGENT_CONTEXT.md, etc.
   */
  session_context_files?: string[];
  /**
   * Inject the current date and time into every prompt submission as `additionalContext`.
   * Helps models avoid knowledge-cutoff confusion. Defaults to `true`; set to `false` to opt out.
   */
  inject_datetime?: boolean;
  /**
   * Per-engine overrides. Values here win over engine defaults — useful when the
   * project IS the holdpoint repo and should invoke the local CLI instead of npx.
   */
  engines?: {
    claude?: { stop_command?: string; live_command?: string };
    codex?: { stop_command?: string };
    copilot?: { check_command?: string };
  };
}

// ─── Runtime result types ────────────────────────────────────────────────────

export type CheckStatus = "pass" | "fail" | "skip" | "pending";

export interface CheckResult {
  check: CheckDef;
  status: CheckStatus;
  /** stdout/stderr from a deterministic check */
  output?: string;
  /** Exit code from a deterministic check */
  exitCode?: number;
  /** Human-readable reason for skip */
  skipReason?: string;
}

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ─── Agent detection ─────────────────────────────────────────────────────────

export type AgentType = "copilot" | "claude" | "cursor" | "codex" | "unknown";

// ─── Check run report types ────────────────────────────────────────────────────

/** Result of a single check within a run (cmd or prompt). */
export interface CheckRunResult {
  id: string;
  label: string;
  /** "cmd" for automated checks, "prompt" for manual agent checks */
  kind: "cmd" | "prompt";
  /** "pass" | "fail" | "skip" for cmd checks; "shown" for prompt checks displayed to agent */
  status: "pass" | "fail" | "skip" | "shown";
  output?: string;
  exitCode?: number;
  skipReason?: string;
}

/** A single holdpoint check run recorded after `holdpoint check` completes. */
export interface CheckRun {
  /** Full HEAD commit SHA, or null if not in a git repo / no commits. */
  sha: string | null;
  /** First 8 chars of sha, or null. */
  shortSha: string | null;
  /** ISO 8601 timestamp. */
  timestamp: string;
  /** Changed files used for trigger matching. Empty array means "all checks ran". */
  files: string[];
  results: CheckRunResult[];
  summary: { passed: number; failed: number; skipped: number; shown: number };
}

/** Contents of `.holdpoint/check-reports.json` — list of recent check runs. */
export interface CheckReports {
  /** Runs ordered newest-first. Capped at 50 entries. */
  runs: CheckRun[];
}
