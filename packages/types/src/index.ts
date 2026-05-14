// ─── Trigger types ──────────────────────────────────────────────────────────

export type TriggerType =
  | "always"
  | "frontend"
  | "backend"
  | "prisma"
  | "socket"
  | "visual"
  | "custom";

export interface Trigger {
  type: TriggerType;
  /** Regex pattern — only used when type is "custom" */
  pattern?: string;
}

// ─── Condition types ─────────────────────────────────────────────────────────

export type ConditionOperator =
  | "file_exists"
  | "file_contains"
  | "env_var_set"
  | "shell_returns_0";

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
  trigger: Trigger;
  /** Shell command — deterministic check */
  cmd?: string;
  /** Free-text instruction — manual check the agent must confirm */
  manual?: string;
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
  deterministic: CheckDef[];
  manual: CheckDef[];
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

export type NodeKind = "trigger" | "check-deterministic" | "check-manual" | "condition";

export interface CanvasNodeData {
  kind: NodeKind;
  label: string;
  trigger?: Trigger;
  cmd?: string;
  manual?: string;
  condition?: ConditionDef;
}
