import { describe, expect, it } from "vitest";
import { adapter } from "../live-adapter.js";

describe("Claude live adapter", () => {
  it("translates PreToolUse payloads into tool_pre events", () => {
    const event = adapter.translateHookInput(
      {
        session_id: "session-1",
        cwd: process.cwd(),
        hook_event_name: "PreToolUse",
        tool_name: "Edit",
        tool_input: { file_path: "README.md" },
        tool_use_id: "tool-1",
      },
      { cwd: process.cwd() },
    );

    expect(event).not.toBeNull();
    expect(event?.engine).toBe("claude");
    expect(event?.type).toBe("tool_pre");
    expect(event?.payload).toMatchObject({
      tool_name: "Edit",
      tool_use_id: "tool-1",
    });
  });

  it("returns null when mandatory hook fields are missing", () => {
    expect(adapter.translateHookInput({ hook_event_name: "PreToolUse" })).toBeNull();
  });

  it("translates UserPromptSubmit payloads into prompt events", () => {
    const event = adapter.translateHookInput({
      session_id: "session-1",
      cwd: process.cwd(),
      hook_event_name: "UserPromptSubmit",
      prompt: "please fix the tests",
    });

    expect(event).toMatchObject({
      engine: "claude",
      type: "prompt_submit",
      payload: { prompt: "please fix the tests" },
    });
  });

  it("translates SessionStart payloads into session_start events", () => {
    const event = adapter.translateHookInput({
      session_id: "session-1",
      cwd: process.cwd(),
      hook_event_name: "SessionStart",
      source: "startup",
    });

    expect(event).toMatchObject({
      type: "session_start",
      payload: { source: "startup" },
    });
  });

  it("translates failed tool hooks into tool_failure events", () => {
    const event = adapter.translateHookInput({
      session_id: "session-1",
      cwd: process.cwd(),
      hook_event_name: "PostToolUseFailure",
      tool_name: "Bash",
      tool_use_id: "tool-1",
      error: "exit 1",
    });

    expect(event).toMatchObject({
      type: "tool_failure",
      payload: {
        tool_name: "Bash",
        tool_use_id: "tool-1",
        error: "exit 1",
      },
    });
  });

  it("translates permission request hooks into pending permission events", () => {
    const event = adapter.translateHookInput({
      session_id: "session-1",
      cwd: process.cwd(),
      hook_event_name: "PermissionRequest",
      tool_name: "Bash",
      tool_use_id: "tool-1",
      permission_request_id: "perm-1",
    });

    expect(event).toMatchObject({
      type: "permission_pending",
      payload: {
        request_id: "perm-1",
        permission_kind: "shell",
        tool_call_id: "tool-1",
      },
    });
  });
});
