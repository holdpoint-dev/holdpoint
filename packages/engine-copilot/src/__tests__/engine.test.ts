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
    expect(src).toContain("MAX_CONTEXT_CHARS");
    expect(src).toContain("context_truncated");
  });

  it("reads checks.immutable.json (pre-parsed JSON — no YAML parser needed in .mjs)", () => {
    expect(buildEngine(MINIMAL_CONFIG)).toContain("checks.immutable.json");
    expect(buildEngine(MINIMAL_CONFIG)).toContain("JSON.parse");
  });

  it("intercepts task_complete via onPreToolUse", () => {
    const src = buildEngine(MINIMAL_CONFIG);
    expect(src).toContain("onPreToolUse");
    expect(src).toContain("task_complete");
    expect(src).toContain("runHoldpointChecks");
    expect(src).toContain("copilot_task_complete_check_started");
    expect(src).toContain("stop_block");
    expect(src).toContain("stop_pass");
  });

  it("registers a long-lived live control bridge", () => {
    const src = buildEngine(MINIMAL_CONFIG);
    expect(src).toContain("register_control");
    expect(src).toContain("/v1/stream");
    expect(src).toContain("control_online");
  });

  it("tracks permission requests for live approval", () => {
    const src = buildEngine(MINIMAL_CONFIG);
    expect(src).toContain("onPermissionRequest");
    expect(src).toContain("permission.requested");
    expect(src).toContain("permission.completed");
    expect(src).toContain("approve_pending");
    expect(src).toContain("deny_pending");
  });

  it("registers the reference Holdpoint control tool", () => {
    const src = buildEngine(MINIMAL_CONFIG);
    expect(src).toContain("holdpoint_dry_run");
    expect(src).toContain("trigger_tool");
    expect(src).toContain("inject_context");
  });

  it("emits session.log progress message", () => {
    const src = buildEngine(MINIMAL_CONFIG);
    expect(src).toContain("session.log");
    expect(src).toContain("ephemeral: true");
  });

  it("returns permissionDecision deny on CLI failure", () => {
    expect(buildEngine(MINIMAL_CONFIG)).toContain("permissionDecision");
    expect(buildEngine(MINIMAL_CONFIG)).toContain("deny");
    expect(buildEngine(MINIMAL_CONFIG)).toContain("MAX_CHECK_OUTPUT_CHARS");
    expect(buildEngine(MINIMAL_CONFIG)).toContain("maxBuffer: CHECK_MAX_BUFFER_BYTES");
  });

  it("defaults to node_modules/.bin/holdpoint check --staged", () => {
    expect(buildEngine(MINIMAL_CONFIG)).toContain("node_modules/.bin/holdpoint check --staged");
  });

  it("gathers per-hook context for session_start and message_submit", () => {
    const src = buildEngine(MINIMAL_CONFIG);
    expect(src).toContain("gatherHookContext");
    // session_start seeding wired into onSessionStart
    expect(src).toContain("gatherHookContext(context.repoRoot, 'session_start')");
    // message_submit seeding wired into onUserPromptSubmitted
    expect(src).toContain("gatherHookContext(cwd, 'message_submit')");
    // datetime is read from config at runtime, not baked per-build
    expect(src).toContain("config.inject_datetime !== false");
  });

  it("gates before_tool via onPreToolUse permission deny", () => {
    const src = buildEngine(MINIMAL_CONFIG);
    expect(src).toContain("hasCmdAt(repoRoot, 'before_tool')");
    expect(src).toContain("--hook before_tool");
    expect(src).toContain("permissionDecision: 'deny'");
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

  it("guards session context paths using path.relative semantics", () => {
    const src = buildEngine(MINIMAL_CONFIG);
    expect(src).toContain("function isPathInsideRoot");
    expect(src).toContain("relative(repoRoot, absPath)");
    expect(src).toContain("!isAbsolute(rel)");
    expect(src).not.toContain("startsWith(repoRoot + sep)");
  });

  it("does NOT include a shebang (not a standalone script)", () => {
    expect(buildEngine(MINIMAL_CONFIG).trimStart()).not.toMatch(/^#!\/usr\/bin\/env/);
  });

  it("ignores checks list — behaviour comes from the CLI at runtime", () => {
    expect(buildEngine(MINIMAL_CONFIG)).toBe(buildEngine({ ...MINIMAL_CONFIG, checks: [] }));
  });
});
