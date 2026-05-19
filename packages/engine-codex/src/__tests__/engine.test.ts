import { describe, it, expect } from "vitest";
import { buildHooksJson, buildCheckScript, buildAgentsMd, spliceAgentsMd } from "../engine.js";
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

  it("Stop hook output is config-agnostic (checks come from CLI at runtime)", () => {
    expect(buildHooksJson(MINIMAL_CONFIG)).toBe(buildHooksJson(EMPTY_CONFIG));
  });
});

// ─── buildCheckScript ─────────────────────────────────────────────────────────

describe("buildCheckScript", () => {
  it("returns a string", () => {
    expect(typeof buildCheckScript()).toBe("string");
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

  it("Stop: writes captured failure output to stderr", () => {
    expect(buildCheckScript()).toContain("process.stderr.write");
  });

  it("Stop: defaults to npx holdpoint@alpha check --staged", () => {
    expect(buildCheckScript()).toContain("npx holdpoint@alpha check --staged");
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

// ─── buildAgentsMd ────────────────────────────────────────────────────────────

describe("buildAgentsMd", () => {
  it("returns a string", () => {
    expect(typeof buildAgentsMd(MINIMAL_CONFIG)).toBe("string");
  });

  it("includes start and end markers", () => {
    const md = buildAgentsMd(MINIMAL_CONFIG);
    expect(md).toContain("<!-- holdpoint:start -->");
    expect(md).toContain("<!-- holdpoint:end -->");
  });

  it("instructs to run holdpoint check --staged", () => {
    expect(buildAgentsMd(MINIMAL_CONFIG)).toContain("holdpoint");
    expect(buildAgentsMd(MINIMAL_CONFIG).toLowerCase()).toContain("check --staged");
  });

  it("lists cmd check labels and commands", () => {
    const md = buildAgentsMd(MINIMAL_CONFIG);
    expect(md).toContain("Lint");
    expect(md).toContain("pnpm lint");
  });

  it("lists prompt check labels and prompts", () => {
    const md = buildAgentsMd(MINIMAL_CONFIG);
    expect(md).toContain("Peer review");
    expect(md).toContain("Verify all edge cases");
  });

  it("shows fallback text when no cmd checks configured", () => {
    expect(buildAgentsMd(EMPTY_CONFIG)).toContain("*(none configured)*");
  });

  it("shows fallback text when no prompt checks configured", () => {
    expect(buildAgentsMd(EMPTY_CONFIG)).toContain("*(none configured)*");
  });

  it("includes auto-generated note so users know not to edit", () => {
    expect(buildAgentsMd(MINIMAL_CONFIG)).toContain("auto-generated");
  });

  it("renders when filter as bracket prefix on each check", () => {
    const config: HoldpointConfig = {
      ...MINIMAL_CONFIG,
      checks: [{ id: "lint", label: "Lint", cmd: "pnpm lint", when: ["frontend"] }],
    };
    expect(buildAgentsMd(config)).toContain("[frontend]");
  });
});

// ─── spliceAgentsMd ───────────────────────────────────────────────────────────

describe("spliceAgentsMd", () => {
  it("appends block when file has no existing markers", () => {
    const existing = "# My Project\n\nSome instructions.\n";
    const result = spliceAgentsMd(existing, MINIMAL_CONFIG);
    expect(result).toContain("# My Project");
    expect(result).toContain("<!-- holdpoint:start -->");
    expect(result).toContain("<!-- holdpoint:end -->");
  });

  it("replaces existing Holdpoint block without duplicating it", () => {
    const initial = spliceAgentsMd("", MINIMAL_CONFIG);
    const updated = spliceAgentsMd(initial, EMPTY_CONFIG);
    const startCount = (updated.match(/<!-- holdpoint:start -->/g) ?? []).length;
    expect(startCount).toBe(1);
  });

  it("preserves content before the existing block", () => {
    const existing = "# Header\n\n<!-- holdpoint:start -->\nold content\n<!-- holdpoint:end -->\n";
    const result = spliceAgentsMd(existing, MINIMAL_CONFIG);
    expect(result.startsWith("# Header")).toBe(true);
  });

  it("preserves content after the existing block", () => {
    const existing = "<!-- holdpoint:start -->\nold\n<!-- holdpoint:end -->\n\n## After section\n";
    const result = spliceAgentsMd(existing, MINIMAL_CONFIG);
    expect(result).toContain("## After section");
  });

  it("handles empty existing file gracefully", () => {
    const result = spliceAgentsMd("", MINIMAL_CONFIG);
    expect(result).toContain("<!-- holdpoint:start -->");
  });
});
