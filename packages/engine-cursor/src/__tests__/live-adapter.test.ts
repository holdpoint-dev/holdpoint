import { describe, expect, it } from "vitest";
import { adapter } from "../live-adapter.js";

describe("Cursor live adapter", () => {
  it("translates beforeSubmitPrompt into a prompt_submit event", () => {
    const event = adapter.translateHookInput(
      {
        conversation_id: "conv-1",
        generation_id: "gen-1",
        hook_event_name: "beforeSubmitPrompt",
        prompt: "Implement auth",
        cwd: process.cwd(),
      },
      { cwd: process.cwd() },
    );

    expect(event).toMatchObject({
      engine: "cursor",
      session_id: "conv-1",
      type: "prompt_submit",
      payload: { prompt: "Implement auth" },
    });
  });

  it("translates failed completion checks into stop_block events", () => {
    const event = adapter.translateHookInput(
      {
        conversation_id: "conv-1",
        hook_event_name: "stop",
        status: "completed",
        cwd: process.cwd(),
        holdpoint_check: {
          ok: false,
          output: "lint failed",
          durationMs: 123,
        },
      },
      { cwd: process.cwd() },
    );

    expect(event).toMatchObject({
      engine: "cursor",
      session_id: "conv-1",
      type: "stop_block",
      payload: { reason: "lint failed", failing_checks: [] },
    });
  });

  it("returns null when Cursor hook identity is missing", () => {
    expect(adapter.translateHookInput({ hook_event_name: "stop" })).toBeNull();
    expect(adapter.translateHookInput({ conversation_id: "conv-1" })).toBeNull();
  });
});
