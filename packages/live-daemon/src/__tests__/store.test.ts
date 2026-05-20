import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LiveStore, buildSessionKey } from "../store.js";
import type { EventV1 } from "@holdpoint/live-protocol";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop() as string, { recursive: true, force: true });
  }
});

function makeHomeDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "holdpoint-store-"));
  tempDirs.push(dir);
  return dir;
}

const EVENT: EventV1 = {
  v: 1,
  id: "4eb8d8fd-87cf-4034-b4e8-9c5c1983b160",
  ts: 1716220815000,
  engine: "claude",
  session_id: "session-1",
  project_hash: "abc123def456",
  cwd: process.cwd(),
  type: "tool_pre",
  payload: {
    tool_name: "Edit",
    tool_use_id: "toolu_01ABC",
    tool_input: { file_path: "src/auth.ts" },
    write_targets: [join(process.cwd(), "src/auth.ts")],
  },
};

describe("LiveStore", () => {
  it("persists events and reloads them from disk", async () => {
    const homeDir = makeHomeDir();
    const store = await LiveStore.create(homeDir);

    const accepted = await store.ingest(EVENT);

    expect(store.listProjects()).toHaveLength(1);
    expect(store.listSessions()).toHaveLength(1);
    expect(store.getSessionEvents(buildSessionKey(EVENT))).toHaveLength(1);
    expect(accepted[0]?.seq).toBe(1);

    const reloaded = await LiveStore.create(homeDir);
    expect(reloaded.listProjects()).toHaveLength(1);
    expect(reloaded.getSessionEvents(buildSessionKey(EVENT))).toHaveLength(1);
  });

  it("purges session data", async () => {
    const homeDir = makeHomeDir();
    const store = await LiveStore.create(homeDir);

    await store.ingest(EVENT);
    expect(await store.purgeSession(buildSessionKey(EVENT))).toBe(true);
    expect(store.listSessions()).toHaveLength(0);
  });

  it("emits a conflict event when a second session targets the same file", async () => {
    const homeDir = makeHomeDir();
    const store = await LiveStore.create(homeDir);

    await store.ingest(EVENT);
    const accepted = await store.ingest({
      ...EVENT,
      id: "f13adf11-8b4b-4f1d-8789-c84bc49b59df",
      ts: EVENT.ts + 1,
      session_id: "session-2",
      payload: {
        tool_name: "Edit",
        tool_use_id: "toolu_02DEF",
        tool_input: { file_path: "src/auth.ts" },
        write_targets: [join(process.cwd(), "src/auth.ts")],
      },
    });

    expect(accepted).toHaveLength(2);
    expect(accepted[1]?.type).toBe("conflict");
    expect(
      store.getSessionEvents(buildSessionKey({ ...EVENT, session_id: "session-2" })),
    ).toHaveLength(2);
  });

  it("releases file locks when the tool completes", async () => {
    const homeDir = makeHomeDir();
    const store = await LiveStore.create(homeDir);

    await store.ingest(EVENT);
    await store.ingest({
      ...EVENT,
      id: "53b2d3ff-fcb3-4532-a91f-e965cb502d3f",
      ts: EVENT.ts + 1,
      type: "tool_post",
      payload: {
        tool_name: "Edit",
        tool_use_id: "toolu_01ABC",
        success: true,
        duration_ms: 10,
      },
    });

    const accepted = await store.ingest({
      ...EVENT,
      id: "95e92d35-93e9-4053-8bd1-b44fc0a1c8ad",
      ts: EVENT.ts + 2,
      session_id: "session-2",
      payload: {
        tool_name: "Edit",
        tool_use_id: "toolu_03GHI",
        tool_input: { file_path: "src/auth.ts" },
        write_targets: [join(process.cwd(), "src/auth.ts")],
      },
    });

    expect(accepted).toHaveLength(1);
    expect(accepted[0]?.type).toBe("tool_pre");
  });
});
