import { describe, it, expect } from "vitest";
import { buildHooksJson, buildCheckScript, buildContextScript } from "../engine.js";
import type { HoldpointConfig } from "@holdpoint/types";

const MINIMAL_CONFIG: HoldpointConfig = {
  version: 1,
  context: { guides: {} },
  conditions: [],
  checks: [
    { id: "lint", label: "Lint", cmd: "pnpm lint" },
    { id: "review", label: "Peer review", prompt: "Verify all edge cases" },
  ],
};

const EMPTY_CONFIG: HoldpointConfig = {
  version: 1,
  context: { guides: {} },
  conditions: [],
  checks: [],
};

// ─── buildHooksJson ────────────────────────────────────────────────────────────

describe("buildHooksJson", () => {
  it("returns valid JSON", () => {
    expect(() => JSON.parse(buildHooksJson(MINIMAL_CONFIG))).not.toThrow();
  });

  it("ends with a newline (safe for file writing)", () => {
    expect(buildHooksJson(MINIMAL_CONFIG).endsWith("\n")).toBe(true);
  });

  it("contains a Stop hook array", () => {
    const parsed = JSON.parse(buildHooksJson(MINIMAL_CONFIG));
    expect(Array.isArray(parsed.hooks.Stop)).toBe(true);
    expect(parsed.hooks.Stop.length).toBeGreaterThan(0);
  });

  it("registers every supported Codex command hook event", () => {
    const config: HoldpointConfig = {
      ...MINIMAL_CONFIG,
      session_context_files: ["MASTER_PROMPT.md"],
    };
    const parsed = JSON.parse(buildHooksJson(config));
    expect(Object.keys(parsed.hooks).sort()).toEqual([
      "PermissionRequest",
      "PostCompact",
      "PostToolUse",
      "PreCompact",
      "PreToolUse",
      "SessionStart",
      "Stop",
      "SubagentStart",
      "SubagentStop",
      "UserPromptSubmit",
    ]);
  });

  it("Stop hook has at least one command handler", () => {
    const parsed = JSON.parse(buildHooksJson(MINIMAL_CONFIG));
    const group = parsed.hooks.Stop[0];
    expect(Array.isArray(group.hooks)).toBe(true);
    expect(group.hooks[0].type).toBe("command");
  });

  it("Stop command invokes holdpoint-check.mjs via node", () => {
    const parsed = JSON.parse(buildHooksJson(MINIMAL_CONFIG));
    const cmd: string = parsed.hooks.Stop[0].hooks[0].command;
    expect(cmd).toContain("node");
    expect(cmd).toContain("holdpoint-check.mjs");
  });

  it("Stop command uses git rev-parse to find project root", () => {
    const parsed = JSON.parse(buildHooksJson(MINIMAL_CONFIG));
    const cmd: string = parsed.hooks.Stop[0].hooks[0].command;
    expect(cmd).toContain("git rev-parse");
  });

  it("Stop hook uses full 600s timeout (avoids premature hook failure)", () => {
    const parsed = JSON.parse(buildHooksJson(MINIMAL_CONFIG));
    expect(parsed.hooks.Stop[0].hooks[0].timeout).toBe(600);
  });

  it("SubagentStop hook also uses full 600s timeout", () => {
    const parsed = JSON.parse(buildHooksJson(MINIMAL_CONFIG));
    expect(parsed.hooks.SubagentStop[0].hooks[0].timeout).toBe(600);
  });

  it("Stop hook has a statusMessage", () => {
    const parsed = JSON.parse(buildHooksJson(MINIMAL_CONFIG));
    expect(typeof parsed.hooks.Stop[0].hooks[0].statusMessage).toBe("string");
  });

  it("does not add a top-level comment key (schema safety)", () => {
    const parsed = JSON.parse(buildHooksJson(MINIMAL_CONFIG));
    expect(parsed["//"]).toBeUndefined();
  });

  it("omits SessionStart hook when no session_context_files configured", () => {
    const parsed = JSON.parse(buildHooksJson(MINIMAL_CONFIG));
    expect(parsed.hooks.SessionStart).toBeUndefined();
  });

  it("adds SessionStart hook when session_context_files configured", () => {
    const config: HoldpointConfig = {
      ...MINIMAL_CONFIG,
      session_context_files: ["MASTER_PROMPT.md"],
    };
    const parsed = JSON.parse(buildHooksJson(config));
    expect(Array.isArray(parsed.hooks.SessionStart)).toBe(true);
    expect(parsed.hooks.SessionStart[0].hooks[0].command).toContain("holdpoint-check.mjs");
    expect(parsed.hooks.SessionStart[0].hooks[0].timeout).toBe(30);
  });

  it("SessionStart and Stop call the same script", () => {
    const config: HoldpointConfig = {
      ...MINIMAL_CONFIG,
      session_context_files: ["MASTER_PROMPT.md"],
    };
    const parsed = JSON.parse(buildHooksJson(config));
    expect(parsed.hooks.SessionStart[0].hooks[0].command).toBe(
      parsed.hooks.Stop[0].hooks[0].command,
    );
  });

  it("non-context hook output is config-agnostic (checks come from CLI at runtime)", () => {
    expect(JSON.parse(buildHooksJson(MINIMAL_CONFIG)).hooks.Stop).toEqual(
      JSON.parse(buildHooksJson(EMPTY_CONFIG)).hooks.Stop,
    );
    expect(JSON.parse(buildHooksJson(MINIMAL_CONFIG)).hooks.PreToolUse).toEqual(
      JSON.parse(buildHooksJson(EMPTY_CONFIG)).hooks.PreToolUse,
    );
  });
});

