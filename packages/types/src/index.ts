// ─── Hook & when types ───────────────────────────────────────────────────────

/** Lifecycle hook that fires the check. Currently only "before_done". */
export type HookEvent = "before_done";

/** Named file-scope filter. Custom regexes are plain strings not in this union. */
export type WhenScope = "frontend" | "backend" | "prisma" | "socket" | "visual";

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
  /** Reference to a ConditionDef id */
  conditionId?: string;
}

// ─── Top-level config ─────────────────────────────────────────────────────────

export interface SentinelContext {
  guides: Record<string, string>;
}

export interface SentinelConfig {
  version: number;
  context: SentinelContext;
  conditions: ConditionDef[];
  task: CheckDef[];
  prompt: CheckDef[];
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

// ─── Agent / stack detection ─────────────────────────────────────────────────

export type AgentType = "copilot" | "claude" | "cursor" | "unknown";

export type StackType = "typescript" | "python" | "nextjs" | "fullstack" | "unknown";

// ─── Builder node types (canvas) ─────────────────────────────────────────────

export type NodeKind = "trigger" | "filter" | "task" | "prompt" | "condition";

export interface CanvasNodeData {
  [key: string]: unknown; // Required by @xyflow/react Node<T> constraint
  kind: NodeKind;
  label: string;
  /** Lifecycle hook on the trigger node */
  on?: HookEvent;
  /** File filter on the trigger node */
  when?: string;
  cmd?: string;
  prompt?: string;
  condition?: ConditionDef;
  conditionId?: string;
}
