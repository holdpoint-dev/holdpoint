import { describe, it, expect } from "vitest";
import { buildConfigJson, buildEngine } from "../engine.js";
import type { HoldpointConfig } from "@holdpoint/types";

const MINIMAL_CONFIG: HoldpointConfig = {
  version: 1,
  context: { guides: {} },
  conditions: [],
  checks: [
    { id: "lint", label: "Lint", cmd: "pnpm lint" },
    { id: "review", label: "Peer review", prompt: "Verify all edge cases are handled" },
  ],
};

describe("buildConfigJson", () => {
  it("returns valid JSON", () => {
    expect(() => JSON.parse(buildConfigJson(MINIMAL_CONFIG))).not.toThrow();
  });

  it("includes AUTO-GENERATED comment field", () => {
    expect(JSON.parse(buildConfigJson(MINIMAL_CONFIG))["//"]).toMatch(/AUTO-GENERATED/);
  });

  it("embeds all checks", () => {
    const parsed = JSON.parse(buildConfigJson(MINIMAL_CONFIG));
    expect(parsed.checks).toHaveLength(2);
    expect(parsed.checks[0].id).toBe("lint");
  });

  it("ends with a newline", () => {
    expect(buildConfigJson(MINIMAL_CONFIG).endsWith("\n")).toBe(true);
  });
});

describe("buildEngine", () => {
  it("returns a string", () => {
    expect(typeof buildEngine(MINIMAL_CONFIG)).toBe("string");
  });

  it("imports from @github/copilot-sdk/extension", () => {
    expect(buildEngine(MINIMAL_CONFIG)).toContain("@github/copilot-sdk/extension");
  });

  it("uses joinSession", () => {
    expect(buildEngine(MINIMAL_CONFIG)).toContain("joinSession");
  });

  it("handles onSessionStart for context injection", () => {
    const src = buildEngine(MINIMAL_CONFIG);
    expect(src).toContain("onSessionStart");
    expect(src).toContain("additionalContext");
    expect(src).toContain("session_context_files");
  });

  it("reads checks.immutable.json (pre-parsed JSON — no YAML parser needed in .mjs)", () => {
    expect(buildEngine(MINIMAL_CONFIG)).toContain("checks.immutable.json");
    expect(buildEngine(MINIMAL_CONFIG)).toContain("JSON.parse");
  });

  it("intercepts task_complete via onPreToolUse", () => {
    const src = buildEngine(MINIMAL_CONFIG);
    expect(src).toContain("onPreToolUse");
    expect(src).toContain("task_complete");
  });

  it("emits session.log progress message", () => {
    const src = buildEngine(MINIMAL_CONFIG);
    expect(src).toContain("session.log");
    expect(src).toContain("ephemeral: true");
  });

  it("returns permissionDecision deny on CLI failure", () => {
    expect(buildEngine(MINIMAL_CONFIG)).toContain("permissionDecision");
    expect(buildEngine(MINIMAL_CONFIG)).toContain("deny");
  });

  it("defaults to node_modules/.bin/holdpoint check --staged", () => {
    expect(buildEngine(MINIMAL_CONFIG)).toContain("node_modules/.bin/holdpoint check --staged");
  });

  it("uses engines.copilot.check_command override when set", () => {
    const config: HoldpointConfig = {
      ...MINIMAL_CONFIG,
      engines: { copilot: { check_command: "node_modules/.bin/holdpoint check --staged" } },
    };
    const src = buildEngine(config);
    expect(src).toContain('"node_modules/.bin/holdpoint check --staged"');
    expect(src).not.toContain("npx holdpoint@alpha");
  });

  it("does NOT inline check logic — delegates to the CLI", () => {
    const src = buildEngine(MINIMAL_CONFIG);
    expect(src).not.toContain("matchesWhen");
    expect(src).not.toContain("getStagedFiles");
  });

  it("does NOT include a shebang (not a standalone script)", () => {
    expect(buildEngine(MINIMAL_CONFIG).trimStart()).not.toMatch(/^#!\/usr\/bin\/env/);
  });

  it("ignores checks list — behaviour comes from the CLI at runtime", () => {
    expect(buildEngine(MINIMAL_CONFIG)).toBe(buildEngine({ ...MINIMAL_CONFIG, checks: [] }));
  });
});