// ─── buildCheckScript ─────────────────────────────────────────────────────────

describe("buildCheckScript", () => {
  it("returns a string", () => {
    expect(typeof buildCheckScript()).toBe("string");
  });

  it("exposes the dispatcher as a standalone context script", () => {
    expect(buildContextScript()).toBe(buildCheckScript());
  });

  it("starts with a Node shebang", () => {
    expect(buildCheckScript().startsWith("#!/usr/bin/env node")).toBe(true);
  });

  it("includes AUTO-GENERATED comment", () => {
    expect(buildCheckScript()).toContain("AUTO-GENERATED");
  });

  it("dispatches on hook_event_name from stdin (handles both SessionStart and Stop)", () => {
    const script = buildCheckScript();
    expect(script).toContain("hook_event_name");
    expect(script).toContain("SessionStart");
  });

  it("routes all Codex hook payloads to Holdpoint Live", () => {
    const script = buildCheckScript();
    expect(script).toContain('["event", "--engine", "codex", "--from-hook"]');
    expect(script).toContain("sendLiveEvent(input)");
  });

  it("SessionStart: outputs JSON with hookSpecificOutput.additionalContext (not plain text)", () => {
    const script = buildCheckScript();
    expect(script).toContain("hookSpecificOutput");
    expect(script).toContain("hookEventName");
    expect(script).toContain("additionalContext");
  });

  it("SessionStart: reads checks.immutable.json for session_context_files", () => {
    const script = buildCheckScript();
    expect(script).toContain("checks.immutable.json");
    expect(script).toContain("session_context_files");
  });

  it("Stop: uses stdio pipe — never lets plain text reach hook stdout (Codex spec)", () => {
    expect(buildCheckScript()).toContain('stdio: "pipe"');
    expect(buildCheckScript()).not.toContain('stdio: "inherit"');
  });

  it("Stop: exits 0 with no stdout on success (Codex Stop spec requirement)", () => {
    expect(buildCheckScript()).toContain("exit(0)");
  });

  it("Stop: exits 2 on failure so Codex creates a continuation prompt", () => {
    expect(buildCheckScript()).toContain("exit(2)");
  });

  it("Stop: skips rerun when Codex reports stop_hook_active", () => {
    const script = buildCheckScript();
    expect(script).toContain("input.stop_hook_active === true");
    expect(script).toContain("stop_hook_active");
  });

  it("Stop: writes captured failure output to stderr", () => {
    expect(buildCheckScript()).toContain("process.stderr.write");
  });

  it("does not auto-approve PermissionRequest or PreToolUse", () => {
    const script = buildCheckScript();
    expect(script).toContain("PermissionRequest allow would auto-approve");
    expect(script).not.toContain("permissionDecision");
    expect(script).not.toContain('behavior: "allow"');
  });

  it("Stop: defaults to node_modules/.bin/holdpoint check --staged", () => {
    expect(buildCheckScript()).toContain("node_modules/.bin/holdpoint check --staged");
  });

  it("Stop: uses engines.codex.stop_command override when set", () => {
    const config: HoldpointConfig = {
      ...MINIMAL_CONFIG,
      engines: { codex: { stop_command: "holdpoint check --staged" } },
    };
    const script = buildCheckScript(config);
    expect(script).toContain('"holdpoint check --staged"');
    expect(script).not.toContain("npx holdpoint@alpha");
  });

  it("uses git rev-parse to find project root", () => {
    expect(buildCheckScript()).toContain("git rev-parse --show-toplevel");
  });
});
