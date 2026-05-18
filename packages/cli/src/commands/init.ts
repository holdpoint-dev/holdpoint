import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import ora from "ora";
import { buildHookJson, buildCheckScript, buildConfigJson } from "@holdpoint/engine-copilot";
import { buildEngineJson as buildClaudeEngineJson } from "@holdpoint/engine-claude";
import { buildEngine as buildCursorEngine } from "@holdpoint/engine-cursor";
import { parseHoldpointYaml } from "@holdpoint/yaml-core";
import type { AgentType, StackType } from "@holdpoint/types";
import { detectAgent, detectStack } from "../detect.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getTemplatePath(stack: StackType): string {
  const name = stack === "unknown" ? "_base" : stack;
  const candidates = [
    join(__dirname, "templates", `${name}.yaml`), // dist/templates/ (published package)
    join(__dirname, "../../../templates", `${name}.yaml`), // monorepo dev fallback
    join(process.cwd(), "templates", `${name}.yaml`), // cwd fallback
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return "";
}

function getMasterPromptPath(): string {
  const candidates = [
    join(__dirname, "templates/MASTER_PROMPT.md"), // dist/templates/ (published package)
    join(__dirname, "../../../templates/MASTER_PROMPT.md"), // monorepo dev fallback
    join(process.cwd(), "templates/MASTER_PROMPT.md"), // cwd fallback
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

export async function initCommand(options: { stack?: string; agent?: string }): Promise<void> {
  const spinner = ora("Initialising Holdpoint…").start();

  const stack = (options.stack as StackType | undefined) ?? detectStack();
  const agent = (options.agent as AgentType | undefined) ?? detectAgent();

  spinner.text = `Detected stack: ${chalk.cyan(stack)}, agent: ${chalk.cyan(agent)}`;

  // 1. Read or create checks.yaml
  let yamlContent = MINIMAL_CHECKS_YAML;
  if (!existsSync("checks.yaml")) {
    const templatePath = getTemplatePath(stack);
    if (templatePath) {
      yamlContent = readFileSync(templatePath, "utf8");
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

  // 3. Install engine files
  if (agent === "copilot" || agent === "unknown") {
    const hooksDir = ".github/hooks";
    mkdirSync(hooksDir, { recursive: true });
    writeFileSync(join(hooksDir, "holdpoint.json"), buildHookJson(config), "utf8");
    writeFileSync(join(hooksDir, "holdpoint-check.mjs"), buildCheckScript(config), "utf8");
  }

  if (agent === "claude") {
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

  if (agent === "cursor") {
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

  // 4. Create MASTER_PROMPT.md if not present
  if (!existsSync("MASTER_PROMPT.md")) {
    const guidePath = getMasterPromptPath();
    if (guidePath) {
      copyFileSync(guidePath, "MASTER_PROMPT.md");
    } else {
      // Fallback: minimal prompt if template file is not bundled
      writeFileSync(
        "MASTER_PROMPT.md",
        "# Holdpoint\n\nRun `npx holdpoint check` before marking any task complete.\nSee `checks.yaml` for the full list of checks.\n",
        "utf8",
      );
    }
  }

  spinner.succeed(chalk.bold.green("Holdpoint initialised!"));

  console.log(`
${chalk.cyan("Next steps:")}
  1. Edit ${chalk.yellow("checks.yaml")} to customise your eval checkpoints
  2. Commit ${chalk.yellow("checks.yaml")} and the generated engine files
  3. Run ${chalk.yellow("npx holdpoint check")} at any time to validate

  Visual builder: ${chalk.yellow("npx holdpoint build")}  (opens localhost:4321)
  Stack: ${chalk.cyan(stack)}  Agent: ${chalk.cyan(agent)}
`);
}
