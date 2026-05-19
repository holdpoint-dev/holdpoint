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
  it("returns an object with only a Stop hook (no PostToolUse)", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.Stop).toBeDefined();
    expect((result.hooks as Record<string, unknown>).PostToolUse).toBeUndefined();
  });

  it("Stop uses wildcard matcher", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.Stop[0].matcher).toBe(".*");
  });

  it("Stop command defaults to npx holdpoint@alpha check --staged", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    const cmd = result.hooks.Stop[0].hooks[0].command;
    expect(cmd).toBe("npx holdpoint@alpha check --staged");
  });

  it("Stop command exits non-zero on failure (no || true)", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    const cmd = result.hooks.Stop[0].hooks[0].command;
    expect(cmd).not.toMatch(/\|\|\s*true/);
  });

  it("Stop hook type is 'command'", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.Stop[0].hooks[0].type).toBe("command");
  });

  it("uses engines.claude.stop_command override when set", () => {
    const config: HoldpointConfig = {
      ...MINIMAL_CONFIG,
      engines: { claude: { stop_command: "holdpoint check --staged" } },
    };
    const cmd = buildEngine(config).hooks.Stop[0].hooks[0].command;
    expect(cmd).toBe("holdpoint check --staged");
  });

  it("ignores checks contents — command comes from engines config, not checks", () => {
    const configA = buildEngine(MINIMAL_CONFIG);
    const configB = buildEngine({ ...MINIMAL_CONFIG, checks: [] });
    expect(configA).toEqual(configB);
  });
});

describe("buildEngineJson", () => {
  it("returns valid JSON", () => {
    const json = buildEngineJson(MINIMAL_CONFIG);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("serialised JSON has Stop array and no PostToolUse", () => {
    const json = buildEngineJson(MINIMAL_CONFIG);
    const parsed = JSON.parse(json);
    const direct = buildEngine(MINIMAL_CONFIG);
    expect(parsed.hooks.Stop).toHaveLength(direct.hooks.Stop.length);
    expect(parsed.hooks.PostToolUse).toBeUndefined();
  });

  it("ends with a newline (safe for file writing)", () => {
    const json = buildEngineJson(MINIMAL_CONFIG);
    expect(json.endsWith("\n")).toBe(true);
  });

  it("Stop is an array in the JSON output", () => {
    const parsed = JSON.parse(buildEngineJson(MINIMAL_CONFIG));
    expect(Array.isArray(parsed.hooks.Stop)).toBe(true);
  });
});
