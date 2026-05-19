import type { HoldpointConfig } from "@holdpoint/types";

export interface ClaudeSettings {
  hooks: {
    // Fires inside the agentic loop when a task is being marked complete.
    // Non-zero exit blocks task completion — Claude stays in loop to fix issues.
    // Equivalent to Copilot's task_complete interception.
    TaskCompleted: HookEntry[];
    // Fires at the end of every turn (each response). Belt-and-suspenders for
    // sessions where the agent does not use task management (investigative,
    // quick-fix sessions without TaskCreate/TaskCompleted).
    Stop: HookEntry[];
  };
}

interface HookEntry {
  hooks: HookCommand[];
}

interface HookCommand {
  type: "command";
  command: string;
}

/**
 * Generate .claude/settings.json content from a HoldpointConfig.
 *
 * Uses two hook points:
 * - TaskCompleted: primary gate, fires inside the agentic loop when a task is
 *   being marked complete. Blocks completion until checks pass. Claude remains
 *   in context and can iterate to fix failures — equivalent to Copilot's
 *   task_complete interception.
 * - Stop: secondary gate, fires at the end of every turn. Catches sessions
 *   that don't use task management.
 *
 * The command defaults to `node_modules/.bin/holdpoint check --staged`. Set
 * `engines.claude.stop_command` in checks.yaml to override.
 */
export function buildEngine(config: HoldpointConfig): ClaudeSettings {
  const stopCommand =
    config.engines?.claude?.stop_command ?? "node_modules/.bin/holdpoint check --staged";
  const hook: HookCommand = { type: "command", command: stopCommand };
  return {
    hooks: {
      TaskCompleted: [{ hooks: [hook] }],
      Stop: [{ hooks: [hook] }],
    },
  };
}

/**
 * Serialize the Claude settings to a JSON string.
 */
export function buildEngineJson(config: HoldpointConfig): string {
  return JSON.stringify(buildEngine(config), null, 2) + "\n";
}
