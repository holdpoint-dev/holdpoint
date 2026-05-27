import { describe, expect, it } from "vitest";
import { adapter } from "../live-adapter.js";

describe("Codex live adapter", () => {
  it("translates UserPromptSubmit into prompt_submit", () => {
    const event = adapter.translateHookInput(
      {
        session_id: "session-1",
        turn_id: "turn-1",
        hook_event_name: "UserPromptSubmit",
        prompt: "Implement auth",
        cwd: process.cwd(),
      },
      { cwd: process.cwd() },
    );

    expect(event).toMatchObject({
      engine: "codex",
      session_id: "session-1",
      type: "prompt_submit",
      payload: { prompt: "Implement auth" },
    });
  });

  it("extracts write targets from apply_patch tool inputs", () => {
    const event = adapter.translateHookInput(
      {
        session_id: "session-1",
        turn_id: "turn-1",
        hook_event_name: "PreToolUse",
        tool_name: "apply_patch",
        tool_use_id: "tool-1",
        tool_input: {
          command: "*** Begin Patch\n*** Update File: src/app.ts\n@@\n-test\n+test\n*** End Patch",
        },
        cwd: process.cwd(),
      },
      { cwd: process.cwd() },
    );

    expect(event).toMatchObject({
      engine: "codex",
      type: "tool_pre",
      payload: {
        tool_name: "apply_patch",
        tool_use_id: "tool-1",
        write_targets: [expect.stringContaining("src/app.ts")],
      },
    });
  });

  it("translates failed completion checks into stop_block", () => {
    const event = adapter.translateHookInput(
      {
        session_id: "session-1",
        turn_id: "turn-1",
        hook_event_name: "Stop",
        cwd: process.cwd(),
        holdpoint_check: {
          ok: false,
          output: "lint failed",
        },
      },
      { cwd: process.cwd() },
    );

    expect(event).toMatchObject({
      engine: "codex",
      session_id: "session-1",
      type: "stop_block",
      payload: { reason: "lint failed", failing_checks: [] },
    });
  });

  it("translates permission requests without resolving them", () => {
    const event = adapter.translateHookInput(
      {
        session_id: "session-1",
        turn_id: "turn-1",
        hook_event_name: "PermissionRequest",
        tool_name: "Bash",
        cwd: process.cwd(),
      },
      { cwd: process.cwd() },
    );

    expect(event).toMatchObject({
      type: "permission_pending",
      payload: {
        permission_kind: "shell",
        tool_name: "Bash",
      },
    });
  });

  it("preserves SubagentStart context truncation metadata", () => {
    const event = adapter.translateHookInput(
      {
        session_id: "session-1",
        turn_id: "turn-1",
        hook_event_name: "SubagentStart",
        cwd: process.cwd(),
        holdpoint_context: {
          truncated: true,
          originalLength: 120_000,
          emittedLength: 100_000,
        },
      },
      { cwd: process.cwd() },
    );

    expect(event).toMatchObject({
      type: "meta",
      payload: {
        kind: "codex_lifecycle",
        hook_event_name: "SubagentStart",
        context_truncated: true,
      },
    });
  });

  it("returns null without session and hook identity", () => {
    expect(adapter.translateHookInput({ hook_event_name: "Stop" })).toBeNull();
    expect(adapter.translateHookInput({ session_id: "session-1" })).toBeNull();
  });
});
