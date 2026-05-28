import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { parseHoldpointYaml, matchesWhen } from "@holdpoint/yaml-core";
import { runDeterministicChecks } from "@holdpoint/yaml-core/runner";
import type { CheckResult, CheckRun, CheckReports } from "@holdpoint/types";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { identifyProject } from "@holdpoint/live-daemon";
import type { EventV1 } from "@holdpoint/live-protocol";
import { BridgeClient } from "@holdpoint/sdk";

const COMMIT_CACHE_PATH = ".holdpoint/checked-commits.json";
const COMMIT_CACHE_MAX = 100;
const CHECK_REPORTS_PATH = ".holdpoint/check-reports.json";
const CHECK_REPORTS_MAX = 50;

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

/**
 * Appends a check run report to `.holdpoint/check-reports.json`.
 * Caps to CHECK_REPORTS_MAX runs, newest first. Non-fatal if write fails.
 */
function recordCheckReport(run: CheckRun): void {
  try {
    mkdirSync(join(CHECK_REPORTS_PATH, ".."), { recursive: true });
    let existing: CheckReports = { runs: [] };
    if (existsSync(CHECK_REPORTS_PATH)) {
      try {
        existing = JSON.parse(readFileSync(CHECK_REPORTS_PATH, "utf8")) as CheckReports;
        if (!Array.isArray(existing.runs)) existing.runs = [];
      } catch {
        existing = { runs: [] };
      }
    }
    const updated: CheckReports = {
      runs: [run, ...existing.runs].slice(0, CHECK_REPORTS_MAX),
    };
    writeFileSync(CHECK_REPORTS_PATH, JSON.stringify(updated, null, 2) + "\n", "utf8");
  } catch {
    // Non-fatal: report write failure does not affect check outcomes.
  }
}

export async function checkCommand(options: { staged?: boolean }): Promise<void> {
  if (!existsSync("checks.yaml")) {
    // Three flavours of "no checks.yaml here":
    //   1. Agent hook fired with --staged → no prompting possible, never reached
    //      in practice (hooks only exist if init ran) but fail-fast on the
    //      pathological case so a misconfigured engine doesn't loop silently.
    //   2. Interactive shell on TTY → offer to bootstrap via `init`. This is
    //      the cd-into-fresh-repo case for users who installed holdpoint
    //      globally and expect it to "just work" wherever they run it.
    //   3. Non-TTY non-staged (CI, piped scripts) → print the actionable
    //      error and exit, same as before. Don't silently bootstrap.
    if (options.staged || !process.stdout.isTTY || !process.stdin.isTTY) {
      console.error(chalk.red("No checks.yaml found. Run `holdpoint init` first."));
      process.exit(1);
    }
    const { promptYesNo } = await import("../lib/prompt.js");
    console.log(
      chalk.yellow("No checks.yaml in this directory.") +
        chalk.dim(" (") +
        process.cwd() +
        chalk.dim(")"),
    );
    const shouldInit = await promptYesNo(chalk.bold("Initialise Holdpoint here?"), true);
    if (!shouldInit) {
      console.error(chalk.dim("Skipped. Run `holdpoint init` when you're ready."));
      process.exit(1);
    }
    const { initCommand } = await import("./init.js");
    await initCommand({});
    // init prints its own preflight + next-steps block. We deliberately don't
    // continue to run checks afterwards — the user just got bootstrapped and
    // hasn't reviewed the generated checks.yaml yet. Tell them what's next
    // and exit cleanly so they can iterate before the first real run.
    console.log(
      chalk.dim("\nReview ") +
        chalk.yellow("checks.yaml") +
        chalk.dim(" and run ") +
        chalk.yellow("holdpoint check") +
        chalk.dim(" again when you're ready."),
    );
    return;
  }

  const yamlContent = readFileSync("checks.yaml", "utf8");
  let config;
  try {
    config = parseHoldpointYaml(yamlContent);
  } catch (err: unknown) {
    console.error(chalk.red("Invalid checks.yaml:"), (err as Error).message);
    process.exit(1);
  }

  // Always resolve HEAD SHA — used for both cache and reports.
  const headSha = getHeadSha();

  let changedFiles: string[];
  let usedHeadShaForCache = false;

  if (options.staged) {
    const staged = getStagedFiles();
    if (staged.length > 0) {
      changedFiles = staged;
    } else {
      // Nothing staged — check if HEAD was already verified to avoid a check loop.
      if (headSha && readCommitCache().has(headSha)) {
        console.log(
          chalk.green(`✓ Commit ${headSha.slice(0, 8)} already verified — nothing to re-check.`),
        );
        process.exit(0);
      }

      // Fall back to files in the most recent commit (covers the
      // "agent committed then called task_complete" workflow).
      const lastCommit = getLastCommitFiles();
      if (lastCommit.length > 0) {
        changedFiles = lastCommit;
        usedHeadShaForCache = true;
        console.log(
          chalk.yellow("No staged files. Running checks scoped to the most recent commit's files."),
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
      console.log(
        chalk.yellow("No changed files detected. Running all checks with no file filter."),
      );
      console.log(
        chalk.dim(
          "  Tip: if you just ran `holdpoint init`, commit the generated files to clear the git-commit check.",
        ),
      );
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

  // Write rich check run report BEFORE exiting so failed runs are always recorded.
  const reportResults = [
    ...results.map((r) => ({
      id: r.check.id,
      label: r.check.label,
      kind: "cmd" as const,
      status: r.status as "pass" | "fail" | "skip",
      ...(r.output !== undefined ? { output: r.output } : {}),
      ...(r.exitCode !== undefined ? { exitCode: r.exitCode } : {}),
      ...(r.skipReason !== undefined ? { skipReason: r.skipReason } : {}),
    })),
    ...promptChecks.map((c) => ({
      id: c.id,
      label: c.label,
      kind: "prompt" as const,
      status: "shown" as const,
    })),
  ];

  const run = {
    sha: headSha,
    shortSha: headSha ? headSha.slice(0, 8) : null,
    timestamp: new Date().toISOString(),
    files: changedFiles.length > 0 ? changedFiles : [],
    results: reportResults,
    summary: {
      passed: passed.length,
      failed: failed.length,
      skipped: skipped.length,
      shown: promptChecks.length,
    },
  };
  recordCheckReport(run);

  const project = identifyProject(process.cwd());
  const bridge = new BridgeClient();
  const liveEvents: EventV1[] = reportResults
    .filter(
      (result): result is Extract<(typeof reportResults)[number], { kind: "cmd" }> =>
        result.kind === "cmd",
    )
    .map((result, index) => ({
      v: 1,
      id: randomUUID(),
      ts: Date.now() + index,
      engine: "holdpoint",
      session_id: "check-runner",
      project_hash: project.hash,
      cwd: process.cwd(),
      type: "check_run",
      payload: {
        check_id: result.id,
        label: result.label,
        status: result.status,
        duration_ms: 0,
        ...(result.output ? { output: result.output } : {}),
      },
    }));
  if (liveEvents.length > 0) {
    await bridge.sendEvents(liveEvents);
  }

  if (failed.length > 0) {
    process.exit(1);
  }

  // All checks passed — if we ran against a committed HEAD (no staged files), mark it verified.
  if (usedHeadShaForCache && headSha) {
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
