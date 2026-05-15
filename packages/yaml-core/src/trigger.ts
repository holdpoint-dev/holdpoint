import { minimatch } from "minimatch";
import type { Trigger } from "@sentinel/types";

/**
 * Returns true if any of the changedFiles match the given trigger.
 */
export function matchesTrigger(trigger: Trigger, changedFiles: string[]): boolean {
  if (trigger.type === "always") return true;
  // "__all__" sentinel value means no staged files — run all checks unconditionally
  if (changedFiles.includes("__all__")) return true;

  const patterns: Record<string, string[]> = {
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
    visual: [
      "**/*.stories.tsx",
      "**/*.stories.ts",
      "**/__screenshots__/**",
      "**/*.snap",
    ],
  };

  if (trigger.type === "custom") {
    if (!trigger.pattern) return false;
    const re = new RegExp(trigger.pattern);
    return changedFiles.some((f) => re.test(f));
  }

  const globs = patterns[trigger.type];
  if (!globs) return false;

  return changedFiles.some((file) => globs.some((glob) => minimatch(file, glob)));
}
