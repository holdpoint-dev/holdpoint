import { existsSync, readFileSync } from "node:fs";
import type { AgentType } from "@holdpoint/types";

export type PackageManager = "pnpm" | "yarn" | "npm";

/** Detect which package manager owns the current project by checking lock files. */
export function detectPackageManager(): PackageManager {
  if (existsSync("pnpm-lock.yaml")) return "pnpm";
  if (existsSync("yarn.lock")) return "yarn";
  return "npm";
}

/** @deprecated Use detectInstalledAgents() — single-agent detection is no longer the default. */
export function detectAgent(): AgentType {
  if (existsSync(".github/extensions")) return "copilot";
  if (existsSync(".claude")) return "claude";
  if (existsSync(".cursorrules")) return "cursor";
  if (existsSync(".codex")) return "codex";
  return "unknown";
}

/**
 * Returns every agent whose Holdpoint engine files are already present in the
 * current working directory.  Used by `holdpoint update` so it regenerates only
 * the engines that were previously installed.
 */
export function detectInstalledAgents(): AgentType[] {
  const agents: AgentType[] = [];
  if (existsSync(".github/extensions/holdpoint/extension.mjs")) agents.push("copilot");
  if (existsSync(".claude/settings.json")) agents.push("claude");
  if (existsSync(".cursorrules")) {
    try {
      if (readFileSync(".cursorrules", "utf8").includes("Holdpoint Rules")) {
        agents.push("cursor");
      }
    } catch {
      /* ignore unreadable file */
    }
  }
  // Detect Codex by the generated check script (more specific than .codex/ existence)
  if (existsSync(".codex/holdpoint-check.mjs")) agents.push("codex");
  return agents;
}
