import type { HoldpointConfig } from "@holdpoint/types";

export const HOLDPOINT_CURSOR_HOOK_MARKER = "HOLDPOINT_MANAGED=cursor";

const HOOK_COMMAND = `node .cursor/holdpoint-hook.mjs # ${HOLDPOINT_CURSOR_HOOK_MARKER}`;

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

interface CursorHook {
  command: string;
  timeout?: number;
  matcher?: string;
  loop_limit?: number;
  failClosed?: boolean;
}

interface CursorHooksJson {
  version: 1;
  hooks: Record<string, CursorHook[]>;
}

function hook(options: Omit<CursorHook, "command"> = {}): CursorHook {
  return {
    command: HOOK_COMMAND,
    ...options,
  };
}

/**
 * Generate project-level Cursor hooks.
 *
 * Cursor project hooks live at `.cursor/hooks.json`, run from the project root,
 * and can observe, inject context, or auto-continue the agent loop. Holdpoint
 * uses a single generated script so hook behavior stays in sync with
 * `checks.yaml` after every `holdpoint update`.
 */
export function buildHooksJson(config: HoldpointConfig): string {
  const hooks: CursorHooksJson["hooks"] = {
    beforeSubmitPrompt: [hook({ timeout: 30 })],
    preToolUse: [hook({ timeout: 30, matcher: "Shell|Read|Write|Grep|Task|MCP:.*" })],
    postToolUse: [hook({ timeout: 30 })],
    postToolUseFailure: [hook({ timeout: 30 })],
    beforeShellExecution: [hook({ timeout: 30 })],
    afterShellExecution: [hook({ timeout: 30 })],
    beforeMCPExecution: [hook({ timeout: 30 })],
    afterMCPExecution: [hook({ timeout: 30 })],
    beforeReadFile: [hook({ timeout: 30 })],
    afterFileEdit: [hook({ timeout: 30 })],
    subagentStart: [hook({ timeout: 30 })],
    subagentStop: [hook({ timeout: 600, loop_limit: 5 })],
    preCompact: [hook({ timeout: 30 })],
    afterAgentResponse: [hook({ timeout: 30 })],
    stop: [hook({ timeout: 600, loop_limit: 5 })],
    sessionStart: [hook({ timeout: 30 })],
  };

  void config;
  return JSON.stringify({ version: 1, hooks }, null, 2) + "\n";
}

/**
 * Generate `.cursor/holdpoint-hook.mjs`.
 *
 * The script speaks Cursor's native hook protocol:
 * - `sessionStart` returns `additional_context` when session_context_files exist.
 * - `stop` and completed `subagentStop` run Holdpoint checks and return a
 *   `followup_message` on failure so Cursor keeps iterating.
 * - all other hooks are used for Live telemetry and emit either an allow
 *   response or no output, depending on that hook's schema.
 */
