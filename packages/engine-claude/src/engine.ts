import type { HoldpointConfig } from "@holdpoint/types";

export interface ClaudeSettings {
  hooks: {
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
 * Stop hook: blocks Claude Code from stopping if checks haven't passed.
 *
 * The command defaults to `npx holdpoint@alpha check --staged` for all consumer
 * projects. Set `engines.claude.stop_command` in checks.yaml to override — useful
 * when the project IS the holdpoint repo and should invoke the local CLI instead.
 */
export function buildEngine(config: HoldpointConfig): ClaudeSettings {
  const stopCommand = config.engines?.claude?.stop_command ?? "npx holdpoint@alpha check --staged";
  return {
    hooks: {
      Stop: [
        {
          matcher: ".*",
          hooks: [
            {
              type: "command",
              command: stopCommand,
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
