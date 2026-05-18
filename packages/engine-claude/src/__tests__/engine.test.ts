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
  it("returns an object with PostToolUse and Stop hooks", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.PostToolUse).toBeDefined();
    expect(result.hooks.Stop).toBeDefined();
  });

  it("PostToolUse uses wildcard matcher", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.PostToolUse[0].matcher).toBe(".*");
  });

  it("Stop uses wildcard matcher", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.Stop[0].matcher).toBe(".*");
  });

  it("PostToolUse command references holdpoint check", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    const cmd = result.hooks.PostToolUse[0].hooks[0].command;
    expect(cmd).toContain("holdpoint");
    expect(cmd).toContain("check");
  });

  it("Stop command references holdpoint check", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    const cmd = result.hooks.Stop[0].hooks[0].command;
    expect(cmd).toContain("holdpoint");
    expect(cmd).toContain("check");
  });

  it("Stop command exits non-zero on failure (no || true)", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    const cmd = result.hooks.Stop[0].hooks[0].command;
    // The Stop hook must NOT have || true — it needs to block
    expect(cmd).not.toMatch(/\|\|\s*true/);
  });

  it("PostToolUse hook type is 'command'", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.PostToolUse[0].hooks[0].type).toBe("command");
  });

  it("returns identical result regardless of check contents (config-agnostic)", () => {
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

  it("serialised JSON matches buildEngine() output", () => {
    const json = buildEngineJson(MINIMAL_CONFIG);
    const parsed = JSON.parse(json);
    const direct = buildEngine(MINIMAL_CONFIG);
    expect(parsed.hooks.PostToolUse).toHaveLength(direct.hooks.PostToolUse.length);
    expect(parsed.hooks.Stop).toHaveLength(direct.hooks.Stop.length);
  });

  it("ends with a newline (safe for file writing)", () => {
    const json = buildEngineJson(MINIMAL_CONFIG);
    expect(json.endsWith("\n")).toBe(true);
  });

  it("PostToolUse is an array in the JSON output", () => {
    const parsed = JSON.parse(buildEngineJson(MINIMAL_CONFIG));
    expect(Array.isArray(parsed.hooks.PostToolUse)).toBe(true);
  });
});
