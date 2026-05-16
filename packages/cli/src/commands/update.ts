import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import chalk from "chalk";
import ora from "ora";
import { parseSentinelYaml } from "@sentinel/yaml-core";
import { buildHookJson, buildCheckScript, buildConfigJson } from "@sentinel/engine-copilot";
import { buildEngineJson as buildClaudeEngineJson } from "@sentinel/engine-claude";
import { buildEngine as buildCursorEngine } from "@sentinel/engine-cursor";
import { detectAgent } from "../detect.js";
import type { AgentType } from "@sentinel/types";

export async function updateCommand(): Promise<void> {
  if (!existsSync("checks.yaml")) {
    console.error(chalk.red("No checks.yaml found. Run `sentinel init` first."));
    process.exit(1);
  }

  const spinner = ora("Updating Sentinel engine files…").start();
  const agent = detectAgent();
  const config = parseSentinelYaml(readFileSync("checks.yaml", "utf8"));

  // Always write checks.immutable.json — read by sentinel-check.mjs at runtime
  const generatedDir = ".github/sentinel/generated";
  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(`${generatedDir}/checks.immutable.json`, buildConfigJson(config), "utf8");

  if (agent === "copilot" || agent === "unknown") {
    const hooksDir = ".github/hooks";
    mkdirSync(hooksDir, { recursive: true });
    writeFileSync(`${hooksDir}/sentinel.json`, buildHookJson(config), "utf8");
    writeFileSync(`${hooksDir}/sentinel-check.mjs`, buildCheckScript(config), "utf8");
    spinner.text = `Updated ${chalk.green(".github/hooks/sentinel.json")} and ${chalk.green(".github/hooks/sentinel-check.mjs")}`;
  }

  if (agent === "claude") {
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

  if (agent === "cursor") {
    const cursorRules = buildCursorEngine(config);
    const cursorPath = ".cursorrules";
    if (existsSync(cursorPath)) {
      const content = readFileSync(cursorPath, "utf8");
      const start = content.indexOf("# ─── Sentinel Rules");
      const end = content.indexOf("# ─── End Sentinel Rules ───");
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
