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
  },
};

describe("LiveStore", () => {
  it("persists events and reloads them from disk", async () => {
    const homeDir = makeHomeDir();
    const store = await LiveStore.create(homeDir);

    await store.ingest(EVENT);

    expect(store.listProjects()).toHaveLength(1);
    expect(store.listSessions()).toHaveLength(1);
    expect(store.getSessionEvents(buildSessionKey(EVENT))).toHaveLength(1);

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
});
