import { existsSync, readFileSync } from "node:fs";
import chalk from "chalk";
import ora from "ora";
import { parseSentinelYaml, runDeterministicChecks } from "@sentinel/yaml-core";
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

  if (changedFiles.length === 0) {
    console.log(chalk.yellow("No changed files detected. Running all checks with no file filter."));
  }

  const spinner = ora(`Running ${config.deterministic.length} deterministic check(s)…`).start();
  const results = runDeterministicChecks(config, changedFiles.length > 0 ? changedFiles : ["__all__"]);

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

  // Manual checks reminder
  const manualChecks = config.manual.filter((c) =>
    changedFiles.length === 0 || c.trigger.type === "always",
  );
  if (manualChecks.length > 0) {
    console.log(`\n${chalk.cyan("Manual checks to verify:")}`);
    for (const c of manualChecks) {
      console.log(`  ${chalk.yellow("□")} [${c.label}] ${c.manual ?? ""}`);
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
