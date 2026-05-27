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

const root = repoRoot();
const configPath = join(root, ".github/holdpoint/generated/checks.immutable.json");
if (!existsSync(configPath)) process.exit(0);

try {
  const cfg = JSON.parse(readFileSync(configPath, "utf8"));
  const files = Array.isArray(cfg.session_context_files) ? cfg.session_context_files : [];
  const parts = [];
  for (const file of files) {
    if (typeof file !== "string" || !file.trim()) continue;
    const abs = resolve(root, file);
    const rel = relative(root, abs);
    if (rel.startsWith("..") || isAbsolute(rel) || !existsSync(abs)) continue;
    try {
      parts.push("<!-- " + file + " -->\\n" + readFileSync(abs, "utf8"));
    } catch {}
  }
  if (parts.length === 0) process.exit(0);
  const max = 9000;
  let additionalContext = parts.join("\\n\\n");
  if (additionalContext.length > max) {
    additionalContext =
      additionalContext.slice(0, max) +
      "\\n\\n[Holdpoint context truncated; see session_context_files in checks.yaml for full files.]";
  }
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: typeof input.hook_event_name === "string" ? input.hook_event_name : "SessionStart",
      additionalContext,
    },
    suppressOutput: true,
  }));
} catch {}
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

function buildCheckHook(stopCommand: string): HookCommand {
  const script = `
const { execSync } = require("node:child_process");
const { readFileSync } = require("node:fs");

let input = {};
try {
  const raw = readFileSync(0, "utf8").trim();
  if (raw) input = JSON.parse(raw);
} catch {}

if (input.hook_event_name === "Stop" && input.stop_hook_active === true) {
  process.exit(0);
}

try {
  execSync(${JSON.stringify(stopCommand)}, {
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
 * - UserPromptSubmit, tool, permission, notification, subagent, compaction, and
 *   session-end hooks emit best-effort Holdpoint Live events.
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
  const checkHook = buildCheckHook(stopCommand);
  const liveHook = buildLiveHook(liveCommand);
  const contextHooks = config.session_context_files?.length ? [buildContextHook()] : [];

  return {
    hooks: {
      SessionStart: [
        {
          matcher: "startup|resume|clear|compact",
          hooks: [liveHook, ...contextHooks],
        },
      ],
      UserPromptSubmit: [{ hooks: [liveHook] }],
      PreToolUse: [{ hooks: [liveHook] }],
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
