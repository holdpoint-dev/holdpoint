import { existsSync, readFileSync } from "node:fs";
import type { AgentType, StackType } from "@holdpoint/types";

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
  if (existsSync(".github/hooks/holdpoint.json")) agents.push("copilot");
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

export function detectStack(): StackType {
  const hasNext =
    existsSync("next.config.ts") || existsSync("next.config.js") || existsSync("next.config.mjs");
  const hasTsConfig = existsSync("tsconfig.json");
  const hasPyproject =
    existsSync("pyproject.toml") || existsSync("requirements.txt") || existsSync("setup.py");
  const hasPrisma = existsSync("prisma/schema.prisma");
  const hasApi = existsSync("server") || existsSync("api") || existsSync("backend");
  const hasGoMod = existsSync("go.mod");

  if (hasNext && (hasPrisma || hasApi)) return "fullstack";
  if (hasNext) return "nextjs";
  if (hasTsConfig) return "typescript";
  if (hasPyproject) return "python";
  if (hasGoMod) return "go";
  return "unknown";
}
