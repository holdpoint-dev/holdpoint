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

  it("output is identical regardless of check contents (config-agnostic)", () => {
    expect(buildHooksJson(MINIMAL_CONFIG)).toBe(buildHooksJson(EMPTY_CONFIG));
  });
});

// ─── buildCheckScript ─────────────────────────────────────────────────────────

describe("buildCheckScript", () => {
  it("returns a string", () => {
    expect(typeof buildCheckScript()).toBe("string");
  });

  it("starts with a shebang or node comment", () => {
    const script = buildCheckScript();
    expect(script.startsWith("#!/usr/bin/env node") || script.startsWith("//")).toBe(true);
  });

  it("includes AUTO-GENERATED comment so users know not to edit it", () => {
    expect(buildCheckScript()).toContain("AUTO-GENERATED");
  });

  it("invokes holdpoint check --staged", () => {
    expect(buildCheckScript()).toContain("holdpoint");
    expect(buildCheckScript()).toContain("check --staged");
  });

  it("exits 2 on failure (not 1, which would be a hook error)", () => {
    expect(buildCheckScript()).toContain("exit(2)");
  });

  it("exits 0 on success", () => {
    expect(buildCheckScript()).toContain("exit(0)");
  });

  it("uses git rev-parse to find project root", () => {
    expect(buildCheckScript()).toContain("git rev-parse --show-toplevel");
  });

  it("writes failure output to stderr (Codex injects it as a new prompt)", () => {
    expect(buildCheckScript()).toContain("process.stderr.write");
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
