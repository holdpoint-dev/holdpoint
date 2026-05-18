import { execSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { CheckDef, SentinelConfig } from "@sentinel/types";

export interface StaleCheck {
  check: CheckDef;
  reason: string;
  /** Path to use in a file_exists condition, if it can be inferred from the when: regex */
  suggestedConditionPath?: string;
}

/** Named scopes handled by matchesWhen() — these are never "stale" (intentionally broad) */
const NAMED_SCOPES = new Set([
  "frontend",
  "backend",
  "socket",
  "visual",
  "python",
  "go",
  "rust",
  "java",
  "ruby",
  "database",
  "prisma",
  "testing",
  "infra",
  "ci",
  "docs",
]);

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
]);

function walkDir(dir: string, root: string, depth: number, maxDepth: number): string[] {
  if (depth > maxDepth) return [];
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  const results: string[] = [];
  for (const entry of entries) {
    if (WALK_IGNORED.has(entry) || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const rel = full.slice(root.length + 1);
    results.push(rel);
    // Try to recurse (will just return [] if it's a file, not a dir)
    const children = walkDir(full, root, depth + 1, maxDepth);
    results.push(...children);
  }
  return results;
}

/**
 * Returns a list of all files in the repo (relative paths from cwd).
 * Uses `git ls-files` when available; falls back to directory walk.
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
  return walkDir(cwd, cwd, 0, 6);
}

/**
 * Try to extract a simple path hint from a regex pattern, for use as a
 * `file_exists` condition path.
 * e.g. "^prisma/" → "prisma", "^checks\\.yaml$" → "checks.yaml"
 */
function extractPathFromRegex(pattern: string): string | undefined {
  const cleaned = pattern
    .replace(/^\^/, "")
    .replace(/\$$/, "")
    .replace(/\\\./g, ".")
    .replace(/\(\?:/g, "")
    .replace(/\)/g, "")
    .replace(/[|*+?[\]{}()]/g, "");
  const candidate = cleaned.replace(/\/$/, "").trim();
  if (candidate.length > 0 && /^[\w\-./]+$/.test(candidate)) return candidate;
  return undefined;
}

/**
 * Detect checks whose `when:` regex pattern matches zero files in the repo.
 * Named scope whens (frontend, backend, etc.) are never flagged as stale.
 * Checks that already have a conditionId are skipped (already guarded).
 */
export function detectStaleChecks(config: SentinelConfig, repoFiles: string[]): StaleCheck[] {
  const stale: StaleCheck[] = [];

  for (const check of config.checks) {
    if (!check.when) continue;
    if (NAMED_SCOPES.has(check.when)) continue;
    if (check.conditionId) continue; // already guarded by a condition

    let re: RegExp;
    try {
      re = new RegExp(check.when);
    } catch {
      stale.push({ check, reason: `Invalid regex: '${check.when}'` });
      continue;
    }

    const matches = repoFiles.filter((f) => re.test(f));
    if (matches.length === 0) {
      const suggestedConditionPath = extractPathFromRegex(check.when);
      // Verify the suggested path doesn't actually exist either
      const pathGone =
        !suggestedConditionPath || !existsSync(join(process.cwd(), suggestedConditionPath));
      if (pathGone) {
        stale.push({
          check,
          reason: `Regex '${check.when}' matches 0 files in the repo`,
          ...(suggestedConditionPath ? { suggestedConditionPath } : {}),
        });
      }
    }
  }

  return stale;
}
