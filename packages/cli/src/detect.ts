import { existsSync } from "node:fs";
import type { AgentType, StackType } from "@sentinel/types";

export function detectAgent(): AgentType {
  // Copilot CLI: check for extensions dir or copilot binary in path
  if (existsSync(".github/extensions")) return "copilot";
  // Claude Code: check for .claude dir
  if (existsSync(".claude")) return "claude";
  // Cursor: check for .cursorrules
  if (existsSync(".cursorrules")) return "cursor";
  return "unknown";
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
