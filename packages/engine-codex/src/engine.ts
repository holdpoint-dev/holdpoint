import type { HoldpointConfig } from "@holdpoint/types";

interface CodexHook {
  type: "command";
  command: string;
  timeout: number;
  statusMessage: string;
}

interface CodexHookGroup {
  matcher?: string;
  hooks: CodexHook[];
}

interface CodexHooksJson {
  hooks: Partial<
    Record<
      | "SessionStart"
      | "UserPromptSubmit"
      | "PreToolUse"
      | "PermissionRequest"
      | "PostToolUse"
      | "PreCompact"
      | "PostCompact"
      | "SubagentStart"
      | "SubagentStop"
      | "Stop",
      CodexHookGroup[]
    >
  >;
}

const HOOK_COMMAND =
  'node "$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.codex/holdpoint-check.mjs"';

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

function hook(timeout: number, statusMessage: string, matcher?: string): CodexHookGroup[] {
  return [
    {
      ...(matcher ? { matcher } : {}),
      hooks: [
        {
          type: "command",
          // Use git root resolution so the hook finds the script regardless of
          // which subdirectory Codex was launched from.
          command: HOOK_COMMAND,
          timeout,
          statusMessage,
        },
      ],
    },
  ];
}

/**
 * Generate `.codex/hooks.json` content.
 *
 * Registers every command-hook event Codex exposes today. The same dispatcher
 * script handles all events: most are fast Live telemetry only, SessionStart /
 * SubagentStart can inject configured context, and Stop / SubagentStop run the
 * completion gate.
 *
 * Users who need additional Codex hooks should create a separate JSON file in
 * .codex/ (e.g. .codex/my-hooks.json) or use a separate config.toml section.
 * Do NOT mix hooks.json and inline [hooks] in config.toml in the same layer —
 * Codex warns at startup when both exist.
 */
export function buildHooksJson(config: HoldpointConfig): string {
  const hooks: CodexHooksJson["hooks"] = {
    UserPromptSubmit: hook(30, "Recording Holdpoint prompt telemetry…"),
    PreToolUse: hook(30, "Recording Holdpoint tool telemetry…"),
    PermissionRequest: hook(30, "Recording Holdpoint permission telemetry…"),
    PostToolUse: hook(30, "Recording Holdpoint tool result telemetry…"),
    PreCompact: hook(30, "Recording Holdpoint compaction telemetry…"),
    PostCompact: hook(30, "Recording Holdpoint compaction telemetry…"),
    SubagentStart: hook(30, "Loading Holdpoint subagent context…"),
    SubagentStop: hook(600, "Running Holdpoint subagent checks…"),
    // Codex default is 600 s; shorter risks premature hook failure on slow checks.
    Stop: hook(600, "Running Holdpoint checks…"),
    SessionStart: hook(30, "Loading Holdpoint context…"),
  };

  void config;
  return JSON.stringify({ hooks }, null, 2) + "\n";
}

/**
 * Generate `.codex/config.toml` content (or the fragment to append to an existing one).
 *
 * Explicitly enables hooks at the repo level. Hooks are on by default in Codex, but
 * writing this makes the intent clear and prevents accidental user-level `hooks = false`
 * from silently disabling holdpoint enforcement.
 *
 * Usage: write the full return value if the file doesn't exist. If it does exist and
 * already contains a [features] section, leave it — trust the user's settings.
 * If it exists without [features], append the returned fragment.
 */
export function buildConfigToml(): string {
  return `# Generated by Holdpoint. Ensure hooks are active for this project.
[features]
hooks = true
`;
}

/**
 * Generate `.codex/holdpoint-check.mjs` — invoked by both the SessionStart and
 * Stop hooks. Dispatches on `hook_event_name` from Codex's JSON stdin.
 *
 * SessionStart → reads checks.immutable.json, injects session_context_files as
 *   JSON additionalContext. Uses JSON (not YAML) because the script is plain .mjs
 *   with no bundler — JSON.parse is native, a YAML parser is not.
 *
 * Stop → runs the holdpoint CLI check command. Key correctness points per the
 *   Codex hook spec:
 *   - stdio: "pipe" (not "inherit") so CLI output never lands on hook stdout as
 *     plain text — Codex Stop requires JSON on stdout or no output; plain text
 *     on exit 0 is invalid and causes parse errors.
 *   - exit 0, no stdout on success → Codex stops normally.
 *   - exit 2, failure text on stderr → Codex creates a continuation prompt from
 *     the stderr text so the agent iterates to fix the issues.
 */
