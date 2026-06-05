import type { HoldpointConfig } from "@holdpoint/types";
import { adapter } from "./live-adapter.js";

export const HOLDPOINT_CLAUDE_HOOK_MARKER = "HOLDPOINT_MANAGED=claude";

const SECURITY_SCAN_PACKAGES = [
  "@anthropic-ai/mcp-server-brave-search",
  "@anthropic-ai/mcp-server-fetch",
  "@modelcontextprotocol/server-filesystem",
  "@modelcontextprotocol/server-github",
  "@modelcontextprotocol/server-gitlab",
  "@modelcontextprotocol/server-google-maps",
  "@modelcontextprotocol/server-postgres",
  "@modelcontextprotocol/server-slack",
  "@modelcontextprotocol/server-memory",
  "@modelcontextprotocol/server-puppeteer",
  "@modelcontextprotocol/server-sequential-thinking",
  "@modelcontextprotocol/server-everything",
];

function buildSecurityScanScript(): string {
  return `
// Keep behavior in sync with packages/cli/src/lib/scan.ts.
const SECURITY_SCAN_VERIFIED = new Set(${JSON.stringify(SECURITY_SCAN_PACKAGES)});
const SECURITY_SCAN_SEVERITIES = new Set(["high", "critical"]);
function securityScanReadJson(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return undefined; }
}
function securityScanStringArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}
function securityScanPackageName(value) {
  const normalized = String(value || "").replace(/\\\\/g, "/");
  const idx = normalized.lastIndexOf("node_modules/");
  if (idx >= 0) {
    const parts = normalized.slice(idx + "node_modules/".length).split("/").filter(Boolean);
    if (parts[0] && parts[0].startsWith("@") && parts[1]) return parts[0] + "/" + parts[1];
    return parts[0];
  }
  if (normalized.startsWith("@")) {
    const parts = normalized.split("/");
    return parts[0] && parts[1] ? parts[0] + "/" + parts[1] : undefined;
  }
  if (!normalized.includes("/") && /^[a-z0-9@._-]+$/i.test(normalized)) return normalized;
  return undefined;
}
function securityScanMcpEntries(config) {
  if (!config || typeof config !== "object") return [];
  const servers = config.mcpServers || config.servers;
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) return [];
  return Object.entries(servers).map(([key, raw]) => {
    const server = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    return {
      key,
      name: typeof server.name === "string" ? server.name : undefined,
      command: typeof server.command === "string" ? server.command : undefined,
      args: securityScanStringArray(server.args),
    };
  });
}
function securityScanMcp(root) {
  const results = [];
  for (const file of [join(root, ".mcp.json"), join(root, ".claude/mcp.json")]) {
    if (!existsSync(file)) continue;
    for (const entry of securityScanMcpEntries(securityScanReadJson(file))) {
      const values = [entry.name, entry.command, ...entry.args]
        .filter((value) => typeof value === "string" && value.trim())
        .map((value) => value.trim());
      const packages = values.map(securityScanPackageName).filter(Boolean);
      const verified = [...values, ...packages].some((candidate) => SECURITY_SCAN_VERIFIED.has(candidate));
      results.push({ server: entry.name || entry.key, verified });
    }
  }
  return results;
}
function securityScanPackageManager(root) {
  if (existsSync(join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(root, "yarn.lock"))) return "yarn";
  if (existsSync(join(root, "package-lock.json")) || existsSync(join(root, "npm-shrinkwrap.json"))) return "npm";
  return null;
}
function securityScanFirstTitle(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const title = securityScanFirstTitle(entry);
      if (title) return title;
    }
  }
  if (value && typeof value === "object" && typeof value.title === "string") return value.title;
  return undefined;
}
function securityScanAddFinding(findings, seen, name, severity, title) {
  if (!name || typeof severity !== "string") return;
  const normalizedSeverity = severity.toLowerCase();
  if (!SECURITY_SCAN_SEVERITIES.has(normalizedSeverity)) return;
  const normalizedTitle = securityScanFirstTitle(title) || "Security advisory";
  const key = name + "\\0" + normalizedSeverity + "\\0" + normalizedTitle;
  if (seen.has(key)) return;
  seen.add(key);
  findings.push({ name, severity: normalizedSeverity, title: normalizedTitle });
}
function securityScanParseAudit(raw) {
  const findings = [];
  const seen = new Set();
  const parseOne = (data) => {
    if (!data || typeof data !== "object") return;
    if (data.vulnerabilities && typeof data.vulnerabilities === "object") {
      for (const [name, vuln] of Object.entries(data.vulnerabilities)) {
        if (!vuln || typeof vuln !== "object") continue;
        securityScanAddFinding(findings, seen, name, vuln.severity, vuln.via || vuln.title);
      }
    }
    if (data.advisories && typeof data.advisories === "object") {
      for (const advisory of Object.values(data.advisories)) {
        if (!advisory || typeof advisory !== "object") continue;
        securityScanAddFinding(findings, seen, advisory.module_name, advisory.severity, advisory.title);
      }
    }
    if (data.type === "auditAdvisory" && data.data && data.data.advisory) {
      const advisory = data.data.advisory;
      securityScanAddFinding(findings, seen, advisory.module_name, advisory.severity, advisory.title);
    }
  };
  try { parseOne(JSON.parse(raw)); }
  catch {
    for (const line of String(raw || "").split(/\\r?\\n/)) {
      if (!line.trim()) continue;
      try { parseOne(JSON.parse(line)); } catch {}
    }
  }
  return findings.slice(0, 5);
}
function securityScanAudit(root) {
  const pm = securityScanPackageManager(root);
  if (!pm) return { pm: null, findings: [] };
  try {
    const stdout = execSync(pm + " audit --json", {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024 * 10,
      timeout: 8000,
    });
    return { pm, findings: securityScanParseAudit(stdout) };
  } catch (err) {
    const stdout = err && typeof err.stdout === "string" ? err.stdout : "";
    return { pm, findings: stdout.trim() ? securityScanParseAudit(stdout) : [] };
  }
}
function formatSecurityScan(root) {
  const unverified = securityScanMcp(root).filter((entry) => !entry.verified);
  const audit = securityScanAudit(root);
  if (unverified.length === 0 && audit.findings.length === 0) return null;
  const lines = ["⚠ Holdpoint Security Scan", ""];
  if (unverified.length > 0) {
    lines.push("MCP servers — unverified:");
    for (const entry of unverified) lines.push("  • " + entry.server + " (source unknown — review before trusting)");
    lines.push("");
  }
  if (audit.findings.length > 0) {
    lines.push((audit.pm || "npm") + " audit — high/critical:");
    for (const dep of audit.findings) lines.push("  • " + dep.name + " · " + dep.title + " (" + dep.severity + ")");
    lines.push("");
  }
  lines.push("Review these before allowing the agent to install dependencies or invoke tools.");
  return lines.join("\\n");
}
`;
}

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
${buildSecurityScanScript()}
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
  const scan = formatSecurityScan(root);
  if (scan) parts.push(scan);
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
          hooks: [liveHook, contextHook],
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
