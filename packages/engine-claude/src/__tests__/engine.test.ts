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
  it("emits Claude lifecycle hooks plus TaskCompleted and Stop gates", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.SessionStart).toBeDefined();
    expect(result.hooks.UserPromptSubmit).toBeDefined();
    expect(result.hooks.PreToolUse).toBeDefined();
    expect(result.hooks.PostToolUse).toBeDefined();
    expect(result.hooks.PermissionRequest).toBeDefined();
    expect(result.hooks.Notification).toBeDefined();
    expect(result.hooks.PreCompact).toBeDefined();
    expect(result.hooks.TaskCompleted).toBeDefined();
    expect(result.hooks.Stop).toBeDefined();
  });

  it("TaskCompleted is the primary gate — fires inside the agentic loop", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.TaskCompleted[0].hooks[0].type).toBe("command");
  });

  it("both gate hooks run the same check wrapper", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.TaskCompleted[0].hooks[1].command).toBe(
      result.hooks.Stop[0].hooks[1].command,
    );
  });

  it("defaults to node_modules/.bin/holdpoint check --staged inside an exit-2 wrapper", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.TaskCompleted[0].hooks[1].command).toContain(
      "node_modules/.bin/holdpoint check --staged",
    );
    expect(result.hooks.TaskCompleted[0].hooks[1].command).toContain("process.exit(2)");
  });

  it("uses engines.claude.stop_command override when set", () => {
    const config: HoldpointConfig = {
      ...MINIMAL_CONFIG,
      engines: { claude: { stop_command: "holdpoint check --staged" } },
    };
    const result = buildEngine(config);
    expect(result.hooks.TaskCompleted[0].hooks[1].command).toContain("holdpoint check --staged");
    expect(result.hooks.Stop[0].hooks[1].command).toContain("holdpoint check --staged");
  });

  it("does not make the blocking check non-fatal with || true", () => {
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
    expect(result.hooks.PreToolUse[0].hooks[0].async).toBe(true);
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

  it("adds SessionStart context injection when session_context_files are configured", () => {
    const result = buildEngine({
      ...MINIMAL_CONFIG,
      session_context_files: ["MASTER_PROMPT.md"],
    });
    expect(result.hooks.SessionStart?.[0].hooks).toHaveLength(2);
    expect(result.hooks.SessionStart?.[0].hooks[1].command).toContain("additionalContext");
  });

  it("wires SessionStart context when a check targets session_start", () => {
    const result = buildEngine({
      ...MINIMAL_CONFIG,
      checks: [
        {
          id: "seed",
          label: "Seed",
          on: "session_start",
          inject: { files: ["AGENT_CONTEXT.md"] },
        },
      ],
    });
    expect(result.hooks.SessionStart?.[0].hooks).toHaveLength(2);
    expect(result.hooks.SessionStart?.[0].hooks[1].command).toContain("additionalContext");
  });

  it("wires a PreToolUse gate when a cmd check targets before_tool", () => {
    const result = buildEngine({
      ...MINIMAL_CONFIG,
      checks: [{ id: "guard", label: "Guard", on: "before_tool", cmd: "pnpm guard" }],
    });
    expect(result.hooks.PreToolUse[0].hooks).toHaveLength(2);
    expect(result.hooks.PreToolUse[0].hooks[1].command).toContain("--hook before_tool");
    expect(result.hooks.PreToolUse[0].hooks[1].command).toContain("process.exit(2)");
  });

  it("leaves PreToolUse non-blocking when no before_tool checks exist", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.PreToolUse[0].hooks).toHaveLength(1);
  });

  it("marks generated commands so CLI update can dedupe Holdpoint hooks", () => {
    const result = buildEngine(MINIMAL_CONFIG);
    expect(result.hooks.Stop[0].hooks[0].command).toContain("HOLDPOINT_MANAGED=claude");
    expect(result.hooks.Stop[0].hooks[1].command).toContain("HOLDPOINT_MANAGED=claude");
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

  it("serialised JSON has key Claude hook arrays", () => {
    const parsed = JSON.parse(buildEngineJson(MINIMAL_CONFIG));
    expect(Array.isArray(parsed.hooks.SessionStart)).toBe(true);
    expect(Array.isArray(parsed.hooks.UserPromptSubmit)).toBe(true);
    expect(Array.isArray(parsed.hooks.PreToolUse)).toBe(true);
    expect(Array.isArray(parsed.hooks.PostToolUse)).toBe(true);
    expect(Array.isArray(parsed.hooks.TaskCompleted)).toBe(true);
    expect(Array.isArray(parsed.hooks.Stop)).toBe(true);
  });

  it("ends with a newline (safe for file writing)", () => {
    expect(buildEngineJson(MINIMAL_CONFIG).endsWith("\n")).toBe(true);
  });
});
