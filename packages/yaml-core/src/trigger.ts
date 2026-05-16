import { minimatch } from "minimatch";

const SCOPE_PATTERNS: Record<string, string[]> = {
  frontend: [
    "**/*.tsx",
    "**/*.jsx",
    "**/*.css",
    "**/*.scss",
    "**/tailwind.config.*",
    "**/postcss.config.*",
    "apps/builder/**",
    "apps/web/**",
  ],
  backend: [
    "**/api/**",
    "**/server/**",
    "**/routes/**",
    "**/controllers/**",
    "**/middleware/**",
    "packages/*/src/**",
  ],
  prisma: ["**/prisma/**", "**/*.prisma"],
  socket: ["**/socket/**", "**/ws/**", "**/websocket/**"],
  visual: ["**/*.stories.tsx", "**/*.stories.ts", "**/__screenshots__/**", "**/*.snap"],
};

/**
 * Returns true if any of the changedFiles match the given when filter.
 * - `undefined` → always matches (no filter)
 * - named scope ("frontend", "backend", "prisma", "socket", "visual") → glob pattern match
 * - any other string → treated as a regex
 */
export function matchesWhen(when: string | undefined, changedFiles: string[]): boolean {
  if (!when) return true;
  // "__all__" sentinel value means no staged files — run all checks unconditionally
  if (changedFiles.includes("__all__")) return true;

  if (when in SCOPE_PATTERNS) {
    const globs = SCOPE_PATTERNS[when]!;
    return changedFiles.some((file) => globs.some((glob) => minimatch(file, glob)));
  }

  // Custom regex
  const re = new RegExp(when);
  return changedFiles.some((f) => re.test(f));
}
