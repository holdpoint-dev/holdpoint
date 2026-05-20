import { describe, it, expect } from "vitest";
import { buildEngine, buildEngineJson } from "../engine.js";
import type { HoldpointConfig } from "@holdpoint/types";

const MINIMAL_CONFIG: HoldpointConfig = {
  version: 1,
  context: { guides: {} },
  conditions: [],
  checks: [
    { id: "lint", label: "Lint", cmd: "pnpm lint" },
    { id: "review", label: "Peer review", prompt: "Verify edge cases" },
  ],
};

describe("buildEngine", () => {
  it("emits live tool hooks plus TaskCompleted and Stop gates", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.PreToolUse).toBeDefined();
    expect(result.hooks.PostToolUse).toBeDefined();
    expect(result.hooks.TaskCompleted).toBeDefined();
    expect(result.hooks.Stop).toBeDefined();
  });

  it("TaskCompleted is the primary gate — fires inside the agentic loop", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.TaskCompleted[0].hooks[0].type).toBe("command");
  });

  it("both hooks run the same command", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.TaskCompleted[0].hooks[1].command).toBe(
      result.hooks.Stop[0].hooks[1].command,
    );
  });

  it("defaults to node_modules/.bin/holdpoint check --staged", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.TaskCompleted[0].hooks[1].command).toBe(
      "node_modules/.bin/holdpoint check --staged",
    );
  });

  it("uses engines.claude.stop_command override when set", () => {
    const config: HoldpointConfig = {
      ...MINIMAL_CONFIG,
      engines: { claude: { stop_command: "holdpoint check --staged" } },
    };
    const result = buildEngine(config);
    expect(result.hooks.TaskCompleted[0].hooks[1].command).toBe("holdpoint check --staged");
    expect(result.hooks.Stop[0].hooks[1].command).toBe("holdpoint check --staged");
  });

  it("does not exit non-zero silently (no || true)", () => {
    const cmd = buildEngine(MINIMAL_CONFIG).hooks.TaskCompleted[0].hooks[1].command;
    expect(cmd).not.toMatch(/\|\|\s*true/);
  });

  it("adds non-blocking live event hooks for PreToolUse and PostToolUse", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.PreToolUse[0].hooks[0].command).toContain(
      "holdpoint event --engine claude --from-hook",
    );
    expect(result.hooks.PostToolUse[0].hooks[0].command).toContain(
      "holdpoint event --engine claude --from-hook",
    );
    expect(result.hooks.PreToolUse[0].hooks[0].command).toMatch(/\|\|\s*true/);
  });

  it("uses engines.claude.live_command override when set", () => {
    const config: HoldpointConfig = {
      ...MINIMAL_CONFIG,
      engines: {
        claude: {
          live_command: "holdpoint event --engine claude --from-hook",
        },
      },
    };
    const result = buildEngine(config);
    expect(result.hooks.PreToolUse[0].hooks[0].command).toContain(
      "holdpoint event --engine claude --from-hook",
    );
  });

  it("ignores checks contents — command comes from engines config, not checks list", () => {
    const configA = buildEngine(MINIMAL_CONFIG);
    const configB = buildEngine({ ...MINIMAL_CONFIG, checks: [] });
    expect(configA).toEqual(configB);
  });
});

describe("buildEngineJson", () => {
  it("returns valid JSON", () => {
    expect(() => JSON.parse(buildEngineJson(MINIMAL_CONFIG))).not.toThrow();
  });

  it("serialised JSON has both TaskCompleted and Stop arrays", () => {
    const parsed = JSON.parse(buildEngineJson(MINIMAL_CONFIG));
    expect(Array.isArray(parsed.hooks.PreToolUse)).toBe(true);
    expect(Array.isArray(parsed.hooks.PostToolUse)).toBe(true);
    expect(Array.isArray(parsed.hooks.TaskCompleted)).toBe(true);
    expect(Array.isArray(parsed.hooks.Stop)).toBe(true);
  });

  it("ends with a newline (safe for file writing)", () => {
    expect(buildEngineJson(MINIMAL_CONFIG).endsWith("\n")).toBe(true);
  });
});