export function buildCheckScript(config?: HoldpointConfig): string {
  const stopCommand =
    config?.engines?.codex?.stop_command ?? "node_modules/.bin/holdpoint check --staged";
  return `#!/usr/bin/env node
// AUTO-GENERATED by Holdpoint — do not edit. Re-generate: npx holdpoint update
import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
${buildSecurityScanScript()}
const STOP_COMMAND = ${JSON.stringify(stopCommand)};
const LIVE_COMMAND = "node_modules/.bin/holdpoint";
const LIVE_ARGS = ["event", "--engine", "codex", "--from-hook"];
const MAX_CONTEXT_CHARS = 100_000;
const MAX_CHECK_OUTPUT_CHARS = 60_000;
const CHECK_MAX_BUFFER_BYTES = 1024 * 1024 * 10;

const root = (() => {
  try {
    return execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return process.cwd();
  }
})();

// Codex sends a JSON object on stdin for every hook event.
let input = {};
try {
  const raw = readFileSync(0 /* stdin fd */, "utf8").trim();
  if (raw) input = JSON.parse(raw);
} catch { /* non-JSON or empty stdin — default to Stop behaviour */ }

function hookEventName() {
  return typeof input.hook_event_name === "string" ? input.hook_event_name : "Stop";
}

// Map a Codex hook event to a Holdpoint hook for check/inject matching.
function holdpointHook(eventName) {
  if (eventName === "SessionStart" || eventName === "SubagentStart") return "session_start";
  if (eventName === "UserPromptSubmit") return "message_submit";
  if (eventName === "PreToolUse") return "before_tool";
  return "before_done";
}

function readConfig() {
  const configPath = join(root, ".github/holdpoint/generated/checks.immutable.json");
  if (!existsSync(configPath)) return {};
  try { return JSON.parse(readFileSync(configPath, "utf8")); } catch { return {}; }
}
const cfg = readConfig();
const checks = Array.isArray(cfg.checks) ? cfg.checks : [];

function truncateText(value, maxChars) {
  const text = String(value || "");
  if (text.length <= maxChars) return { text, truncated: false, originalLength: text.length };
  return {
    text: text.slice(0, maxChars) + "\\n\\n[Holdpoint output truncated to " + maxChars + " chars.]",
    truncated: true,
    originalLength: text.length,
  };
}

function isPathInsideRoot(repoRoot, absPath) {
  const rel = relative(repoRoot, absPath);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function readFileContext(file) {
  if (typeof file !== "string" || !file.trim()) return null;
  const abs = resolve(root, file);
  if (!isPathInsideRoot(root, abs) || !existsSync(abs)) return null;
  try { return \`<!-- \${file} -->\\n\${readFileSync(abs, "utf8")}\`; } catch { return null; }
}

const DATETIME_TEXT = () =>
  "Current date and time: " + new Date().toISOString() + " (UTC)\\n" +
  "Provided by Holdpoint — use this to avoid knowledge-cutoff confusion.";

// Gather the agent context to inject at a given Holdpoint hook: configured
// session_context_files (session_start), per-check inject/prompt actions, and
// the top-level datetime (message_submit).
function gatherHookContext(hook) {
  const parts = [];
  let hasDatetime = false;
  const addDatetime = () => { if (!hasDatetime) { hasDatetime = true; parts.push(DATETIME_TEXT()); } };

  if (hook === "session_start") {
    const scan = formatSecurityScan(root);
    if (scan) parts.push(scan);
    const files = Array.isArray(cfg.session_context_files) ? cfg.session_context_files : [];
    for (const f of files) { const c = readFileContext(f); if (c) parts.push(c); }
  }
  for (const c of checks) {
    const on = typeof c.on === "string" ? c.on : "before_done";
    if (on !== hook) continue;
    if (c.inject && typeof c.inject === "object") {
      if (c.inject.datetime === true) addDatetime();
      if (typeof c.inject.text === "string" && c.inject.text.trim()) parts.push(c.inject.text);
      if (Array.isArray(c.inject.files)) for (const f of c.inject.files) { const x = readFileContext(f); if (x) parts.push(x); }
    } else if (typeof c.prompt === "string" && c.prompt.trim()) {
      parts.push("Holdpoint reminder [" + (c.label || c.id || "check") + "]: " + c.prompt);
    }
  }
  if (hook === "message_submit" && cfg.inject_datetime !== false) addDatetime();

  if (parts.length === 0) return undefined;
  const ctx = truncateText(parts.join("\\n\\n"), MAX_CONTEXT_CHARS);
  return { additionalContext: ctx.text, truncated: ctx.truncated, originalLength: ctx.originalLength, emittedLength: ctx.text.length };
}

function hasCmdAt(hook) {
  return checks.some((c) => typeof c.cmd === "string" && (typeof c.on === "string" ? c.on : "before_done") === hook);
}

function sendLiveEvent(payload) {
  try {
    const child = spawn(LIVE_COMMAND, LIVE_ARGS, {
      cwd: root,
      stdio: ["pipe", "ignore", "ignore"],
      detached: true,
    });
    child.stdin.end(JSON.stringify(payload));
    child.unref();
  } catch {
    // Live telemetry is best-effort and must never break Codex's hook flow.
  }
}

function outputAdditionalContext(eventName, context) {
  if (!context?.additionalContext) return;
  writeFileSync(1, JSON.stringify({
    hookSpecificOutput: {
      hookEventName: eventName,
      additionalContext: context.additionalContext,
    },
  }));
}

function runHoldpointChecks(command) {
  const startedAt = Date.now();
  try {
    // stdio: "pipe" — CLI output must NOT reach hook stdout as plain text.
    const output = execSync(command, {
      cwd: root,
      stdio: "pipe",
      encoding: "utf8",
      maxBuffer: CHECK_MAX_BUFFER_BYTES,
    });
    return {
      ok: true,
      durationMs: Date.now() - startedAt,
      output: String(output || "").trim(),
    };
  } catch (err) {
    const output = [err.stdout, err.stderr, err.message].filter(Boolean).join("\\n").trim();
    const truncated = truncateText(output, MAX_CHECK_OUTPUT_CHARS);
    return {
      ok: false,
      durationMs: Date.now() - startedAt,
      output: truncated.text || "Holdpoint checks failed. Fix the issues above, then re-attempt.",
      truncated: truncated.truncated,
      originalLength: truncated.originalLength,
    };
  }
}

const eventName = hookEventName();
const hook = holdpointHook(eventName);

// ── SessionStart / UserPromptSubmit: inject context for the matching hook ──────
if (eventName === "SessionStart" || eventName === "SubagentStart" || eventName === "UserPromptSubmit") {
  const context = gatherHookContext(hook);
  sendLiveEvent({
    ...input,
    holdpoint_context: context
      ? { truncated: context.truncated, originalLength: context.originalLength, emittedLength: context.emittedLength }
      : undefined,
  });
  outputAdditionalContext(eventName, context);
  process.exit(0);
}

// ── PreToolUse: run before_tool cmd checks; exit 2 + stderr denies the tool ────
if (eventName === "PreToolUse") {
  sendLiveEvent(input);
  if (hasCmdAt("before_tool")) {
    const result = runHoldpointChecks(STOP_COMMAND + " --hook before_tool");
    if (!result.ok) {
      process.stderr.write(result.output + "\\n\\nHoldpoint before_tool checks failed.\\n");
      process.exit(2);
    }
  }
  process.exit(0);
}

// ── Stop: run checks, exit 0 (pass) or exit 2 (continue with feedback) ─────────
if (eventName === "Stop" || eventName === "SubagentStop") {
  if (input.stop_hook_active === true) {
    sendLiveEvent({ ...input, holdpoint_check: { skipped: true, reason: "stop_hook_active" } });
    process.exit(0);
  }
  const result = runHoldpointChecks(STOP_COMMAND);
  sendLiveEvent({ ...input, holdpoint_check: result });
  if (result.ok) {
    process.exit(0);
  }
  // Write captured check output to stderr — Codex uses this as the continuation prompt.
  process.stderr.write(
    result.output + "\\n\\nHoldpoint checks failed. Fix the issues above, then re-attempt.\\n",
  );
  process.exit(2);
}

// Other hook events are telemetry-only. Do not emit pass-through allow decisions:
// PermissionRequest allow would auto-approve escalations, and PreToolUse allow
// has rewrite semantics in Codex. Empty stdout means "no decision".
sendLiveEvent(input);
process.exit(0);
`;
}

/**
 * Generate a standalone context-injection script for SessionStart tests.
 * Runtime hooks use the same dispatcher script so Stop/SubagentStop behavior
 * stays wired through one generated file.
 */
export function buildContextScript(): string {
  return buildCheckScript();
}
