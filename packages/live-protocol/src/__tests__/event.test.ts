import { describe, expect, it } from "vitest";
import { ClientMessageSchema, EventV1Schema, EventsBatchSchema } from "../index.js";

const VALID_EVENT = {
  v: 1,
  id: "4eb8d8fd-87cf-4034-b4e8-9c5c1983b160",
  ts: 1716220815000,
  engine: "claude",
  session_id: "session-1",
  project_hash: "abc123def456",
  cwd: "/tmp/project",
  type: "tool_pre",
  payload: {
    tool_name: "Edit",
    tool_use_id: "toolu_01ABC",
    tool_input: { file_path: "src/auth.ts" },
    write_targets: ["/tmp/project/src/auth.ts"],
  },
} as const;

describe("EventV1Schema", () => {
  it("accepts a valid event", () => {
    expect(() => EventV1Schema.parse(VALID_EVENT)).not.toThrow();
  });

  it("rejects malformed project hashes", () => {
    expect(() =>
      EventV1Schema.parse({
        ...VALID_EVENT,
        project_hash: "not-a-hash",
      }),
    ).toThrow(/project_hash/);
  });

  it("rejects payloads that do not match the event type", () => {
    expect(() =>
      EventV1Schema.parse({
        ...VALID_EVENT,
        type: "stop_pass",
        payload: { tool_name: "Edit" },
      }),
    ).toThrow();
  });

  it("accepts server-assigned sequence numbers on events", () => {
    expect(() =>
      EventV1Schema.parse({
        ...VALID_EVENT,
        seq: 42,
      }),
    ).not.toThrow();
  });
});

describe("EventsBatchSchema", () => {
  it("accepts arrays of valid events", () => {
    expect(() => EventsBatchSchema.parse([VALID_EVENT, VALID_EVENT])).not.toThrow();
  });

  it("rejects empty batches", () => {
    expect(() => EventsBatchSchema.parse([])).toThrow();
  });
});

describe("ClientMessageSchema", () => {
  it("accepts subscribe messages with a replay cursor", () => {
    expect(() =>
      ClientMessageSchema.parse({
        type: "subscribe",
        scope: "all",
        since_seq: 12,
      }),
    ).not.toThrow();
  });
});
