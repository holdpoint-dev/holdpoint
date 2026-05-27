import { describe, expect, it } from "vitest";
import { mergeClaudeSettings } from "../claude-settings.js";

describe("mergeClaudeSettings", () => {
  it("preserves user hooks while appending generated Holdpoint hooks", () => {
    const merged = mergeClaudeSettings(
      {
        theme: "dark",
        hooks: {
          PreToolUse: [
            {
              matcher: "Bash",
              hooks: [{ type: "command", command: "echo user hook" }],
            },
          ],
        },
      },
      {
        hooks: {
          PreToolUse: [
            {
              hooks: [
                {
                  type: "command",
                  command:
                    "HOLDPOINT_MANAGED=claude HOLDPOINT_HOOK=live node_modules/.bin/holdpoint event --engine claude --from-hook || true",
                },
              ],
            },
          ],
          Stop: [
            {
              hooks: [
                {
                  type: "command",
                  command:
                    "HOLDPOINT_MANAGED=claude HOLDPOINT_HOOK=check node -e 'process.exit(0)'",
                },
              ],
            },
          ],
        },
      },
    );

    expect(merged.theme).toBe("dark");
    expect((merged.hooks as Record<string, unknown[]>).PreToolUse).toHaveLength(2);
    expect((merged.hooks as Record<string, unknown[]>).Stop).toHaveLength(1);
  });

  it("removes prior Holdpoint-managed hooks on repeated updates", () => {
    const merged = mergeClaudeSettings(
      {
        hooks: {
          Stop: [
            {
              hooks: [
                {
                  type: "command",
                  command: "HOLDPOINT_MANAGED=claude HOLDPOINT_HOOK=check old",
                },
              ],
            },
            {
              hooks: [{ type: "command", command: "echo user stop hook" }],
            },
          ],
        },
      },
      {
        hooks: {
          Stop: [
            {
              hooks: [
                {
                  type: "command",
                  command: "HOLDPOINT_MANAGED=claude HOLDPOINT_HOOK=check new",
                },
              ],
            },
          ],
        },
      },
    );

    expect((merged.hooks as Record<string, unknown[]>).Stop).toEqual([
      {
        hooks: [{ type: "command", command: "echo user stop hook" }],
      },
      {
        hooks: [
          {
            type: "command",
            command: "HOLDPOINT_MANAGED=claude HOLDPOINT_HOOK=check new",
          },
        ],
      },
    ]);
  });

  it("removes legacy unmarked Holdpoint hooks during migration", () => {
    const merged = mergeClaudeSettings(
      {
        hooks: {
          PreToolUse: [
            {
              matcher: "*",
              hooks: [
                {
                  type: "command",
                  command: "node_modules/.bin/holdpoint event --engine claude --from-hook || true",
                },
              ],
            },
            {
              matcher: "Bash",
              hooks: [{ type: "command", command: "echo user hook" }],
            },
          ],
          Stop: [
            {
              hooks: [
                {
                  type: "command",
                  command: "node_modules/.bin/holdpoint event --engine claude --from-hook || true",
                },
                {
                  type: "command",
                  command: "node_modules/.bin/holdpoint check --staged",
                },
              ],
            },
          ],
        },
      },
      {
        hooks: {
          PreToolUse: [
            {
              hooks: [
                {
                  type: "command",
                  command: "HOLDPOINT_MANAGED=claude HOLDPOINT_HOOK=live new",
                },
              ],
            },
          ],
          Stop: [
            {
              hooks: [
                {
                  type: "command",
                  command: "HOLDPOINT_MANAGED=claude HOLDPOINT_HOOK=check new",
                },
              ],
            },
          ],
        },
      },
    );

    expect((merged.hooks as Record<string, unknown[]>).PreToolUse).toEqual([
      {
        matcher: "Bash",
        hooks: [{ type: "command", command: "echo user hook" }],
      },
      {
        hooks: [
          {
            type: "command",
            command: "HOLDPOINT_MANAGED=claude HOLDPOINT_HOOK=live new",
          },
        ],
      },
    ]);
    expect((merged.hooks as Record<string, unknown[]>).Stop).toEqual([
      {
        hooks: [
          {
            type: "command",
            command: "HOLDPOINT_MANAGED=claude HOLDPOINT_HOOK=check new",
          },
        ],
      },
    ]);
  });
});
