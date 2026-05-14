import type { SentinelConfig } from "@sentinel/types";

export interface ClaudeSettings {
  hooks: {
    PostToolUse: HookEntry[];
    Stop: HookEntry[];
  };
}

interface HookEntry {
  matcher: string;
  hooks: HookCommand[];
}

interface HookCommand {
  type: "command";
  command: string;
}

/**
 * Generate .claude/settings.json content from a SentinelConfig.
 *
 * PostToolUse hook: runs `sentinel check --staged` after every tool use.
 * Stop hook: blocks Claude Code from stopping if checks haven't passed.
 */
export function buildEngine(_config: SentinelConfig): ClaudeSettings {
  return {
    hooks: {
      PostToolUse: [
        {
          matcher: ".*",
          hooks: [
            {
              type: "command",
              // sentinel check exits 1 on failure → Claude Code will surface the error
              command: "npx sentinel@latest check --staged 2>&1 || true",
            },
          ],
        },
      ],
      Stop: [
        {
          matcher: ".*",
          hooks: [
            {
              type: "command",
              // Exit non-zero blocks the Stop action — agent must fix issues first
              command: "npx sentinel@latest check --staged",
            },
          ],
        },
      ],
    },
  };
}

/**
 * Serialize the Claude settings to a JSON string.
 */
export function buildEngineJson(config: SentinelConfig): string {
  return JSON.stringify(buildEngine(config), null, 2);
}
