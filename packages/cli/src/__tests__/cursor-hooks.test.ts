import { describe, expect, it } from "vitest";
import { mergeCursorHooks } from "../cursor-hooks.js";

describe("mergeCursorHooks", () => {
  it("preserves user hooks and appends generated Holdpoint hooks", () => {
    const merged = mergeCursorHooks(
      {
        version: 1,
        hooks: {
          stop: [{ command: "node ./user-stop.mjs" }],
        },
      },
      {
        version: 1,
        hooks: {
          stop: [{ command: "node .cursor/holdpoint-hook.mjs # HOLDPOINT_MANAGED=cursor" }],
          beforeShellExecution: [
            { command: "node .cursor/holdpoint-hook.mjs # HOLDPOINT_MANAGED=cursor" },
          ],
        },
      },
    );

    expect(merged.hooks).toEqual({
      stop: [
        { command: "node ./user-stop.mjs" },
        { command: "node .cursor/holdpoint-hook.mjs # HOLDPOINT_MANAGED=cursor" },
      ],
      beforeShellExecution: [
        { command: "node .cursor/holdpoint-hook.mjs # HOLDPOINT_MANAGED=cursor" },
      ],
    });
  });

  it("replaces previous Holdpoint-managed hooks on update", () => {
    const merged = mergeCursorHooks(
      {
        version: 1,
        hooks: {
          stop: [
            { command: "node .cursor/holdpoint-hook.mjs # HOLDPOINT_MANAGED=cursor" },
            { command: "node ./user-stop.mjs" },
          ],
        },
      },
      {
        version: 1,
        hooks: {
          stop: [
            {
              command: "node .cursor/holdpoint-hook.mjs # HOLDPOINT_MANAGED=cursor",
              timeout: 600,
            },
          ],
        },
      },
    );

    expect(merged.hooks).toEqual({
      stop: [
        { command: "node ./user-stop.mjs" },
        {
          command: "node .cursor/holdpoint-hook.mjs # HOLDPOINT_MANAGED=cursor",
          timeout: 600,
        },
      ],
    });
  });
});
