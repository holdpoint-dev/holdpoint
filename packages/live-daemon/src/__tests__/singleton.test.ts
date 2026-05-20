import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createDaemonLock,
  readDaemonLock,
  readHealthyDaemonLock,
  writeDaemonLockExclusive,
} from "../index.js";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop() as string, { recursive: true, force: true });
  }
});

function makeHomeDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "holdpoint-daemon-"));
  tempDirs.push(dir);
  return dir;
}

describe("singleton lock helpers", () => {
  it("writes and reads a daemon lockfile", () => {
    const homeDir = makeHomeDir();
    const lock = createDaemonLock(43123, "test");

    writeDaemonLockExclusive(lock, homeDir);

    expect(readDaemonLock(homeDir)?.port).toBe(43123);
  });

  it("allows exactly one exclusive writer during a race", async () => {
    const homeDir = makeHomeDir();

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, index) =>
        Promise.resolve().then(() =>
          writeDaemonLockExclusive(createDaemonLock(43123 + index, "test"), homeDir),
        ),
      ),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  });

  it("treats stale lockfiles as unhealthy", async () => {
    const homeDir = makeHomeDir();
    writeFileSync(
      join(homeDir, "daemon.lock"),
      JSON.stringify({
        version: "test",
        pid: 999999,
        port: 65535,
        token: "dead",
        started_at: Date.now(),
        host: "darwin-arm64",
      }),
      { mode: 0o600 },
    );

    expect(await readHealthyDaemonLock(homeDir)).toBeNull();
  });

  it("recognises a healthy running daemon", async () => {
    const homeDir = makeHomeDir();
    const server = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, version: "test", started_at: Date.now() }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected TCP address");
    }

    writeFileSync(
      join(homeDir, "daemon.lock"),
      JSON.stringify({
        version: "test",
        pid: process.pid,
        port: address.port,
        token: "alive",
        started_at: Date.now(),
        host: "darwin-arm64",
      }),
      { mode: 0o600 },
    );

    const lock = await readHealthyDaemonLock(homeDir);
    expect(lock?.pid).toBe(process.pid);

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });
});
