import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, type Stats } from "node:fs";
import { join, relative } from "node:path";
import chalk from "chalk";

interface RequireChangesetOptions {
  staged?: boolean;
  include?: string[];
}

interface PackageRoot {
  path: string;
  name: string;
  private: boolean;
}

interface ChangesetCheckInput {
  changedFiles: string[];
  packageRoots: PackageRoot[];
}

const IGNORED_DIRS = new Set([
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
  "test-results",
]);

function runGit(command: string): string[] {
  try {
    const out = execSync(command, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return out.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function readJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

function getDefaultBranchRef(): string | null {
  const [symbolic] = runGit("git symbolic-ref --quiet --short refs/remotes/origin/HEAD");
  if (symbolic) return symbolic;
  const candidates = ["origin/main", "origin/master"];
  for (const candidate of candidates) {
    if (runGit(`git rev-parse --verify ${candidate}`).length > 0) {
      return candidate;
    }
  }
  return null;
}

function getBranchChangedFiles(): string[] {
  const defaultBranch = getDefaultBranchRef();
  if (!defaultBranch) return [];
  const [base] = runGit(`git merge-base HEAD ${defaultBranch}`);
  if (!base) return [];
  return runGit(`git diff --name-only ${base}...HEAD`);
}

function uniqueFiles(files: string[]): string[] {
  return [...new Set(files.map(normalizePath))];
}

function getChangedFiles(options: RequireChangesetOptions): string[] {
  const staged = runGit("git diff --cached --name-only");
  if (options.staged && staged.length > 0) return staged;
  const untracked = runGit("git ls-files --others --exclude-standard");
  if (!options.staged) {
    const unstaged = runGit("git diff --name-only HEAD");
    const workingTree = uniqueFiles([...unstaged, ...untracked]);
    if (workingTree.length > 0) return workingTree;
  }

  const branch = getBranchChangedFiles();
  if (branch.length > 0 || untracked.length > 0) return uniqueFiles([...branch, ...untracked]);

  return runGit("git diff --name-only HEAD~1 HEAD");
}

function toRegex(pattern: string): RegExp {
  const normalized = normalizePath(pattern);
  let source = "";
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i]!;
    const next = normalized[i + 1];
    if (char === "*" && next === "*") {
      source += ".*";
      i += 1;
      continue;
    }
    if (char === "*") {
      source += "[^/]+";
      continue;
    }
    source += char.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
}

function matchesAny(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => toRegex(pattern).test(path));
}

function parsePnpmWorkspacePatterns(): string[] {
  if (!existsSync("pnpm-workspace.yaml")) return [];
  const lines = readFileSync("pnpm-workspace.yaml", "utf8").split(/\r?\n/);
  return lines
    .map((line) => line.match(/^\s*-\s*['"]?([^'"]+)['"]?\s*$/)?.[1])
    .filter((line): line is string => Boolean(line))
    .filter((line) => !line.startsWith("!"));
}

function expandOneLevelWorkspacePattern(pattern: string): string[] {
  const normalized = normalizePath(pattern).replace(/\/package\.json$/, "");
  if (!normalized.includes("*")) {
    return existsSync(join(normalized, "package.json")) ? [normalized] : [];
  }

  const starIndex = normalized.indexOf("*");
  const parent = normalized.slice(0, starIndex).replace(/\/$/, "");
  const suffix = normalized.slice(starIndex + 1).replace(/^\//, "");
  if (!parent || suffix.includes("*") || !existsSync(parent)) {
    return [];
  }

  return readdirSync(parent)
    .map((entry) => join(parent, entry, suffix))
    .map(normalizePath)
    .filter((candidate) => existsSync(join(candidate, "package.json")));
}

function walkPackageRoots(start: string, roots: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(start);
  } catch {
    return;
  }

  if (start !== "." && existsSync(join(start, "package.json"))) {
    roots.push(normalizePath(start));
    return;
  }

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry)) continue;
    const candidate = join(start, entry);
    let stats: Stats;
    try {
      stats = statSync(candidate);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      walkPackageRoots(candidate, roots);
    }
  }
}

function readPackageRoot(path: string): PackageRoot | null {
  const pkg = readJson(join(path, "package.json"));
  if (!pkg) return null;
  return {
    path: normalizePath(path === "." ? "" : path),
    name: typeof pkg.name === "string" ? pkg.name : path || "root",
    private: pkg.private === true,
  };
}

function discoverPackageRoots(includePatterns: string[] = []): PackageRoot[] {
  const explicitRoots = includePatterns.flatMap(expandOneLevelWorkspacePattern);
  if (explicitRoots.length > 0) {
    return uniquePackageRoots(
      explicitRoots.map(readPackageRoot).filter((pkg): pkg is PackageRoot => Boolean(pkg)),
    );
  }

  const rootPackage = readJson("package.json");
  const workspacePatterns = [
    ...parsePnpmWorkspacePatterns(),
    ...extractPackageJsonWorkspacePatterns(rootPackage),
  ];
  const workspaceRoots = workspacePatterns.flatMap(expandOneLevelWorkspacePattern);
  if (workspaceRoots.length > 0) {
    return uniquePackageRoots(
      workspaceRoots
        .map(readPackageRoot)
        .filter((pkg): pkg is PackageRoot => Boolean(pkg))
        .filter((pkg) => !pkg.private),
    );
  }

  const discovered: string[] = [];
  walkPackageRoots(".", discovered);
  const roots = discovered.length > 0 ? discovered : existsSync("package.json") ? ["."] : [];
  return uniquePackageRoots(
    roots
      .map(readPackageRoot)
      .filter((pkg): pkg is PackageRoot => Boolean(pkg))
      .filter((pkg) => !pkg.private),
  );
}

