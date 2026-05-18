import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { parseHoldpointYaml, matchesWhen } from "@holdpoint/yaml-core";
import { runDeterministicChecks } from "@holdpoint/yaml-core/runner";
import type { CheckResult } from "@holdpoint/types";
import { execSync } from "node:child_process";
import { scanProject } from "../evolve/scanner.js";
import { getTemplates } from "../evolve/templates.js";
import { detectStaleChecks, getRepoFiles } from "../evolve/dead-checker.js";

const COMMIT_CACHE_PATH = ".holdpoint/checked-commits.json";
const COMMIT_CACHE_MAX = 100;

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

/**
 * Returns the files changed in the most recent commit (HEAD vs HEAD~1).
 * Used as a fallback when no staged files exist but the agent has already committed.
 */
function getLastCommitFiles(): string[] {
  try {
    const out = execSync("git diff --name-only HEAD~1 HEAD", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return out.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

/** Returns the current HEAD commit SHA, or null if unavailable. */
function getHeadSha(): string | null {
  try {
    return execSync("git rev-parse HEAD", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/** Returns the set of already-verified commit SHAs from the local cache. */
function readCommitCache(): Set<string> {
  try {
    const raw = readFileSync(COMMIT_CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as { verified?: unknown };
    return new Set(Array.isArray(parsed.verified) ? (parsed.verified as string[]) : []);
  } catch {
    return new Set();
  }
}

/**
 * Records a commit SHA as verified in the local cache.
 * Caps the cache at COMMIT_CACHE_MAX entries (newest first).
 */
function recordCommitCache(sha: string): void {
  try {
    const existing = readCommitCache();
    const updated = [sha, ...[...existing].filter((s) => s !== sha)].slice(0, COMMIT_CACHE_MAX);
    mkdirSync(join(COMMIT_CACHE_PATH, ".."), { recursive: true });
    writeFileSync(COMMIT_CACHE_PATH, JSON.stringify({ verified: updated }, null, 2) + "\n", "utf8");
  } catch {
    // Non-fatal: cache write failure just means the next run re-checks this commit.
  }
}

export async function checkCommand(options: { staged?: boolean }): Promise<void> {
  if (!existsSync("checks.yaml")) {
    console.error(chalk.red("No checks.yaml found. Run `holdpoint init` first."));
    process.exit(1);
  }

  const yamlContent = readFileSync("checks.yaml", "utf8");
  let config;
  try {
    config = parseHoldpointYaml(yamlContent);
  } catch (err: unknown) {
    console.error(chalk.red("Invalid checks.yaml:"), (err as Error).message);
    process.exit(1);
  }

  let changedFiles: string[];
  let headSha: string | null = null;

  if (options.staged) {
    const staged = getStagedFiles();
    if (staged.length > 0) {
      changedFiles = staged;
    } else {
      // Nothing staged — check if HEAD was already verified to avoid a check loop.
      headSha = getHeadSha();
      if (headSha && readCommitCache().has(headSha)) {
        console.log(chalk.green(`✓ Commit ${headSha.slice(0, 8)} already verified — nothing to re-check.`));
        process.exit(0);
      }

      // Fall back to files in the most recent commit (covers the
      // "agent committed then called task_complete" workflow).
      const lastCommit = getLastCommitFiles();
      if (lastCommit.length > 0) {
        changedFiles = lastCommit;
        console.log(
          chalk.yellow(
            "No staged files. Running checks scoped to the most recent commit's files.",
          ),
        );
      } else {
        // Truly nothing changed (investigative session, no recent commit).
        console.log(chalk.green("✓ No staged changes and no recent commit — nothing to check."));
        process.exit(0);
      }
    }
  } else {
    changedFiles = getAllChangedFiles();
    if (changedFiles.length === 0) {
      console.log(chalk.yellow("No changed files detected. Running all checks with no file filter."));
    }
  }

  // Print project guides so the agent/human sees them before running checks
  const guides = Object.entries(config.context?.guides ?? {});
  if (guides.length > 0) {
    console.log(chalk.cyan("\nProject guides:"));
    for (const [key, text] of guides) {
      console.log(chalk.bold(`  ${key}:`), chalk.dim(String(text).trim()));
    }
    console.log("");
  }

  const taskCount = config.checks.filter((c) => c.cmd !== undefined).length;
  const spinner = ora(`Running ${taskCount} task(s)…`).start();
  const effectiveFiles = changedFiles.length > 0 ? changedFiles : ["__all__"];
  const results = runDeterministicChecks(config, effectiveFiles);

  // Built-in structural drift detection — hardcoded into holdpoint, not user-configurable.
  // Fires when structural indicator files changed (or when all checks run with no staged files).
  const runDrift = matchesWhen("structural", effectiveFiles);
  if (runDrift) {
    const profile = scanProject();
    const existingIds = new Set(config.checks.map((c) => c.id));
    const templates = getTemplates(profile);
    const proposals = templates.filter((t) => t.trigger(profile) && !existingIds.has(t.id));
    const repoFiles = getRepoFiles(process.cwd());
    const staleChecks = detectStaleChecks(config, repoFiles);

    if (proposals.length > 0 || staleChecks.length > 0) {
      const lines: string[] = [];
      if (proposals.length > 0) {
        lines.push(`${proposals.length} new check(s) available for your project stack:`);
        for (const p of proposals) lines.push(`  + ${p.label}`);
      }
      if (staleChecks.length > 0) {
        lines.push(`${staleChecks.length} stale check(s) no longer match your project:`);
        for (const s of staleChecks) lines.push(`  - ${s.check.label}: ${s.reason}`);
      }
      lines.push("\nRun: npx @holdpoint/cli@alpha evolve --apply");
      results.push({
        check: { id: "__holdpoint_evolve__", label: "Evolve checks with project structure" },
        status: "fail",
        output: lines.join("\n"),
      });
    }
  }

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
  const promptChecks = config.checks.filter(
    (c) =>
      c.prompt !== undefined &&
      matchesWhen(c.when, changedFiles.length > 0 ? changedFiles : ["__all__"], config.patterns),
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

  // All checks passed — if we ran against a committed HEAD (no staged files), mark it verified
  // so subsequent task_complete calls on the same commit skip straight through.
  if (headSha) {
    recordCommitCache(headSha);
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
