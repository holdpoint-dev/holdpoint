import { describe, it, expect } from "vitest";
import { buildCheckScript, buildEngine, buildHooksJson } from "../engine.js";
import type { HoldpointConfig } from "@holdpoint/types";

const FULL_CONFIG: HoldpointConfig = {
  version: 1,
  context: { guides: {} },
  conditions: [],
  checks: [
    { id: "lint", label: "Lint checks", cmd: "pnpm lint" },
    { id: "types", label: "Type check", cmd: "pnpm typecheck" },
    { id: "review", label: "Peer review", prompt: "Verify all edge cases are handled" },
  ],
};

const EMPTY_CONFIG: HoldpointConfig = {
  version: 1,
  context: { guides: {} },
  conditions: [],
  checks: [],
};

describe("buildEngine (Cursor adapter)", () => {
  it("returns a string", () => {
    expect(typeof buildEngine(FULL_CONFIG)).toBe("string");
  });

  it("includes the Holdpoint Rules header marker", () => {
    const output = buildEngine(FULL_CONFIG);
    expect(output).toContain("Holdpoint Rules");
  });

  it("starts directly with the marker so updates are idempotent", () => {
    expect(buildEngine(FULL_CONFIG)).toMatch(/^# ─── Holdpoint Rules/);
  });

  it("includes AUTO-GENERATED comment so users know not to edit it", () => {
    const output = buildEngine(FULL_CONFIG);
    expect(output).toContain("auto-generated");
  });

  it("lists each cmd check label", () => {
    const output = buildEngine(FULL_CONFIG);
    expect(output).toContain("Lint checks");
    expect(output).toContain("Type check");
  });

  it("embeds the cmd for each deterministic check", () => {
    const output = buildEngine(FULL_CONFIG);
    expect(output).toContain("pnpm lint");
    expect(output).toContain("pnpm typecheck");
  });

  it("lists prompt checks separately", () => {
    const output = buildEngine(FULL_CONFIG);
    expect(output).toContain("Peer review");
    expect(output).toContain("Verify all edge cases are handled");
  });

  it("instructs the agent to run holdpoint check before completing", () => {
    const output = buildEngine(FULL_CONFIG);
    expect(output.toLowerCase()).toContain("holdpoint check");
  });

  it("handles empty checks gracefully (no crash)", () => {
    expect(() => buildEngine(EMPTY_CONFIG)).not.toThrow();
  });

  it("shows fallback text for empty cmd checks", () => {
    const output = buildEngine(EMPTY_CONFIG);
    expect(output).toContain("(no tasks configured)");
  });

  it("shows fallback text for empty prompt checks", () => {
    const output = buildEngine(EMPTY_CONFIG);
    expect(output).toContain("(no prompt checks configured)");
  });

  it("applies the when filter to cmd checks", () => {
    const config: HoldpointConfig = {
      ...FULL_CONFIG,
      checks: [{ id: "lint", label: "Lint", cmd: "pnpm lint", when: ["frontend"] }],
    };
    const output = buildEngine(config);
    expect(output).toContain("[frontend]");
  });

  it("applies the when filter to prompt checks", () => {
    const config: HoldpointConfig = {
      ...FULL_CONFIG,
      checks: [{ id: "review", label: "Review", prompt: "Check it", when: ["backend"] }],
    };
    const output = buildEngine(config);
    expect(output).toContain("[backend]");
  });

  it("includes end-of-block marker", () => {
    const output = buildEngine(FULL_CONFIG);
    expect(output).toContain("End Holdpoint Rules");
  });

  it("generates native Cursor hooks for project enforcement", () => {
    const hooks = JSON.parse(buildHooksJson(FULL_CONFIG));
    expect(hooks).toMatchObject({ version: 1 });
    expect(hooks.hooks.stop[0]).toMatchObject({
      command: expect.stringContaining(".cursor/holdpoint-hook.mjs"),
      loop_limit: 5,
      timeout: 600,
    });
    expect(hooks.hooks.beforeShellExecution[0].command).toContain("HOLDPOINT_MANAGED=cursor");
    expect(hooks.hooks.preToolUse[0].matcher).toContain("Shell");
  });

  it("adds sessionStart only when session context files are configured", () => {
    expect(JSON.parse(buildHooksJson(FULL_CONFIG)).hooks.sessionStart).toBeUndefined();
    const hooks = JSON.parse(
      buildHooksJson({ ...FULL_CONFIG, session_context_files: ["MASTER_PROMPT.md"] }),
    );
    expect(hooks.hooks.sessionStart[0].command).toContain(".cursor/holdpoint-hook.mjs");
  });

  it("generates a hook script that uses Cursor-native stop followups", () => {
    const output = buildCheckScript();
    expect(output).toContain("hook_event_name");
    expect(output).toContain("followup_message");
    expect(output).toContain("additional_context");
    expect(output).toContain("holdpoint event --engine cursor --from-hook");
    expect(output).toContain("node_modules/.bin/holdpoint check --staged");
  });

  it("adds sessionStart when a check targets session_start", () => {
    const hooks = JSON.parse(
      buildHooksJson({
        ...FULL_CONFIG,
        checks: [{ id: "seed", label: "Seed", on: "session_start", inject: { text: "hi" } }],
      }),
    );
    expect(hooks.hooks.sessionStart).toBeDefined();
  });

  it("gates before_tool via a preToolUse permission deny", () => {
    const output = buildCheckScript();
    expect(output).toContain("--hook before_tool");
    expect(output).toContain('permission: "deny"');
  });

  it("does not inject context at beforeSubmitPrompt (Cursor cannot)", () => {
    const output = buildCheckScript();
    // The beforeSubmitPrompt branch must only continue, never carry context.
    const branch = output.slice(output.indexOf('name === "beforeSubmitPrompt"'));
    expect(branch).toContain("{ continue: true }");
    expect(branch).not.toContain("additional_context: datetimeContext");
  });
});
