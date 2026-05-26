import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import ora from "ora";
import { buildConfigJson, buildEngine } from "@holdpoint/engine-copilot";
import { buildEngineJson as buildClaudeEngineJson } from "@holdpoint/engine-claude";
import { buildEngine as buildCursorEngine } from "@holdpoint/engine-cursor";
import {
  buildConfigToml as buildCodexConfigToml,
  buildHooksJson as buildCodexHooksJson,
  buildCheckScript as buildCodexCheckScript,
  spliceAgentsMd,
  buildAgentsMd,
} from "@holdpoint/engine-codex";
import { parseHoldpointYaml } from "@holdpoint/yaml-core";
import type { AgentType } from "@holdpoint/types";
import { detectPackageManager, type PackageManager } from "../detect.js";
import { ensureBundledFile } from "../templates.js";
import { runPreflight, printPreflight } from "../lib/preflight.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getDefaultTemplatePath(): string {
  const candidates = [
    join(__dirname, "templates", "default.yaml"), // dist/templates/ (published package)
    join(__dirname, "../../../templates", "default.yaml"), // monorepo dev fallback
    join(process.cwd(), "templates", "default.yaml"), // cwd fallback
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return "";
}

const MINIMAL_CHECKS_YAML = `version: 1
context:
  guides: {}
conditions: []
checks:
  - id: lint
    label: "Lint codebase"
    cmd: "echo 'Add your lint command here'"

  - id: jsdoc
    label: "JSDoc on changed public functions"
    prompt: "Ensure all changed public functions and exports have JSDoc comments."
`;

const MINIMAL_MASTER_PROMPT = `# Holdpoint

Run \`holdpoint check\` before marking any task complete.
See \`checks.yaml\` for the full list of checks.
`;

const MINIMAL_PREREQUISITES = `# Holdpoint prerequisites

Holdpoint installed repo-local engine integrations for one or more AI coding agents. Before relying on them locally, review these setup notes:

- **GitHub Copilot CLI** — Holdpoint's \`.github/extensions/holdpoint/extension.mjs\` uses the Copilot CLI **EXTENSIONS** feature. Today that feature is gated behind experimental mode. In Copilot CLI, run \`/experimental on\` so **EXTENSIONS** appears in the enabled feature set before using Holdpoint locally.
- **OpenAI Codex** — project-level hooks require trust approval. Run \`codex trust\` in the Codex TUI or review the hook with \`/hooks\`.
- **General** — Holdpoint expects Node.js 18+ and a git repository so \`holdpoint init\`, \`holdpoint update\`, and \`holdpoint check\` can run normally.

Docs: https://holdpoint.dev/docs
`;

/**
 * Initialise Holdpoint in the current project.
 *
 * Writes `checks.yaml` (from the unified default template), `checks.immutable.json`,
 * engine files for each target agent (Copilot, Claude, Cursor, Codex),
 * and repo-local handoff docs such as `HOLDPOINT_PREREQUISITES.md`.
 * Defaults to installing all four agents; pass `--agent` to restrict to one.
 */
