import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";
import { startDaemonProcess } from "../index.js";
import type { EventV1 } from "@holdpoint/live-protocol";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop() as string, { recursive: true, force: true });
  }
});

function makeHomeDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "holdpoint-server-"));
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

describe("live daemon server", () => {
  it("ingests events and exposes project/session queries with auth", async () => {
    const homeDir = makeHomeDir();
    const daemon = await startDaemonProcess({ homeDir, version: "test" });

    const health = await fetch(`http://127.0.0.1:${daemon.info.port}/health`);
    expect(health.status).toBe(200);

    const unauthorized = await fetch(`http://127.0.0.1:${daemon.info.port}/v1/projects`);
    expect(unauthorized.status).toBe(401);

    const wrongOrigin = await fetch(`http://127.0.0.1:${daemon.info.port}/v1/projects`, {
      headers: {
        authorization: `Bearer ${daemon.info.token}`,
        origin: "http://evil.com",
      },
    });
    expect(wrongOrigin.status).toBe(403);

    const ingest = await fetch(`http://127.0.0.1:${daemon.info.port}/v1/events`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${daemon.info.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(EVENT),
    });
    expect(ingest.status).toBe(200);

    const projects = await fetch(`http://127.0.0.1:${daemon.info.port}/v1/projects`, {
      headers: { authorization: `Bearer ${daemon.info.token}` },
    }).then(async (response) => await response.json());
    expect(projects.projects).toHaveLength(1);

    const sessions = await fetch(`http://127.0.0.1:${daemon.info.port}/v1/sessions`, {
      headers: { authorization: `Bearer ${daemon.info.token}` },
    }).then(async (response) => await response.json());
    expect(sessions.sessions).toHaveLength(1);

    const sessionKey = encodeURIComponent(sessions.sessions[0].key);
    const events = await fetch(
      `http://127.0.0.1:${daemon.info.port}/v1/sessions/${sessionKey}/events`,
      {
        headers: { authorization: `Bearer ${daemon.info.token}` },
      },
    ).then(async (response) => await response.json());
    expect(events.events).toHaveLength(1);
    expect(events.max_seq).toBe(1);

    await daemon.close();
  });

  it("replays pending spool files on boot", async () => {
    const homeDir = makeHomeDir();
    const pendingDir = join(homeDir, "spool", "pending");
    mkdirSync(pendingDir, { recursive: true });
    writeFileSync(join(pendingDir, "claude-test.jsonl"), JSON.stringify(EVENT) + "\n", {
      mode: 0o600,
    });

    const daemon = await startDaemonProcess({ homeDir, version: "test" });

    const sessions = await fetch(`http://127.0.0.1:${daemon.info.port}/v1/sessions`, {
      headers: { authorization: `Bearer ${daemon.info.token}` },
    }).then(async (response) => await response.json());
    expect(sessions.sessions).toHaveLength(1);

    await daemon.close();
  });

  it("streams events over the websocket endpoint", async () => {
    const homeDir = makeHomeDir();
    const daemon = await startDaemonProcess({ homeDir, version: "test" });

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(
        `ws://127.0.0.1:${daemon.info.port}/v1/stream`,
        `holdpoint-${daemon.info.token}`,
      );
      ws.on("open", () => {
        ws.send(JSON.stringify({ type: "subscribe", scope: "project", key: EVENT.project_hash }));
        ws.send(JSON.stringify({ type: "publish_event", event: EVENT }));
      });
      ws.on("message", (data) => {
        const payload = JSON.parse(String(data)) as { type: string; event?: EventV1 };
        if (payload.type === "event") {
          expect(payload.event?.id).toBe(EVENT.id);
          ws.close();
          resolve();
        }
      });
      ws.on("error", reject);
    });

    await daemon.close();
  });

  it("accepts browser auth bootstrap cookies for HTTP requests", async () => {
    const homeDir = makeHomeDir();
    const daemon = await startDaemonProcess({ homeDir, version: "test" });

    const authResponse = await fetch(
      `http://127.0.0.1:${daemon.info.port}/__holdpoint/live-auth?token=${daemon.info.token}&project=${EVENT.project_hash}`,
      { redirect: "manual" },
    );
    expect(authResponse.status).toBe(302);
    const cookie = authResponse.headers.get("set-cookie");
    expect(cookie).toContain("holdpoint_live_token=");

    const projects = await fetch(`http://127.0.0.1:${daemon.info.port}/v1/projects`, {
      headers: {
        cookie: cookie ?? "",
        origin: `http://127.0.0.1:${daemon.info.port}`,
      },
    });
    expect(projects.status).toBe(200);

    await daemon.close();
  });

  it("replays backlog on websocket subscribe using since_seq", async () => {
    const homeDir = makeHomeDir();
    const daemon = await startDaemonProcess({ homeDir, version: "test" });

    await fetch(`http://127.0.0.1:${daemon.info.port}/v1/events`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${daemon.info.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(EVENT),
    });

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(
        `ws://127.0.0.1:${daemon.info.port}/v1/stream`,
        `holdpoint-${daemon.info.token}`,
      );
      ws.on("open", () => {
        ws.send(
          JSON.stringify({
            type: "subscribe",
            scope: "session",
            key: `${EVENT.project_hash}:${EVENT.engine}:${EVENT.session_id}`,
            since_seq: 0,
          }),
        );
      });
      ws.on("message", (data) => {
        const payload = JSON.parse(String(data)) as { type: string; events?: EventV1[] };
        if (payload.type === "events_batch") {
          expect(payload.events).toHaveLength(1);
          expect(payload.events?.[0]?.id).toBe(EVENT.id);
          ws.close();
          resolve();
        }
      });
      ws.on("error", reject);
    });

    await daemon.close();
  });
});
