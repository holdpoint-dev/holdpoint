import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import chalk from "chalk";
import ora from "ora";
import { parseHoldpointYaml } from "@holdpoint/yaml-core";
import {
  buildHookJson,
  buildCheckScript,
  buildConfigJson,
  buildEngine,
} from "@holdpoint/engine-copilot";
import { buildEngineJson as buildClaudeEngineJson } from "@holdpoint/engine-claude";
import { buildEngine as buildCursorEngine } from "@holdpoint/engine-cursor";
import { detectInstalledAgents } from "../detect.js";
import type { AgentType } from "@holdpoint/types";

export async function updateCommand(): Promise<void> {
  if (!existsSync("checks.yaml")) {
    console.error(chalk.red("No checks.yaml found. Run `holdpoint init` first."));
    process.exit(1);
  }

  const spinner = ora("Updating Holdpoint engine files…").start();
  const config = parseHoldpointYaml(readFileSync("checks.yaml", "utf8"));

  // Regenerate for every agent that was previously installed.
  // Fall back to all three if no engine files exist yet (e.g. first run after manual checks.yaml edit).
  const detected = detectInstalledAgents();
  const agents: AgentType[] = detected.length > 0 ? detected : ["copilot", "claude", "cursor"];

  // Always write checks.immutable.json — read by holdpoint-check.mjs at runtime
  const generatedDir = ".github/holdpoint/generated";
  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(`${generatedDir}/checks.immutable.json`, buildConfigJson(config), "utf8");

  if (agents.includes("copilot")) {
    const hooksDir = ".github/hooks";
    mkdirSync(hooksDir, { recursive: true });
    writeFileSync(`${hooksDir}/holdpoint.json`, buildHookJson(config), "utf8");
    writeFileSync(`${hooksDir}/holdpoint-check.mjs`, buildCheckScript(config), "utf8");
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
    writeFileSync(settingsPath, JSON.stringify({ ...existing, hooks: hooks.hooks }, null, 2));
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

  spinner.succeed(chalk.green("Engine files updated from current checks.yaml"));
}
