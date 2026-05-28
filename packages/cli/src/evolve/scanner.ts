import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

export interface ProjectProfile {
  // Languages
  hasTypeScript: boolean;
  hasPython: boolean;
  hasGo: boolean;
  hasRust: boolean;
  hasJava: boolean;
  hasRuby: boolean;
  // Frameworks
  hasNext: boolean;
  hasReact: boolean;
  // Linting
  hasEslint: boolean;
  hasBiome: boolean;
  hasRuff: boolean;
  hasPrettier: boolean;
  // Testing
  hasVitest: boolean;
  hasJest: boolean;
  hasPytest: boolean;
  // DB
  hasPrisma: boolean;
  hasDrizzle: boolean;
  hasMigrations: boolean;
  hasAlembic: boolean;
  // Infra
  hasDocker: boolean;
  hasTerraform: boolean;
  hasKubernetes: boolean;
  // API
  hasOpenApi: boolean;
  // CI
  hasGithubActions: boolean;
  // Release tooling
  hasChangesets: boolean;
  // Package manager
  packageManager: "pnpm" | "yarn" | "bun" | "npm";
  // Raw scripts from package.json
  scripts: Record<string, string>;
  // All dep names (deps + devDeps)
  deps: Set<string>;
}

type PkgJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

function tryReadJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function tryReadText(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

/**
 * Walk a directory up to maxDepth levels, returning all file paths relative to root.
 * Excludes common build artifacts and dependency directories.
 */
function walkDir(
  dir: string,
  root: string,
  depth: number,
  maxDepth: number,
  ignored: Set<string>,
): string[] {
  if (depth > maxDepth) return [];
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  const results: string[] = [];
  for (const entry of entries) {
    if (ignored.has(entry)) continue;
    const full = join(dir, entry);
    const rel = full.slice(root.length + 1);
    try {
      // Use stat-free heuristic: if it has an extension it's likely a file
      // If no extension and doesn't start with ".", try as directory
      const hasExt = entry.includes(".");
      if (!hasExt || entry.startsWith(".")) {
        // Could be a dir — try recursing
        const children = walkDir(full, root, depth + 1, maxDepth, ignored);
        if (children.length > 0) {
          results.push(...children);
        } else if (hasExt) {
          results.push(rel);
        }
      } else {
        results.push(rel);
      }
    } catch {
      // skip
    }
  }
  return results;
}

const WALK_IGNORED = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".turbo",
  "__pycache__",
  ".venv",
  "venv",
  ".mypy_cache",
  "target",
  ".cache",
  "coverage",
  ".nyc_output",
]);

/**
 * Returns a list of all files in the repo (relative paths from cwd).
 * Uses `git ls-files` when inside a git repo; falls back to directory walk.
 */