export async function initCommand(options: { agent?: string }): Promise<void> {
  const spinner = ora("Initialising Holdpoint…").start();

  // Default: install for all agents. Pass --agent=copilot|claude|cursor to restrict.
  const agentOpt = options.agent;
  const agents: AgentType[] =
    !agentOpt || agentOpt === "all"
      ? ["copilot", "claude", "cursor", "codex"]
      : [agentOpt as AgentType];

  spinner.text = `Installing for: ${chalk.cyan(agents.join(", "))}`;

  // Detect package manager once — used both for template substitution and devDep install.
  const pm = detectPackageManager();

  // 1. Read or create checks.yaml
  let yamlContent = MINIMAL_CHECKS_YAML;
  if (!existsSync("checks.yaml")) {
    const templatePath = getDefaultTemplatePath();
    if (templatePath) {
      yamlContent = readFileSync(templatePath, "utf8");
    }
    // Substitute the package manager so checks use the right runner (npm/yarn/pnpm).
    if (pm !== "pnpm") {
      yamlContent = yamlContent.replace(/\bpnpm\b/g, pm);
    }
    writeFileSync("checks.yaml", yamlContent, "utf8");
  } else {
    yamlContent = readFileSync("checks.yaml", "utf8");
  }

  const config = parseHoldpointYaml(yamlContent);

  // 2. Write checks.immutable.json — read by holdpoint-check.mjs at runtime
  const generatedDir = ".github/holdpoint/generated";
  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(`${generatedDir}/checks.immutable.json`, buildConfigJson(config), "utf8");

  // 3. Install engine files for each target agent
  if (agents.includes("copilot")) {
    // extension.mjs handles both session context injection (onSessionStart) and
    // check enforcement (onPreToolUse → task_complete). No separate hooks files needed.
    const extDir = ".github/extensions/holdpoint";
    mkdirSync(extDir, { recursive: true });
    writeFileSync(join(extDir, "extension.mjs"), buildEngine(config), "utf8");
  }

  if (agents.includes("claude")) {
    mkdirSync(".claude", { recursive: true });
    const settingsPath = ".claude/settings.json";
    let existing: Record<string, unknown> = {};
    if (existsSync(settingsPath)) {
      try {
        existing = JSON.parse(readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
      } catch {
        /* ignore */
      }
    }
    const holdpointHooks = JSON.parse(buildClaudeEngineJson(config)) as Record<string, unknown>;
    writeFileSync(
      settingsPath,
      JSON.stringify({ ...existing, hooks: holdpointHooks.hooks }, null, 2),
      "utf8",
    );
  }

  if (agents.includes("cursor")) {
    const cursorRules = buildCursorEngine(config);
    const cursorPath = ".cursorrules";
    if (existsSync(cursorPath)) {
      const existing = readFileSync(cursorPath, "utf8");
      if (!existing.includes("Holdpoint Rules")) {
        writeFileSync(cursorPath, existing + "\n" + cursorRules, "utf8");
      }
    } else {
      writeFileSync(cursorPath, cursorRules, "utf8");
    }
  }

  if (agents.includes("codex")) {
    mkdirSync(".codex", { recursive: true });
    writeFileSync(".codex/hooks.json", buildCodexHooksJson(config), "utf8");
    writeFileSync(".codex/holdpoint-check.mjs", buildCodexCheckScript(config), "utf8");
    writeFileSync(".codex/config.toml", buildCodexConfigToml(), "utf8");
    const agentsMdPath = "AGENTS.md";
    const existing = existsSync(agentsMdPath) ? readFileSync(agentsMdPath, "utf8") : "";
    writeFileSync(agentsMdPath, spliceAgentsMd(existing, config), "utf8");
  }

  // 4. Create repo-local guidance files if not present
  ensureBundledFile("MASTER_PROMPT.md", "MASTER_PROMPT.md", MINIMAL_MASTER_PROMPT);
  ensureBundledFile(
    "HOLDPOINT_PREREQUISITES.md",
    "HOLDPOINT_PREREQUISITES.md",
    MINIMAL_PREREQUISITES,
  );

  // Install holdpoint as a devDependency so hooks resolve via node_modules/.bin
  // rather than downloading on every hook fire via npx.
  spinner.text = "Installing holdpoint as a devDependency…";
  const installCmds: Record<PackageManager, string> = {
    pnpm: "pnpm add -D holdpoint@alpha",
    yarn: "yarn add --dev holdpoint@alpha",
    npm: "npm install --save-dev holdpoint@alpha",
  };
  const installCmd = installCmds[pm];
  try {
    execSync(installCmd, { stdio: "pipe" });
    spinner.succeed(chalk.bold.green("Holdpoint initialised!"));
  } catch {
    spinner.warn(
      chalk.yellow(`Holdpoint initialised, but could not install the package automatically.`) +
        `\n  Run manually: ${chalk.yellow(installCmd)}`,
    );
  }

  // Per-agent preflight: surface the Copilot `/experimental on` step, Codex
  // `codex trust` step, and Cursor's advisory-only status at install time
  // instead of burying them in HOLDPOINT_PREREQUISITES.md where users
  // routinely miss them.
  const preflight = runPreflight(agents);
  printPreflight(preflight);

  console.log(`
${chalk.cyan("Next steps:")}
  1. Edit ${chalk.yellow("checks.yaml")} to customise your eval checkpoints
  2. Address any ${chalk.yellow("→")} items above (full notes in ${chalk.yellow("HOLDPOINT_PREREQUISITES.md")})
  3. Commit ${chalk.yellow("checks.yaml")}, ${chalk.yellow("HOLDPOINT_PREREQUISITES.md")}, and the generated engine files
  4. Run ${chalk.yellow("holdpoint check")} at any time to validate

  Visual builder: ${chalk.yellow("holdpoint builder")}  (opens the daemon at /builder)
  Agents: ${chalk.cyan(agents.join(", "))}
`);
}
