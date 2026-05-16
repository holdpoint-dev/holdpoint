import { existsSync, readFileSync } from "node:fs";
import chalk from "chalk";
import ora from "ora";
import { parseSentinelYaml, matchesWhen } from "@sentinel/yaml-core";
import { runDeterministicChecks } from "@sentinel/yaml-core/runner";
import type { CheckResult } from "@sentinel/types";
import { execSync } from "node:child_process";

function getStagedFiles(): string[] {
  try {
    const out = execSync("git diff --cached --name-only", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return out.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function getAllChangedFiles(): string[] {
  try {
    const out = execSync("git diff --name-only HEAD", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return out.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export async function checkCommand(options: { staged?: boolean }): Promise<void> {
  if (!existsSync("checks.yaml")) {
    console.error(chalk.red("No checks.yaml found. Run `sentinel init` first."));
    process.exit(1);
  }

  const yamlContent = readFileSync("checks.yaml", "utf8");
  let config;
  try {
    config = parseSentinelYaml(yamlContent);
  } catch (err: unknown) {
    console.error(chalk.red("Invalid checks.yaml:"), (err as Error).message);
    process.exit(1);
  }

  const changedFiles = options.staged ? getStagedFiles() : getAllChangedFiles();

  // Print project guides so the agent/human sees them before running checks
  const guides = Object.entries(config.context?.guides ?? {});
  if (guides.length > 0) {
    console.log(chalk.cyan("\nProject guides:"));
    for (const [key, text] of guides) {
      console.log(chalk.bold(`  ${key}:`), chalk.dim(String(text).trim()));
    }
    console.log("");
  }

  if (changedFiles.length === 0) {
    console.log(chalk.yellow("No changed files detected. Running all checks with no file filter."));
  }

  const spinner = ora(`Running ${config.deterministic.length} deterministic check(s)…`).start();
  const results = runDeterministicChecks(
    config,
    changedFiles.length > 0 ? changedFiles : ["__all__"],
  );

  const passed = results.filter((r) => r.status === "pass");
  const failed = results.filter((r) => r.status === "fail");
  const skipped = results.filter((r) => r.status === "skip");

  spinner.stop();

  // Print results
  for (const result of results) {
    printResult(result);
  }

  // Summary
  console.log("");
  console.log(
    [
      chalk.green(`✓ ${passed.length} passed`),
      failed.length > 0 ? chalk.red(`✗ ${failed.length} failed`) : "",
      skipped.length > 0 ? chalk.gray(`◌ ${skipped.length} skipped`) : "",
    ]
      .filter(Boolean)
      .join("  "),
  );

  // Prompt checks: show those whose when filter matches the changed files
  const promptChecks = config.prompt.filter((c) =>
    matchesWhen(c.when, changedFiles.length > 0 ? changedFiles : ["__all__"]),
  );
  if (promptChecks.length > 0) {
    console.log(`\n${chalk.cyan("Agent prompts to act on:")}`);
    for (const c of promptChecks) {
      console.log(`  ${chalk.yellow("□")} [${c.label}] ${c.prompt ?? ""}`);
    }
  }

  if (failed.length > 0) {
    process.exit(1);
  }
}

function printResult(result: CheckResult): void {
  const icon =
    result.status === "pass"
      ? chalk.green("✓")
      : result.status === "fail"
        ? chalk.red("✗")
        : result.status === "skip"
          ? chalk.gray("◌")
          : chalk.yellow("…");

  const label = result.check.label;
  console.log(`${icon} ${label}`);

  if (result.status === "fail" && result.output) {
    const trimmed = result.output.trim().split("\n").slice(0, 10).join("\n");
    console.log(chalk.dim(trimmed.replace(/^/gm, "    ")));
  }
  if (result.status === "skip" && result.skipReason) {
    console.log(chalk.dim(`    ${result.skipReason}`));
  }
}
