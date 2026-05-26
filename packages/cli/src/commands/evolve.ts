import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import chalk from "chalk";
import ora from "ora";
import { parseHoldpointYaml, generateYaml } from "@holdpoint/yaml-core";
import type { HoldpointConfig, CheckDef, ConditionDef } from "@holdpoint/types";
import { scanProject } from "../evolve/scanner.js";
import { getRepoFiles, detectStaleChecks } from "../evolve/dead-checker.js";
import { getTemplates } from "../evolve/templates.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Strip leading comment lines from a checks.yaml so we can re-prepend them
 * after re-serialising — preserves the documentation header.
 */
function extractHeader(yaml: string): string {
  const lines = yaml.split("\n");
  const commentLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("#") || (commentLines.length > 0 && line.trim() === "")) {
      commentLines.push(line);
    } else {
      break;
    }
  }
  // Trim trailing blank lines
  while (commentLines.length > 0 && commentLines[commentLines.length - 1]?.trim() === "") {
    commentLines.pop();
  }
  return commentLines.join("\n");
}

function withHeader(header: string, newYaml: string): string {
  if (!header) return newYaml;
  return header + "\n\n" + newYaml;
}

// ── The command ───────────────────────────────────────────────────────────────

export async function evolveCommand(options: { apply?: boolean }): Promise<void> {
  if (!existsSync("checks.yaml")) {
    console.error(chalk.red("No checks.yaml found. Run `holdpoint init` first."));
    process.exit(1);
  }

  const spinner = ora("Scanning project profile…").start();
  const cwd = process.cwd();

  // 1. Scan project
  const profile = scanProject(cwd);
  const repoFiles = getRepoFiles(cwd);

  // 2. Parse checks.yaml
  const yamlContent = readFileSync("checks.yaml", "utf8");
  let config: HoldpointConfig;
  try {
    config = parseHoldpointYaml(yamlContent);
  } catch (err: unknown) {
    spinner.fail(chalk.red("Invalid checks.yaml:") + " " + (err as Error).message);
    process.exit(1);
  }

  spinner.stop();

  // 3. Compute proposals — templates whose trigger matches AND id not already in config
  const existingIds = new Set(config.checks.map((c) => c.id));
  const existingConditionIds = new Set(config.conditions.map((c) => c.id));
  const allTemplates = getTemplates(profile);
  const proposals = allTemplates.filter((t) => t.trigger(profile) && !existingIds.has(t.id));

  // 4. Detect stale checks
  const staleChecks = detectStaleChecks(config, repoFiles);

  // ── Print report ─────────────────────────────────────────────────────────

  // Profile summary — show detected items
  console.log(chalk.bold("\n📋 Project profile:"));
  const traits: [string, boolean, string][] = [
    ["TypeScript", profile.hasTypeScript, "tsconfig.json"],
    ["ESLint", profile.hasEslint, "eslint.config.*"],
    ["Biome", profile.hasBiome, "biome.json"],
    ["Ruff", profile.hasRuff, "pyproject.toml / ruff"],
    ["Prettier", profile.hasPrettier, ".prettierrc"],
    ["Vitest", profile.hasVitest, "devDependencies"],
    ["Jest", profile.hasJest, "devDependencies"],
    ["Python", profile.hasPython, "pyproject.toml"],
    ["Pytest", profile.hasPytest, "pytest.ini"],
    ["Go", profile.hasGo, "go.mod"],
    ["Rust", profile.hasRust, "Cargo.toml"],
    ["Next.js", profile.hasNext, "next.config.*"],
    ["React", profile.hasReact, "dependencies"],
    ["Prisma", profile.hasPrisma, "prisma/schema.prisma"],
    ["Drizzle", profile.hasDrizzle, "drizzle-orm"],
    ["Migrations", profile.hasMigrations, "migrations/"],
    ["Docker", profile.hasDocker, "Dockerfile"],
    ["Terraform", profile.hasTerraform, "*.tf"],
    ["Kubernetes", profile.hasKubernetes, "k8s/"],
    ["OpenAPI", profile.hasOpenApi, "openapi.yaml"],
    ["GitHub Actions", profile.hasGithubActions, ".github/workflows/"],
  ];
  const detected = traits.filter(([, yes]) => yes);
  if (detected.length === 0) {
    console.log(chalk.dim("  (empty project — only universal checks apply)"));
  } else {
    for (const [name, , hint] of detected) {
      console.log(`  ${chalk.green("✓")} ${name.padEnd(18)} ${chalk.dim(hint)}`);
    }
  }

  // Stale checks
  if (staleChecks.length > 0) {
    console.log(chalk.bold(`\n⚠️  Stale checks (${staleChecks.length}):`));
    for (const { check, reason, suggestedConditionPath } of staleChecks) {
      const fix = suggestedConditionPath
        ? chalk.dim(` → will wrap with conditionId: file_exists: ${suggestedConditionPath}`)
        : chalk.dim(" → no path inferred; review manually");
      console.log(`  ${chalk.yellow("◌")} ${chalk.bold(check.id)}  ${chalk.dim(reason)}${fix}`);
    }
  }

  // Proposals
  if (proposals.length === 0 && staleChecks.length === 0) {
    console.log(chalk.green("\n✓ checks.yaml is fully in sync with the project profile."));
    return;
  }

  if (proposals.length > 0) {
    console.log(chalk.bold(`\n💡 Proposed additions (${proposals.length}):`));
    for (const t of proposals) {
      const scope = t.when ? chalk.cyan(` when: ${t.when}`) : "";
      const type = t.cmd ? chalk.dim("cmd") : chalk.dim("prompt");
      const preview = t.cmd
        ? chalk.dim(`  ${t.cmd.slice(0, 80)}${t.cmd.length > 80 ? "…" : ""}`)
        : chalk.dim(`  ${(t.prompt ?? "").slice(0, 80)}${(t.prompt?.length ?? 0) > 80 ? "…" : ""}`);
      console.log(`  ${chalk.green("+")} ${chalk.bold(t.id.padEnd(24))} [${type}]${scope}`);
      console.log(`    ${preview}`);
    }
  }

  if (!options.apply) {
    console.log(
      chalk.red(`\n✗ checks.yaml is out of sync with the project profile.`) +
        `\n  Run ${chalk.bold("npx @holdpoint/cli@alpha suggest --apply")} to apply these changes.`,
    );
    process.exit(1);
  }

  // ── Apply ───────────────────────────────────────────────────────────────

  const applySpinner = ora("Applying changes to checks.yaml…").start();

  // Build updated conditions list
  const newConditions = [...config.conditions];

  // Collect conditions needed by proposals
  for (const t of proposals) {
    if (t.condition && !existingConditionIds.has(t.condition.id)) {
      newConditions.push(t.condition as ConditionDef);
      existingConditionIds.add(t.condition.id);
    }
  }

  // Wrap stale checks with file_exists conditions
  const updatedChecks: CheckDef[] = config.checks.map((check) => {
    const stale = staleChecks.find((s) => s.check.id === check.id);
    if (!stale || !stale.suggestedConditionPath) return check;

    const condId = `has-${check.id}`;
    if (!existingConditionIds.has(condId)) {
      newConditions.push({
        id: condId,
        operator: "file_exists",
        path: stale.suggestedConditionPath,
      });
      existingConditionIds.add(condId);
    }
    return { ...check, conditionId: condId };
  });

  // Append proposed checks
  const newChecks: CheckDef[] = proposals.map((t) => ({
    id: t.id,
    label: t.label,
    ...(t.when ? { when: t.when } : {}),
    ...(t.cmd ? { cmd: t.cmd } : {}),
    ...(t.prompt ? { prompt: t.prompt } : {}),
    ...(t.conditionId ? { conditionId: t.conditionId } : {}),
  }));

  const updatedConfig: HoldpointConfig = {
    ...config,
    conditions: newConditions,
    checks: [...updatedChecks, ...newChecks],
  };

  const header = extractHeader(yamlContent);
  const newYaml = withHeader(header, generateYaml(updatedConfig));
  writeFileSync("checks.yaml", newYaml, "utf8");

  // Regenerate engine files
  applySpinner.text = "Running holdpoint update…";
  try {
    execSync("npx @holdpoint/cli@alpha update", { stdio: "pipe" });
  } catch {
    // holdpoint update failure is non-fatal — checks.yaml is already written
    applySpinner.warn(
      chalk.yellow("checks.yaml updated, but `holdpoint update` failed — run it manually."),
    );
    printAppliedSummary(proposals.length, staleChecks.length);
    return;
  }

  applySpinner.succeed(chalk.green("checks.yaml updated and engine files regenerated."));
  printAppliedSummary(proposals.length, staleChecks.length);
}

function printAppliedSummary(added: number, wrapped: number): void {
  const parts: string[] = [];
  if (added > 0) parts.push(chalk.green(`${added} check${added === 1 ? "" : "s"} added`));
  if (wrapped > 0)
    parts.push(chalk.yellow(`${wrapped} stale check${wrapped === 1 ? "" : "s"} wrapped`));
  if (parts.length > 0) console.log("  " + parts.join("  ·  "));
  console.log(
    chalk.dim("\n  Review checks.yaml, then commit: ") +
      chalk.yellow("git add checks.yaml && git commit -m 'chore: update holdpoint checks'"),
  );
}