export function buildCheckScript(): string {
  return `#!/usr/bin/env node
// AUTO-GENERATED by Holdpoint — do not edit. Re-generate: npx holdpoint update
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
${buildSecurityScanScript()}
const CHECK_COMMAND = "node_modules/.bin/holdpoint check --staged";
const LIVE_COMMAND = "node_modules/.bin/holdpoint event --engine cursor --from-hook";
const MAX_CONTEXT_CHARS = 100_000;
const MAX_CHECK_OUTPUT_CHARS = 60_000;
const CHECK_MAX_BUFFER_BYTES = 1024 * 1024 * 10;

function readInput() {
  try {
    const raw = readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function resolveRepoRoot(cwd = process.cwd()) {
  try {
    return execSync("git rev-parse --show-toplevel", {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch {
    return cwd;
  }
}

function eventName(input) {
  return String(input && input.hook_event_name ? input.hook_event_name : "");
}

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

function sendLiveEvent(input) {
  try {
    execSync(LIVE_COMMAND, {
      input: JSON.stringify(input),
      encoding: "utf8",
      stdio: ["pipe", "ignore", "ignore"],
    });
  } catch {
    // Live telemetry is best-effort and must never break Cursor's hook flow.
  }
}

function readConfig(repoRoot) {
  const configPath = join(repoRoot, ".github/holdpoint/generated/checks.immutable.json");
  if (!existsSync(configPath)) return {};
  try { return JSON.parse(readFileSync(configPath, "utf8")); } catch { return {}; }
}

function readFileContext(repoRoot, file) {
  if (typeof file !== "string" || !file.trim()) return null;
  const abs = resolve(repoRoot, file);
  if (!isPathInsideRoot(repoRoot, abs) || !existsSync(abs)) return null;
  try { return "<!-- " + file + " -->\\n" + readFileSync(abs, "utf8"); } catch { return null; }
}

const DATETIME_TEXT = () =>
  "Current date and time: " + new Date().toISOString() + " (UTC)\\n" +
  "Provided by Holdpoint — use this to avoid knowledge-cutoff confusion.";

// Gather agent context for a Holdpoint hook. NOTE: Cursor's beforeSubmitPrompt
// cannot inject context (it only gates submission), so the top-level datetime
// and message_submit checks are surfaced at sessionStart instead — the only
// Cursor stage that accepts additional_context per the hooks API.
function gatherHookContext(repoRoot, hook) {
  const cfg = readConfig(repoRoot);
  const checks = Array.isArray(cfg.checks) ? cfg.checks : [];
  const parts = [];
  let hasDatetime = false;
  const addDatetime = () => { if (!hasDatetime) { hasDatetime = true; parts.push(DATETIME_TEXT()); } };

  const includeHooks = hook === "session_start" ? ["session_start", "message_submit"] : [hook];

  if (hook === "session_start") {
    const scan = formatSecurityScan(repoRoot);
    if (scan) parts.push(scan);
    const files = Array.isArray(cfg.session_context_files) ? cfg.session_context_files : [];
    for (const f of files) { const c = readFileContext(repoRoot, f); if (c) parts.push(c); }
  }
  for (const c of checks) {
    const on = typeof c.on === "string" ? c.on : "before_done";
    if (!includeHooks.includes(on)) continue;
    if (c.inject && typeof c.inject === "object") {
      if (c.inject.datetime === true) addDatetime();
      if (typeof c.inject.text === "string" && c.inject.text.trim()) parts.push(c.inject.text);
      if (Array.isArray(c.inject.files)) for (const f of c.inject.files) { const x = readFileContext(repoRoot, f); if (x) parts.push(x); }
    } else if (typeof c.prompt === "string" && c.prompt.trim()) {
      parts.push("Holdpoint reminder [" + (c.label || c.id || "check") + "]: " + c.prompt);
    }
  }
  // Cursor can only inject once (sessionStart), so fold the per-message datetime in here.
  if (hook === "session_start" && cfg.inject_datetime !== false) addDatetime();

  if (parts.length === 0) return undefined;
  const context = truncateText(parts.join("\\n\\n"), MAX_CONTEXT_CHARS);
  return {
    additional_context: context.text,
    truncated: context.truncated,
    originalLength: context.originalLength,
    emittedLength: context.text.length,
  };
}

function hasCmdAt(repoRoot, hook) {
  const cfg = readConfig(repoRoot);
  const checks = Array.isArray(cfg.checks) ? cfg.checks : [];
  return checks.some((c) => typeof c.cmd === "string" && (typeof c.on === "string" ? c.on : "before_done") === hook);
}

function runHoldpointChecks(repoRoot, command = CHECK_COMMAND) {
  const startedAt = Date.now();
  try {
    const output = execSync(command, {
      cwd: repoRoot,
      stdio: "pipe",
      encoding: "utf8",
      maxBuffer: CHECK_MAX_BUFFER_BYTES,
    });
    return {
      ok: true,
      durationMs: Date.now() - startedAt,
      output: String(output || "").trim(),
    };
  } catch (error) {
    const output = [error && error.stdout, error && error.stderr, error && error.message]
      .filter(Boolean)
      .join("\\n")
      .trim();
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

function shouldRunCompletionChecks(input) {
  const name = eventName(input);
  if (name === "stop") return true;
  if (name === "subagentStop") {
    return input && input.status === "completed";
  }
  return false;
}

const input = readInput();
const cwd = typeof input.cwd === "string" ? input.cwd : process.cwd();
const repoRoot = resolveRepoRoot(cwd);
const name = eventName(input);

if (name === "sessionStart") {
  const context = gatherHookContext(repoRoot, "session_start");
  sendLiveEvent({
    ...input,
    holdpoint_context: context
      ? {
          truncated: context.truncated,
          originalLength: context.originalLength,
          emittedLength: context.emittedLength,
        }
      : undefined,
  });
  if (context?.additional_context) {
    writeFileSync(1, JSON.stringify({ additional_context: context.additional_context }) + "\\n");
  }
  process.exit(0);
}

if (shouldRunCompletionChecks(input)) {
  const result = runHoldpointChecks(repoRoot);
  sendLiveEvent({ ...input, holdpoint_check: result });
  if (result.ok) {
    process.exit(0);
  }
  process.stdout.write(
    JSON.stringify({
      followup_message:
        result.output +
        "\\n\\nHoldpoint checks failed. Fix the issues above, then run the checks again before finishing.",
    }) + "\\n",
  );
  process.exit(0);
}

sendLiveEvent(input);

if (name === "preToolUse") {
  // Gate on before_tool cmd checks; deny the tool if they fail.
  if (hasCmdAt(repoRoot, "before_tool")) {
    const result = runHoldpointChecks(repoRoot, CHECK_COMMAND + " --hook before_tool");
    if (!result.ok) {
      process.stdout.write(
        JSON.stringify({ permission: "deny", agentMessage: result.output }) + "\\n",
      );
      process.exit(0);
    }
  }
  process.stdout.write(JSON.stringify({ permission: "allow" }) + "\\n");
} else if (
  name === "beforeShellExecution" ||
  name === "beforeMCPExecution" ||
  name === "beforeReadFile" ||
  name === "subagentStart"
) {
  process.stdout.write(JSON.stringify({ permission: "allow" }) + "\\n");
} else if (name === "beforeSubmitPrompt") {
  // Cursor's beforeSubmitPrompt cannot inject context — only allow/deny the
  // submission. Per-message context is folded into sessionStart instead.
  process.stdout.write(JSON.stringify({ continue: true }) + "\\n");
}
process.exit(0);
`;
}