function extractPackageJsonWorkspacePatterns(pkg: Record<string, unknown> | null): string[] {
  const workspaces = pkg?.workspaces;
  if (Array.isArray(workspaces)) {
    return workspaces.filter((entry): entry is string => typeof entry === "string");
  }
  if (
    workspaces &&
    typeof workspaces === "object" &&
    "packages" in workspaces &&
    Array.isArray((workspaces as { packages?: unknown }).packages)
  ) {
    return (workspaces as { packages: unknown[] }).packages.filter(
      (entry): entry is string => typeof entry === "string",
    );
  }
  return [];
}

function uniquePackageRoots(packages: PackageRoot[]): PackageRoot[] {
  const byPath = new Map<string, PackageRoot>();
  for (const pkg of packages) {
    byPath.set(pkg.path, pkg);
  }
  return [...byPath.values()].sort((left, right) => right.path.length - left.path.length);
}

function isChangesetFile(file: string): boolean {
  return /^\.changeset\/(?!README\.md$)[^/]+\.md$/.test(file);
}

function isReleaseAffectingPackageFile(relativePath: string): boolean {
  if (
    /(^|\/)(__tests__|test|tests|spec|e2e)\//.test(relativePath) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(relativePath)
  ) {
    return false;
  }
  if (
    relativePath === "README.md" ||
    relativePath === "CHANGELOG.md" ||
    relativePath.startsWith("docs/") ||
    relativePath.startsWith("dist/") ||
    relativePath.startsWith("coverage/")
  ) {
    return false;
  }
  return /^(package\.json|src\/|lib\/|bin\/|templates\/|scripts\/|[^/]+\.config\.)/.test(
    relativePath,
  );
}

function findPackageForFile(file: string, packageRoots: PackageRoot[]): PackageRoot | null {
  const normalized = normalizePath(file);
  return (
    packageRoots.find((pkg) => {
      if (pkg.path === "") return true;
      return normalized === pkg.path || normalized.startsWith(`${pkg.path}/`);
    }) ?? null
  );
}

function analyzeChangesetRequirement(input: ChangesetCheckInput): {
  requiredFiles: { file: string; packageName: string }[];
  hasChangeset: boolean;
} {
  const changedFiles = input.changedFiles.map(normalizePath);
  const hasChangeset = changedFiles.some(isChangesetFile);
  const requiredFiles = changedFiles.flatMap((file) => {
    if (file.startsWith(".changeset/")) return [];
    const pkg = findPackageForFile(file, input.packageRoots);
    if (!pkg) return [];
    const relativePath = pkg.path === "" ? file : normalizePath(relative(pkg.path, file));
    if (!isReleaseAffectingPackageFile(relativePath)) return [];
    return [{ file, packageName: pkg.name }];
  });
  return { requiredFiles, hasChangeset };
}

export async function requireChangesetCommand(options: RequireChangesetOptions): Promise<void> {
  const changedFiles = getChangedFiles(options);
  if (changedFiles.length === 0) {
    console.log(chalk.green("✓ No changed files detected — no changeset required."));
    return;
  }

  const packageRoots = discoverPackageRoots(options.include ?? []);
  if (packageRoots.length === 0) {
    console.log(chalk.green("✓ No package roots detected — no changeset required."));
    return;
  }

  const hasChangesetSetup = existsSync(".changeset");
  const { requiredFiles, hasChangeset } = analyzeChangesetRequirement({
    changedFiles,
    packageRoots,
  });
  if (requiredFiles.length === 0) {
    console.log(chalk.green("✓ No release-affecting package files changed."));
    return;
  }
  if (hasChangeset) {
    console.log(chalk.green("✓ Package changes include a changeset."));
    return;
  }

  console.error(chalk.red("✗ Package changes need a changeset."));
  console.error("");
  console.error(chalk.bold("Changed package files:"));
  for (const item of requiredFiles.slice(0, 12)) {
    console.error(`  - ${item.file} (${item.packageName})`);
  }
  if (requiredFiles.length > 12) {
    console.error(`  - …and ${requiredFiles.length - 12} more`);
  }
  console.error("");
  if (!hasChangesetSetup) {
    console.error(
      "No .changeset directory was found. Create one and add a changeset before finishing:",
    );
    console.error(chalk.yellow("  mkdir -p .changeset"));
  } else {
    console.error("Add a changeset before finishing:");
  }
  console.error(chalk.yellow("  pnpm changeset"));
  console.error(chalk.dim("  or add a .changeset/<name>.md file manually"));
  process.exit(1);
}

export const changesetTestInternals = {
  analyzeChangesetRequirement,
  discoverPackageRoots,
  isReleaseAffectingPackageFile,
  matchesAny,
  toRegex,
};
