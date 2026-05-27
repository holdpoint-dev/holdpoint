import { execSync } from "node:child_process";
import chalk from "chalk";
import type { AgentType } from "@holdpoint/types";

/**
 * Result of a single preflight check for one agent.
 *
 * - `ok`: the agent's toolchain is detected and ready to use.
 * - `action_required`: we can be specific about something the user must do
 *   (install a tool, enable a feature, approve a hook) — `command` is set.
 * - `advisory`: a known limitation that is not the user's fault and cannot
 *   be auto-fixed.
 * - `unknown`: detection failed but we can't be sure what the user needs.
 */
export type PreflightStatus = "ok" | "action_required" | "advisory" | "unknown";

export interface PreflightResult {
  agent: AgentType;
  status: PreflightStatus;
  /** One-line human-readable summary, no trailing newline. */
  message: string;
  /** When `action_required`, the exact command the user should run next. */
  command?: string;
  /** When set, points at HOLDPOINT_PREREQUISITES.md or external docs. */
  docs?: string;
}

/**
 * Run silently — used for tool detection where we expect failure to be common
 * and don't want stderr bleeding into the init spinner output.
 */
function silentExec(cmd: string): { ok: boolean; stdout: string } {
  try {
    const stdout = execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString();
    return { ok: true, stdout };
  } catch {
    return { ok: false, stdout: "" };
  }
}

/**
 * Copilot CLI preflight.
 *
 * We can detect `gh` and the `gh-copilot` extension reliably, but the
 * `/experimental on` requirement is runtime state inside the Copilot CLI
 * session itself — there's no clean filesystem signal. So we always remind
 * users to enable it, even when everything else looks healthy.
 */
function checkCopilot(): PreflightResult {
  const gh = silentExec("gh --version");
  if (!gh.ok) {
    return {
      agent: "copilot",
      status: "action_required",
      message: "GitHub CLI not found on PATH",
      command: "brew install gh    # or: https://cli.github.com/",
    };
  }

  // `gh copilot --version` exits non-zero if the extension isn't installed.
  const copilot = silentExec("gh copilot --version");
  if (!copilot.ok) {
    return {
      agent: "copilot",
      status: "action_required",
      message: "Copilot CLI extension not installed",
      command: "gh extension install github/gh-copilot",
    };
  }

  return {
    agent: "copilot",
    status: "action_required",
    message: "Copilot CLI detected — experimental mode required for EXTENSIONS",
    command: "Inside Copilot CLI, run: /experimental on",
  };
}

/**
 * Claude Code preflight. Settings live at `.claude/settings.json`, which we
 * write ourselves during init, so the only failure mode is the binary
 * missing from PATH (in which case the user still wants the settings file
 * written — they may be invoking Claude Code from a different machine).
 */
function checkClaude(): PreflightResult {
  const claude = silentExec("claude --version");
  if (!claude.ok) {
    return {
      agent: "claude",
      status: "unknown",
      message: "Claude Code binary not on PATH (hooks still written for when it is)",
    };
  }
  return {
    agent: "claude",
    status: "ok",
    message: "Claude Code detected — hooks installed at .claude/settings.json",
  };
}

/**
 * Cursor preflight. Project `.cursor/hooks.json` hooks run only in trusted
 * workspaces, which is runtime state inside Cursor and not reliably readable
 * from disk, so init prints the trust/debugging reminder every time.
 */
function checkCursor(): PreflightResult {
  return {
    agent: "cursor",
    status: "action_required",
    message: "Cursor hooks installed — workspace trust is required before project hooks run",
    command: "In Cursor: trust this workspace and check Settings → Hooks if hooks do not fire",
    docs: "https://holdpoint.dev/docs#cursor",
  };
}

/**
 * Codex preflight. Project-level hooks require trust approval inside the
 * Codex TUI, which is runtime state we can't read from disk reliably across
 * Codex versions — so this mirrors the Copilot pattern: detect the binary,
 * always remind the user about `codex trust`.
 */
function checkCodex(): PreflightResult {
  const codex = silentExec("codex --version");
  if (!codex.ok) {
    return {
      agent: "codex",
      status: "action_required",
      message: "Codex CLI not found on PATH",
      command: "Install Codex: https://github.com/openai/codex",
    };
  }
  return {
    agent: "codex",
    status: "action_required",
    message: "Codex detected — project-level hooks require trust approval",
    command: "In the Codex TUI: codex trust    (or /hooks to review)",
  };
}

// `AgentType` includes "unknown" for the stack-detection fallback path, but
// only the four real agents have a preflight to run. `Partial` keeps this
// honest instead of forcing a no-op stub.
const CHECKS: Partial<Record<AgentType, () => PreflightResult>> = {
  copilot: checkCopilot,
  claude: checkClaude,
  cursor: checkCursor,
  codex: checkCodex,
};

/**
 * Run preflight for the given agents and return results in input order.
 * Agents without a registered check are silently skipped — the caller's
 * agent list is the source of truth.
 *
 * Intentionally pure apart from `execSync` so callers can decide whether
 * to print, summarise, or fail-fast on the results.
 */
export function runPreflight(agents: readonly AgentType[]): PreflightResult[] {
  return agents.flatMap((agent) => {
    const check = CHECKS[agent];
    return check ? [check()] : [];
  });
}

/**
 * Pretty-print preflight results to stdout in the style used by `holdpoint init`.
 * Always groups by status so action items don't get lost between OKs.
 */
export function printPreflight(results: readonly PreflightResult[]): void {
  if (results.length === 0) return;

  const ok = results.filter((r) => r.status === "ok");
  const unknown = results.filter((r) => r.status === "unknown");
  const advisory = results.filter((r) => r.status === "advisory");
  const action = results.filter((r) => r.status === "action_required");

  console.log("");
  console.log(chalk.bold("Agent preflight:"));

  for (const r of ok) {
    console.log(`  ${chalk.green("✓")} ${r.agent.padEnd(7)} ${chalk.dim(r.message)}`);
  }
  for (const r of unknown) {
    console.log(`  ${chalk.dim("?")} ${r.agent.padEnd(7)} ${chalk.dim(r.message)}`);
  }
  for (const r of advisory) {
    console.log(
      `  ${chalk.bgYellow.black(" ! ")} ${chalk.bold(r.agent.padEnd(7))} ${chalk.yellow(r.message)}`,
    );
    if (r.docs) console.log(`      ${chalk.dim("→ " + r.docs)}`);
  }
  for (const r of action) {
    console.log(`  ${chalk.yellow("→")} ${chalk.bold(r.agent.padEnd(7))} ${r.message}`);
    if (r.command) console.log(`      ${chalk.cyan(r.command)}`);
  }
}
