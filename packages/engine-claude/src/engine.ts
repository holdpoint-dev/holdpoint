import type { HoldpointConfig } from "@holdpoint/types";
import { adapter } from "./live-adapter.js";

export const HOLDPOINT_CLAUDE_HOOK_MARKER = "HOLDPOINT_MANAGED=claude";

type ClaudeHookEvent =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "PostToolUseFailure"
  | "PostToolBatch"
  | "PermissionRequest"
  | "PermissionDenied"
  | "Notification"
  | "TaskCreated"
  | "TaskCompleted"
  | "Stop"
  | "SubagentStart"
  | "SubagentStop"
  | "PreCompact"
  | "SessionEnd";

export interface ClaudeSettings {
  hooks: Partial<Record<ClaudeHookEvent, HookEntry[]>> & {
    Stop: HookEntry[];
  };
}

interface HookEntry {
  matcher?: string;
  hooks: HookCommand[];
}

interface HookCommand {
  type: "command";
  command: string;
  timeout?: number;
  statusMessage?: string;
  async?: boolean;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function managedCommand(hook: string, command: string): string {
  return `${command} # ${HOLDPOINT_CLAUDE_HOOK_MARKER} HOLDPOINT_HOOK=${hook}`;
}

function buildLiveHook(liveCommand: string): HookCommand {
  return {
    type: "command",
    command: managedCommand("live", `${liveCommand} || true`),
    timeout: 5,
    statusMessage: "Streaming Holdpoint event…",
    async: true,
  };
}

/**
 * Hook-aware context script. Reads the immutable config and emits agent context
 * for the current hook event:
 * - SessionStart  → session_start: top-level session_context_files + any check
 *   with `on: session_start` (inject text/files/datetime or a prompt reminder).
 * - UserPromptSubmit → message_submit: top-level inject_datetime + any check with
 *   `on: message_submit`.
 *
 * The same script serves both hooks; it self-determines the hook from stdin, so
 * the generated settings.json never enumerates check contents.
 */
export function buildContextScript(): string {
  return `
(async () => {
const { execSync } = await import("node:child_process");
const { existsSync, readFileSync } = await import("node:fs");
const { isAbsolute, join, relative, resolve } = await import("node:path");

function repoRoot() {
  try {
    return execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return process.cwd();
  }
}

let input = {};
try {
  const raw = readFileSync(0, "utf8").trim();
  if (raw) input = JSON.parse(raw);
} catch {}

const evt = typeof input.hook_event_name === "string" ? input.hook_event_name : "SessionStart";
const hook = evt === "UserPromptSubmit" ? "message_submit" : evt === "SessionStart" ? "session_start" : null;
if (!hook) process.exit(0);

const root = repoRoot();
const configPath = join(root, ".github/holdpoint/generated/checks.immutable.json");
if (!existsSync(configPath)) process.exit(0);

let cfg = {};
try { cfg = JSON.parse(readFileSync(configPath, "utf8")); } catch { process.exit(0); }

const parts = [];
let hasDatetime = false;
function addDatetime() {
  if (hasDatetime) return;
  hasDatetime = true;
  parts.push("Current date and time: " + new Date().toISOString() + " (UTC)\\nProvided by Holdpoint — use this to avoid knowledge-cutoff confusion.");
}
function addFile(file) {
  if (typeof file !== "string" || !file.trim()) return;
  const abs = resolve(root, file);
  const rel = relative(root, abs);
  if (rel.startsWith("..") || isAbsolute(rel) || !existsSync(abs)) return;
  try { parts.push("<!-- " + file + " -->\\n" + readFileSync(abs, "utf8")); } catch {}
}

if (hook === "session_start") {
  const files = Array.isArray(cfg.session_context_files) ? cfg.session_context_files : [];
  for (const f of files) addFile(f);
}

const checks = Array.isArray(cfg.checks) ? cfg.checks : [];
for (const c of checks) {
  const on = typeof c.on === "string" ? c.on : "before_done";
  if (on !== hook) continue;
  if (c.inject && typeof c.inject === "object") {
    if (c.inject.datetime === true) addDatetime();
    if (typeof c.inject.text === "string" && c.inject.text.trim()) parts.push(c.inject.text);
    if (Array.isArray(c.inject.files)) for (const f of c.inject.files) addFile(f);
  } else if (typeof c.prompt === "string" && c.prompt.trim()) {
    parts.push("Holdpoint reminder [" + (c.label || c.id || "check") + "]: " + c.prompt);
  }
}

if (hook === "message_submit" && cfg.inject_datetime !== false) addDatetime();

if (parts.length === 0) process.exit(0);
const max = 9000;
let additionalContext = parts.join("\\n\\n");
if (additionalContext.length > max) {
  additionalContext = additionalContext.slice(0, max) + "\\n\\n[Holdpoint context truncated.]";
}
process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: evt, additionalContext },
  suppressOutput: true,
}));
})().catch(() => {});
`;
}

function buildContextHook(): HookCommand {
  return {
    type: "command",
    command: managedCommand("context", `node -e ${shellQuote(buildContextScript())}`),
    timeout: 10,
    statusMessage: "Loading Holdpoint context…",
  };
}

/**
 * Build a check-gate hook. When `gate` is true it carries the Stop-loop guard
 * (so a re-entrant Stop doesn't loop). When false (e.g. before_tool) it simply
 * runs the command and exits 2 on failure to block the action.
 */
function buildCheckHook(command: string, gate: boolean): HookCommand {
  const guard = gate
    ? `
if (input.hook_event_name === "Stop" && input.stop_hook_active === true) {
  process.exit(0);
}
`
    : "";
  const script = `
const { execSync } = require("node:child_process");
const { readFileSync } = require("node:fs");

let input = {};
try {
  const raw = readFileSync(0, "utf8").trim();
  if (raw) input = JSON.parse(raw);
} catch {}
${guard}
try {
  execSync(${JSON.stringify(command)}, {
    encoding: "utf8",
    shell: true,
    stdio: "pipe",
  });
  process.exit(0);
} catch (err) {
  const output = [err && err.stdout, err && err.stderr]
    .filter(Boolean)
    .join("\\n")
    .trim();
  const max = 8000;
  const trimmed =
    output.length > max
      ? output.slice(output.length - max) + "\\n\\n[Holdpoint output truncated to last " + max + " chars.]"
      : output;
  if (trimmed) process.stderr.write(trimmed + "\\n\\n");
  process.stderr.write("Holdpoint checks failed. Fix the issues above, then try to finish again.\\n");
  process.exit(2);
}
`;

  return {
    type: "command",
    command: managedCommand("check", `node -e ${shellQuote(script)}`),
    timeout: 600,
    statusMessage: "Running Holdpoint checks…",
  };
}

/**
 * Generate .claude/settings.json content from a HoldpointConfig.
 *
 * Uses Claude Code's broad hook surface:
 * - SessionStart injects configured session_context_files as Claude context.
 * - UserPromptSubmit injects the current datetime (unless inject_datetime: false) and
 *   emits best-effort Holdpoint Live events.
 * - Tool, permission, notification, subagent, compaction, and session-end hooks emit
 *   best-effort Holdpoint Live events.
 * - TaskCompleted and Stop run Holdpoint checks and exit 2 on failure, which is
 *   Claude Code's blocking continuation signal for those events.
 *
 * The command defaults to `node_modules/.bin/holdpoint check --staged`. Set
 * `engines.claude.stop_command` in checks.yaml to override the check gate, and
 * `engines.claude.live_command` to override the best-effort Live emitter.
 */
export function buildEngine(config: HoldpointConfig): ClaudeSettings {
  const stopCommand =
    config.engines?.claude?.stop_command ?? "node_modules/.bin/holdpoint check --staged";
  const liveCommand = config.engines?.claude?.live_command ?? adapter.generateBridgeCommand();
  const checkHook = buildCheckHook(stopCommand, true);
  const liveHook = buildLiveHook(liveCommand);
  const contextHook = buildContextHook();

  const hookOf = (c: HoldpointConfig["checks"][number]) => c.on ?? "before_done";
  // Wiring keys off config-level seeding flags and which lifecycle hooks the
  // checks target — never off a check's command/prompt text — so editing a
  // check's contents doesn't churn settings.json.
  const seedsSession =
    (config.session_context_files?.length ?? 0) > 0 ||
    config.checks.some((c) => hookOf(c) === "session_start");
  const seedsMessage =
    config.inject_datetime !== false || config.checks.some((c) => hookOf(c) === "message_submit");
  const gatesBeforeTool = config.checks.some(
    (c) => c.cmd !== undefined && hookOf(c) === "before_tool",
  );
  const beforeToolHook = buildCheckHook(`${stopCommand} --hook before_tool`, false);

  return {
    hooks: {
      SessionStart: [
        {
          matcher: "startup|resume|clear|compact",
          hooks: [liveHook, ...(seedsSession ? [contextHook] : [])],
        },
      ],
      UserPromptSubmit: [{ hooks: [liveHook, ...(seedsMessage ? [contextHook] : [])] }],
      PreToolUse: [{ hooks: [liveHook, ...(gatesBeforeTool ? [beforeToolHook] : [])] }],
      PostToolUse: [{ hooks: [liveHook] }],
      PostToolUseFailure: [{ hooks: [liveHook] }],
      PostToolBatch: [{ hooks: [liveHook] }],
      PermissionRequest: [{ hooks: [liveHook] }],
      PermissionDenied: [{ hooks: [liveHook] }],
      Notification: [{ hooks: [liveHook] }],
      TaskCreated: [{ hooks: [liveHook] }],
      TaskCompleted: [{ hooks: [liveHook, checkHook] }],
      SubagentStart: [{ hooks: [liveHook] }],
      SubagentStop: [{ hooks: [liveHook] }],
      PreCompact: [{ hooks: [liveHook] }],
      SessionEnd: [{ hooks: [liveHook] }],
      Stop: [{ hooks: [liveHook, checkHook] }],
    },
  };
}

/**
 * Serialize the Claude settings to a JSON string.
 */
export function buildEngineJson(config: HoldpointConfig): string {
  return JSON.stringify(buildEngine(config), null, 2) + "\n";
}
