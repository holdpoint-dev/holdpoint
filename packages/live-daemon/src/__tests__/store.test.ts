import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

describe("LiveStore.replayPending", () => {
  it("ingests pending events from spool/pending on startup", async () => {
    const homeDir = makeHomeDir();
    const pendingDir = join(homeDir, "spool", "pending");
    mkdirSync(pendingDir, { recursive: true });
    writeFileSync(join(pendingDir, "claude-session-1.jsonl"), JSON.stringify(EVENT) + "\n", "utf8");

    const store = await LiveStore.create(homeDir);
    await store.replayPending();

    expect(store.listProjects()).toHaveLength(1);
    expect(store.getSessionEvents(buildSessionKey(EVENT))).toHaveLength(1);
    // File must be removed after a successful replay so we don't re-ingest
    // on the next daemon startup.
    expect(existsSync(join(pendingDir, "claude-session-1.jsonl"))).toBe(false);
  });

  it("survives an event whose cwd no longer exists on disk", async () => {
    // Regression test for the daemon-bricking bug: a pending event from
    // a deleted project caused identifyProject(realpathSync) to throw,
    // which crashed replayPending, which prevented the daemon from ever
    // writing a healthy lock file. The fix is two-layered: identifyProject
    // falls back to the raw cwd string when realpath fails, AND
    // replayPending wraps each event in try/catch so one bad payload
    // can't take down the whole replay.
    const homeDir = makeHomeDir();
    const pendingDir = join(homeDir, "spool", "pending");
    mkdirSync(pendingDir, { recursive: true });

    // Valid UUID v4 strings — version digit "4" + variant digit [89ab].
    // Earlier drafts of this test used all-same-digit UUIDs which Zod's
    // .uuid() rejects (variant digit must be 8, 9, a, or b), and the
    // events were silently dropped by readJsonl, making the test look
    // like it had ingested zero events when in reality it had ingested
    // zero events for an unrelated reason.
    const goodEvent = { ...EVENT, id: "11111111-1111-4111-8111-111111111111" };
    const deadCwdEvent = {
      ...EVENT,
      id: "22222222-2222-4222-8222-222222222222",
      ts: EVENT.ts + 1,
      session_id: "session-dead",
      cwd: "/tmp/holdpoint-this-path-definitely-does-not-exist-zzz999",
    };

    writeFileSync(
      join(pendingDir, "claude-mixed.jsonl"),
      JSON.stringify(goodEvent) + "\n" + JSON.stringify(deadCwdEvent) + "\n",
      "utf8",
    );

    const store = await LiveStore.create(homeDir);
    // The cardinal guarantee: replayPending MUST NOT throw on a dead-cwd
    // event, and the file MUST be removed so the bad payload can't loop
    // forever on every daemon startup.
    await expect(store.replayPending()).resolves.not.toThrow();
    expect(existsSync(join(pendingDir, "claude-mixed.jsonl"))).toBe(false);
    // Both events should now be ingested — good one via realpath, dead
    // one via the raw-path fallback. Same project_hash means one project.
    expect(store.listProjects()).toHaveLength(1);
  });

  it("removes a pending file even when every event in it is malformed", async () => {
    const homeDir = makeHomeDir();
    const pendingDir = join(homeDir, "spool", "pending");
    mkdirSync(pendingDir, { recursive: true });

    // Pure garbage that EventV1Schema will reject. readJsonl already
    // filters these out, but we double-check that an entirely-bad file
    // doesn't prevent file deletion.
    writeFileSync(
      join(pendingDir, "claude-garbage.jsonl"),
      '{"not":"a valid event"}\n{"also":"bad"}\n',
      "utf8",
    );

    const store = await LiveStore.create(homeDir);
    await expect(store.replayPending()).resolves.not.toThrow();
    expect(existsSync(join(pendingDir, "claude-garbage.jsonl"))).toBe(false);
  });

  it("is a no-op when the spool directory does not exist", async () => {
    const homeDir = makeHomeDir();
    const store = await LiveStore.create(homeDir);
    await expect(store.replayPending()).resolves.not.toThrow();
    expect(store.listProjects()).toHaveLength(0);
  });
});
