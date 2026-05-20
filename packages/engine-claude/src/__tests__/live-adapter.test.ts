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
});