export function getRepoFiles(cwd: string): string[] {
  try {
    const out = execSync("git ls-files", {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const files = out.trim().split("\n").filter(Boolean);
    if (files.length > 0) return files;
  } catch {
    // not a git repo or git not available
  }
  return walkDir(cwd, cwd, 0, 6, WALK_IGNORED);
}

/**
 * Returns true if the file path is a structural project indicator — i.e., a file
 * whose addition or modification may require new checks to be added to checks.yaml.
 * Mirrors the detection patterns used in `scanProject()`.
 */
export function isStructuralFile(file: string): boolean {
  const f = file.replace(/\\/g, "/");

  // JS / TS project structure
  if (f === "package.json") return true;
  if (/^tsconfig[^/]*\.json$/.test(f)) return true;

  // Python
  if (/^requirements[^/]*\.txt$/.test(f)) return true;
  if (f === "pyproject.toml") return true;
  if (f === "Pipfile") return true;
  if (f === "setup.py") return true;
  if (f === "setup.cfg") return true;
  if (f === "pytest.ini") return true;
  if (f === "tox.ini") return true;

  // Go
  if (f === "go.mod") return true;

  // Rust
  if (f === "Cargo.toml") return true;

  // Java / Kotlin
  if (f === "pom.xml") return true;
  if (/^build\.gradle(\.kts)?$/.test(f)) return true;

  // Ruby
  if (f === "Gemfile") return true;

  // Test frameworks
  if (/^vitest\.config\.[^/]+$/.test(f)) return true;
  if (/^jest\.config\.[^/]+$/.test(f)) return true;
  if (/^playwright\.config\.[^/]+$/.test(f)) return true;

  // Linters / formatters
  if (/^eslint\.config\.[^/]+$/.test(f)) return true;
  if (/^\.eslintrc[^/]*$/.test(f)) return true;
  if (/^biome\.jsonc?$/.test(f)) return true;
  if (/^prettier\.config\.[^/]+$/.test(f)) return true;
  if (/^\.prettierrc[^/]*$/.test(f)) return true;

  // Next.js
  if (/^next\.config\.[^/]+$/.test(f)) return true;

  // Docker / infra
  if (/^Dockerfile[^/]*$/.test(f)) return true;
  if (/^docker-compose[^/]*\.ya?ml$/.test(f)) return true;
  if (/[^/]*\.tf$/.test(f)) return true;

  // Database
  if (f === "prisma/schema.prisma") return true;

  // OpenAPI
  if (/^(api\/)?openapi\.(yaml|yml|json)$/.test(f)) return true;

  // CI
  if (/^\.github\/workflows\/[^/]+\.ya?ml$/.test(f)) return true;
  if (/^\.circleci\/.+$/.test(f)) return true;
  if (f === "Jenkinsfile") return true;
  if (f === ".gitlab-ci.yml") return true;
  if (f === ".travis.yml") return true;

  return false;
}

/**
 * Scan the project at `cwd` and return a `ProjectProfile`.
 * All detection is pure filesystem reads — no shell commands executed.
 */
export function scanProject(cwd = process.cwd()): ProjectProfile {
  const exists = (p: string) => existsSync(join(cwd, p));

  // Package manager
  const packageManager: ProjectProfile["packageManager"] = exists("pnpm-lock.yaml")
    ? "pnpm"
    : exists("yarn.lock")
      ? "yarn"
      : exists("bun.lockb")
        ? "bun"
        : "npm";

  // package.json
  const pkg = tryReadJson<PkgJson>(join(cwd, "package.json"));
  const scripts = pkg?.scripts ?? {};
  const deps = new Set<string>([
    ...Object.keys(pkg?.dependencies ?? {}),
    ...Object.keys(pkg?.devDependencies ?? {}),
  ]);

  // Python manifest scanning
  const pyprojectText = tryReadText(join(cwd, "pyproject.toml"));
  const requirementsText = tryReadText(join(cwd, "requirements.txt"));
  const pipfileText = tryReadText(join(cwd, "Pipfile"));
  const allPyText = pyprojectText + requirementsText + pipfileText;

  const hasPytest =
    exists("pytest.ini") ||
    exists("setup.cfg") ||
    allPyText.includes("pytest") ||
    allPyText.includes("[tool.pytest");
  const hasRuff = allPyText.includes("ruff") || deps.has("ruff");
  const hasAlembic = allPyText.includes("alembic") || deps.has("alembic");

  // Root-level file listing (for Dockerfile variants and .tf files)
  let rootFiles: string[] = [];
  try {
    rootFiles = readdirSync(cwd);
  } catch {
    // ignore
  }

  const hasDocker =
    rootFiles.some((f) => f === "Dockerfile" || f.startsWith("Dockerfile.")) ||
    exists("docker-compose.yml") ||
    exists("docker-compose.yaml") ||
    exists("docker-compose.dev.yml");

  const hasTerraform =
    rootFiles.some((f) => f.endsWith(".tf")) || exists("terraform") || exists("infra");

  return {
    // Languages
    hasTypeScript: exists("tsconfig.json") || deps.has("typescript"),
    hasPython:
      Boolean(pyprojectText) ||
      Boolean(requirementsText) ||
      Boolean(pipfileText) ||
      exists("setup.py"),
    hasGo: exists("go.mod"),
    hasRust: exists("Cargo.toml"),
    hasJava: exists("pom.xml") || exists("build.gradle") || exists("build.gradle.kts"),
    hasRuby: exists("Gemfile"),

    // Frameworks
    hasNext:
      exists("next.config.ts") ||
      exists("next.config.js") ||
      exists("next.config.mjs") ||
      deps.has("next"),
    hasReact: deps.has("react"),

    // Linting
    hasEslint:
      exists("eslint.config.js") ||
      exists("eslint.config.ts") ||
      exists("eslint.config.mjs") ||
      exists(".eslintrc.js") ||
      exists(".eslintrc.json") ||
      exists(".eslintrc.yml") ||
      exists(".eslintrc.yaml") ||
      deps.has("eslint"),
    hasBiome: exists("biome.json") || exists("biome.jsonc") || deps.has("@biomejs/biome"),
    hasRuff,
    hasPrettier:
      exists("prettier.config.js") ||
      exists("prettier.config.ts") ||
      exists("prettier.config.mjs") ||
      exists(".prettierrc") ||
      exists(".prettierrc.json") ||
      deps.has("prettier"),

    // Testing
    hasVitest: deps.has("vitest") || Boolean(scripts["test"]?.includes("vitest")),
    hasJest: deps.has("jest") || Boolean(scripts["test"]?.includes("jest")),
    hasPytest,

    // DB
    hasPrisma: exists("prisma/schema.prisma") || deps.has("@prisma/client"),
    hasDrizzle: deps.has("drizzle-orm"),
    hasMigrations: exists("migrations") || exists("db/migrations") || exists("database/migrations"),
    hasAlembic,

    // Infra
    hasDocker,
    hasTerraform,
    hasKubernetes: exists("k8s") || exists("kubernetes") || exists("helm"),

    // API
    hasOpenApi:
      exists("openapi.yaml") ||
      exists("openapi.yml") ||
      exists("openapi.json") ||
      exists("api/openapi.yaml"),

    // CI
    hasGithubActions: exists(".github/workflows"),

    // Release tooling — gates the `changelog-update` suggest template,
    // since projects using changesets get release notes from .changeset
    // files automatically and don't want a manual-CHANGELOG-entry check.
    hasChangesets: exists(".changeset/config.json"),

    packageManager,
    scripts,
    deps,
  };
}
