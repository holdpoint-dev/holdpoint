import type { HoldpointConfig } from "@holdpoint/types";

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
 * Generate .claude/settings.json content from a HoldpointConfig.
 *
 * PostToolUse hook: runs `holdpoint check --staged` after every tool use.
 * Stop hook: blocks Claude Code from stopping if checks haven't passed.
 *
 * Design note: `_config` is intentionally unused. The generated settings.json
 * delegates all check logic to the installed CLI at runtime (`npx holdpoint@latest
 * check --staged`). This means the generated file is identical for every project,
 * trading per-project transparency for simplicity — the CLI always reads the
 * current checks.yaml, so changes to checks never require re-running `holdpoint update`.
 */
export function buildEngine(_config: HoldpointConfig): ClaudeSettings {
  return {
    hooks: {
      PostToolUse: [
        {
          matcher: ".*",
          hooks: [
            {
              type: "command",
              // holdpoint check exits 1 on failure → Claude Code will surface the error
              command: "npx holdpoint@latest check --staged 2>&1 || true",
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
              command: "npx holdpoint@latest check --staged",
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
export function buildEngineJson(config: HoldpointConfig): string {
  return JSON.stringify(buildEngine(config), null, 2) + "\n";
}
