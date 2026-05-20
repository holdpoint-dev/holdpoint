import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "node:http";
import { join } from "node:path";
import { BridgeClient } from "../bridge-client.js";
import type { EventV1 } from "@holdpoint/live-protocol";

const EVENT: EventV1 = {
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
  },
};

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop() as string, { recursive: true, force: true });
  }
});

function makeHomeDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "holdpoint-sdk-"));
  tempDirs.push(dir);
  return dir;
}

describe("BridgeClient", () => {
  it("queues events when no daemon lockfile exists", async () => {
    const homeDir = makeHomeDir();
    const client = new BridgeClient({ homeDir });

    const result = await client.sendEvent(EVENT);

    expect(result.status).toBe("queued");
    const pendingDir = join(homeDir, "spool", "pending");
    const [file] = readdirSync(pendingDir);
    expect(readFileSync(join(pendingDir, file), "utf8")).toContain('"tool_pre"');
  });

  it("posts events to the daemon when a valid lockfile exists", async () => {
    const homeDir = makeHomeDir();
    const received: string[] = [];
    const server = createServer((req, res) => {
      if (req.url !== "/v1/events") {
        res.writeHead(404);
        res.end();
        return;
      }
      expect(req.headers.authorization).toBe("Bearer test-token");
      let body = "";
      req.on("data", (chunk) => {
        body += String(chunk);
      });
      req.on("end", () => {
        received.push(body);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, accepted: 1 }));
      });
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected TCP server address");
    }

    writeFileSync(
      join(homeDir, "daemon.lock"),
      JSON.stringify({
        pid: process.pid,
        port: address.port,
        token: "test-token",
        started_at: Date.now(),
        version: "test",
        host: "darwin-arm64",
      }),
      { mode: 0o600 },
    );

    const client = new BridgeClient({ homeDir, timeoutMs: 1000 });
    const result = await client.sendEvent(EVENT);

    expect(result.status).toBe("sent");
    expect(received).toHaveLength(1);
    expect(received[0]).toContain('"tool_pre"');

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });
});