/**
 * Generate a standalone context-injection script for sessionStart tests.
 * Cursor uses the same generated dispatcher for context, telemetry, and gates.
 */
export function buildContextScript(): string {
  return buildCheckScript();
}

/**
 * Generate .cursorrules additions from a HoldpointConfig.
 *
 * Cursor now enforces Holdpoint through `.cursor/hooks.json`; this rules block
 * remains useful context for the agent and for Cursor cloud cases where not all
 * local hook stages are available.
 */
export function buildEngine(config: HoldpointConfig): string {
  const deterministicList = config.checks
    .filter((c) => c.cmd !== undefined)
    .map((c) => `  - [${c.when ?? "always"}] ${c.label}: \`${c.cmd ?? "(no cmd)"}\``)
    .join("\n");

  const promptList = config.checks
    .filter((c) => c.prompt !== undefined)
    .map((c) => `  - [${c.when ?? "always"}] ${c.label}: ${c.prompt ?? ""}`)
    .join("\n");

  return `# ─── Holdpoint Rules (auto-generated) ─────────────────────────────────────────
# DO NOT EDIT this block manually. Re-generate with: npx holdpoint update

## Mandatory pre-completion checks

Holdpoint also installed Cursor project hooks in \`.cursor/hooks.json\`. Before
marking ANY task as done or making a final commit, you MUST:

1. Run all Holdpoint tasks and confirm they pass:
${deterministicList || "  (no tasks configured)"}

2. Act on all matching agent prompts:
${promptList || "  (no prompt checks configured)"}

3. If any task exits non-zero, fix the underlying issue before
   proceeding. Do NOT suppress errors or skip tasks.

4. For prompt checks, explicitly state in your response that you have acted on
   each item before marking the task complete.

## Running checks
   Run: \`node_modules/.bin/holdpoint check --staged\` to execute all tasks.
   Fix all failures before proceeding.

# ─── End Holdpoint Rules ───────────────────────────────────────────────────────
`;
}
