import { describe, it, expect } from "vitest";
import { buildHookJson, buildCheckScript, buildConfigJson, buildEngine } from "../engine.js";
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

describe("buildHookJson", () => {
  it("returns valid JSON", () => {
    const json = buildHookJson(MINIMAL_CONFIG);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("root version is 1", () => {
    const parsed = JSON.parse(buildHookJson(MINIMAL_CONFIG));
    expect(parsed.version).toBe(1);
  });

  it("does NOT include preToolUse hook (task_complete interception is handled by the SDK extension)", () => {
    const parsed = JSON.parse(buildHookJson(MINIMAL_CONFIG));
    expect(parsed.hooks.preToolUse).toBeUndefined();
  });

  it("omits sessionStart hook when no session_context_files", () => {
    const parsed = JSON.parse(buildHookJson(MINIMAL_CONFIG));
    expect(parsed.hooks.sessionStart).toBeUndefined();
  });

  it("includes sessionStart hook when session_context_files are configured", () => {
    const config: HoldpointConfig = {
      ...MINIMAL_CONFIG,
      session_context_files: ["MASTER_PROMPT.md"],
    };
    const parsed = JSON.parse(buildHookJson(config));
    expect(parsed.hooks.sessionStart).toBeDefined();
    expect(parsed.hooks.sessionStart[0].bash).toMatch(/holdpoint-check/);
  });

  it("works without any config argument", () => {
    const json = buildHookJson();
    const parsed = JSON.parse(json);
    expect(parsed.hooks.preToolUse).toBeUndefined();
    expect(parsed.hooks.sessionStart).toBeUndefined();
  });

  it("includes AUTO-GENERATED comment", () => {
    const parsed = JSON.parse(buildHookJson(MINIMAL_CONFIG));
    expect(parsed["//"]).toMatch(/AUTO-GENERATED/);
  });
});

describe("buildCheckScript", () => {
  it("returns a string", () => {
    expect(typeof buildCheckScript(MINIMAL_CONFIG)).toBe("string");
  });

  it("starts with a Node shebang", () => {
    const script = buildCheckScript(MINIMAL_CONFIG);
    expect(script.trimStart()).toMatch(/^#!\/usr\/bin\/env node/);
  });

  it("contains task_complete matcher reference", () => {
    const script = buildCheckScript(MINIMAL_CONFIG);
    expect(script).toContain("task_complete");
  });

  it("contains deny logic for failed checks", () => {
    const script = buildCheckScript(MINIMAL_CONFIG);
    expect(script).toContain("denyTaskComplete");
  });

  it("contains the run logic and references checks.yaml", () => {
    const script = buildCheckScript(MINIMAL_CONFIG);
    expect(script.length).toBeGreaterThan(100);
    expect(script).toContain("checks.yaml");
  });
});

describe("buildConfigJson", () => {
  it("returns valid JSON", () => {
    const json = buildConfigJson(MINIMAL_CONFIG);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("includes AUTO-GENERATED comment field", () => {
    const parsed = JSON.parse(buildConfigJson(MINIMAL_CONFIG));
    expect(parsed["//"]).toMatch(/AUTO-GENERATED/);
  });

  it("embeds the version from the config", () => {
    const parsed = JSON.parse(buildConfigJson(MINIMAL_CONFIG));
    expect(parsed.version).toBe(1);
  });

  it("embeds all checks", () => {
    const parsed = JSON.parse(buildConfigJson(MINIMAL_CONFIG));
    expect(parsed.checks).toHaveLength(2);
    expect(parsed.checks[0].id).toBe("lint");
    expect(parsed.checks[1].id).toBe("review");
  });

  it("ends with a newline (safe for file writing)", () => {
    const json = buildConfigJson(MINIMAL_CONFIG);
    expect(json.endsWith("\n")).toBe(true);
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

  it("intercepts task_complete via onPreToolUse", () => {
    const src = buildEngine(MINIMAL_CONFIG);
    expect(src).toContain("onPreToolUse");
    expect(src).toContain("task_complete");
  });

  it("returns permissionDecision deny on failure", () => {
    expect(buildEngine(MINIMAL_CONFIG)).toContain("permissionDecision");
    expect(buildEngine(MINIMAL_CONFIG)).toContain("deny");
  });

  it("does NOT use the old beforeTaskComplete export", () => {
    expect(buildEngine(MINIMAL_CONFIG)).not.toContain("beforeTaskComplete");
  });

  it("does NOT include a shebang line", () => {
    expect(buildEngine(MINIMAL_CONFIG).trimStart()).not.toMatch(/^#!\/usr\/bin\/env/);
  });
});
