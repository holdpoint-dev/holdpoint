import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import chalk from "chalk";
import ora from "ora";
import { parseHoldpointYaml } from "@holdpoint/yaml-core";
import { buildConfigJson, buildEngine } from "@holdpoint/engine-copilot";
import { buildEngineJson as buildClaudeEngineJson } from "@holdpoint/engine-claude";
import { buildEngine as buildCursorEngine } from "@holdpoint/engine-cursor";
import {
  buildConfigToml as buildCodexConfigToml,
  buildHooksJson as buildCodexHooksJson,
  buildCheckScript as buildCodexCheckScript,
  spliceAgentsMd,
} from "@holdpoint/engine-codex";
import { detectInstalledAgents } from "../detect.js";
import type { AgentType } from "@holdpoint/types";
import { ensureBundledFile } from "../templates.js";

const MINIMAL_PREREQUISITES = `# Holdpoint prerequisites

Holdpoint installed repo-local engine integrations for one or more AI coding agents. Before relying on them locally, review these setup notes:

- **GitHub Copilot CLI** — Holdpoint's \`.github/extensions/holdpoint/extension.mjs\` uses the Copilot CLI **EXTENSIONS** feature. Today that feature is gated behind experimental mode. In Copilot CLI, run \`/experimental on\` so **EXTENSIONS** appears in the enabled feature set before using Holdpoint locally.
- **OpenAI Codex** — project-level hooks require trust approval. Run \`codex trust\` in the Codex TUI or review the hook with \`/hooks\`.
- **General** — Holdpoint expects Node.js 18+ and a git repository so \`holdpoint init\`, \`holdpoint update\`, and \`holdpoint check\` can run normally.

Docs: https://holdpoint.dev/docs
`;

/**
 * Regenerate all Holdpoint engine files from the current `checks.yaml`.
 *
 * Detects which agents were previously installed via `detectInstalledAgents()` and
 * regenerates only their files.  Falls back to all four agents if no engine files
 * are found (e.g. first run after a manual `checks.yaml` edit).
 */
export async function updateCommand(): Promise<void> {
  if (!existsSync("checks.yaml")) {
    console.error(chalk.red("No checks.yaml found. Run `holdpoint init` first."));
    process.exit(1);
  }

  const spinner = ora("Updating Holdpoint engine files…").start();
  const config = parseHoldpointYaml(readFileSync("checks.yaml", "utf8"));

  // Regenerate for every agent that was previously installed.
  // Fall back to all four if no engine files exist yet (e.g. first run after manual checks.yaml edit).
  const detected = detectInstalledAgents();
  const agents: AgentType[] =
    detected.length > 0 ? detected : ["copilot", "claude", "cursor", "codex"];

  // Always write checks.immutable.json — read by holdpoint-check.mjs at runtime
  const generatedDir = ".github/holdpoint/generated";
  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(`${generatedDir}/checks.immutable.json`, buildConfigJson(config), "utf8");

  if (agents.includes("copilot")) {
    const extDir = ".github/extensions/holdpoint";
    mkdirSync(extDir, { recursive: true });
    writeFileSync(`${extDir}/extension.mjs`, buildEngine(config), "utf8");
  }

  if (agents.includes("claude")) {
    mkdirSync(".claude", { recursive: true });
    const settingsPath = ".claude/settings.json";
    let existing: Record<string, unknown> = {};
    if (existsSync(settingsPath)) {
      try {
        existing = JSON.parse(readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
      } catch {
        /* */
      }
    }
    const hooks = JSON.parse(buildClaudeEngineJson(config)) as Record<string, unknown>;
    writeFileSync(
      settingsPath,
      JSON.stringify({ ...existing, hooks: hooks.hooks }, null, 2) + "\n",
    );
  }

  if (agents.includes("cursor")) {
    const cursorRules = buildCursorEngine(config);
    const cursorPath = ".cursorrules";
    if (existsSync(cursorPath)) {
      const content = readFileSync(cursorPath, "utf8");
      const start = content.indexOf("# ─── Holdpoint Rules");
      const end = content.indexOf("# ─── End Holdpoint Rules ───");
      if (start !== -1 && end !== -1) {
        // Slice past the end-marker line (find its newline to avoid hardcoded offsets)
        const afterEnd = content.indexOf("\n", end);
        const updated =
          content.slice(0, start) +
          cursorRules +
          content.slice(afterEnd === -1 ? end : afterEnd + 1);
        writeFileSync(cursorPath, updated);
      } else {
        writeFileSync(cursorPath, content + "\n" + cursorRules);
      }
    }
  }

  if (agents.includes("codex")) {
    mkdirSync(".codex", { recursive: true });
    // hooks.json is fully managed by Holdpoint; users who need additional Codex hooks
    // should add them in .codex/config.toml (Codex merges both sources).
    writeFileSync(".codex/hooks.json", buildCodexHooksJson(config), "utf8");
    writeFileSync(".codex/holdpoint-check.mjs", buildCodexCheckScript(config), "utf8");
    // Ensure hooks are explicitly enabled at the repo level.
    const configTomlPath = ".codex/config.toml";
    if (!existsSync(configTomlPath)) {
      writeFileSync(configTomlPath, buildCodexConfigToml(), "utf8");
    } else {
      const existing = readFileSync(configTomlPath, "utf8");
      if (!existing.includes("[features]")) {
        writeFileSync(configTomlPath, existing.trimEnd() + "\n\n" + buildCodexConfigToml(), "utf8");
      }
      // [features] already present — trust the user's settings
    }
    const agentsMdPath = "AGENTS.md";
    const existing = existsSync(agentsMdPath) ? readFileSync(agentsMdPath, "utf8") : "";
    writeFileSync(agentsMdPath, spliceAgentsMd(existing, config), "utf8");
  }

  const wrotePrerequisites = ensureBundledFile(
    "HOLDPOINT_PREREQUISITES.md",
    "HOLDPOINT_PREREQUISITES.md",
    MINIMAL_PREREQUISITES,
  );

  spinner.succeed(chalk.green("Engine files updated from current checks.yaml"));
  if (wrotePrerequisites) {
    console.log(
      chalk.cyan(
        "Created HOLDPOINT_PREREQUISITES.md with Copilot experimental-mode and other agent setup notes.",
      ),
    );
  }
}
