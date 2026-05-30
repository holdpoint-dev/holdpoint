import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

const COPILOT_SESSION_START: EventV1 = {
  v: 1,
  id: "0b76805c-b0cf-497a-83b1-cab8ebdbd8fe",
  ts: 1716220814000,
  engine: "copilot",
  session_id: "copilot-1",
  project_hash: "abc123def456",
  cwd: process.cwd(),
  caps: {
    can_stream: true,
    can_control: true,
    can_modify_context: true,
    can_register_tools: true,
    control_online: false,
  },
  type: "session_start",
  payload: {
    source: "startup",
    tools_available: ["holdpoint_dry_run"],
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
      `http://127.0.0.1:${daemon.info.port}/__holdpoint/live-auth?token=${daemon.info.token}&path=/live/&project=${EVENT.project_hash}`,
      { redirect: "manual" },
    );
    expect(authResponse.status).toBe(302);
    expect(authResponse.headers.get("location")).toContain("/live/?project=");
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

  it("sanitizes UI auth redirect paths", async () => {
    const homeDir = makeHomeDir();
    const daemon = await startDaemonProcess({ homeDir, version: "test" });

    // The builder is now a tab of the unified UI, so /builder folds into /live/.
    const builderAuth = await fetch(
      `http://127.0.0.1:${daemon.info.port}/__holdpoint/live-auth?token=${daemon.info.token}&path=/builder/`,
      { redirect: "manual" },
    );
    expect(builderAuth.status).toBe(302);
    expect(builderAuth.headers.get("location")).toBe(
      `http://127.0.0.1:${daemon.info.port}/live/?tab=checks`,
    );

    const unsafeAuth = await fetch(
      `http://127.0.0.1:${daemon.info.port}/__holdpoint/live-auth?token=${daemon.info.token}&path=//evil.example/builder`,
      { redirect: "manual" },
    );
    expect(unsafeAuth.status).toBe(302);
    expect(unsafeAuth.headers.get("location")).toBe(`http://127.0.0.1:${daemon.info.port}/live/`);

    await daemon.close();
  });

  it("serves the unified UI and folds /builder into the Checks tab", async () => {
    const homeDir = makeHomeDir();
    const daemon = await startDaemonProcess({ homeDir, version: "test" });

    const root = await fetch(`http://127.0.0.1:${daemon.info.port}/`, {
      redirect: "manual",
    });
    expect(root.status).toBe(302);
    expect(root.headers.get("location")).toBe("/live/");

    const live = await fetch(`http://127.0.0.1:${daemon.info.port}/live/`);
    expect(live.status).toBe(200);
    expect(live.headers.get("content-type")).toContain("text/html");
    expect(await live.text()).toMatch(/Holdpoint Live|id="root"/);

    // /builder/ is no longer a separate bundle — it redirects into the unified UI.
    const builder = await fetch(`http://127.0.0.1:${daemon.info.port}/builder/`, {
      redirect: "manual",
    });
    expect(builder.status).toBe(302);
    expect(builder.headers.get("location")).toBe("/live/?tab=checks");

    await daemon.close();
  });

  it("serves builder project bootstrap files only after authenticated registration", async () => {
    const homeDir = makeHomeDir();
    const projectRoot = makeHomeDir();
    const projectHash = "registered123";
    writeFileSync(join(projectRoot, "checks.yaml"), "version: 1\nchecks: []\n");
    mkdirSync(join(projectRoot, ".holdpoint"), { recursive: true });
    writeFileSync(join(projectRoot, ".holdpoint", "check-reports.json"), '{"runs":[]}');
    const daemon = await startDaemonProcess({ homeDir, version: "test" });

    const unauthenticated = await fetch(
      `http://127.0.0.1:${daemon.info.port}/__holdpoint/initial-yaml?project=${projectHash}`,
    );
    expect(unauthenticated.status).toBe(401);

    const authResponse = await fetch(
      `http://127.0.0.1:${daemon.info.port}/__holdpoint/live-auth?token=${daemon.info.token}&path=/builder/&project=${projectHash}&name=Fixture&root=${encodeURIComponent(projectRoot)}`,
      { redirect: "manual" },
    );
    const cookie = authResponse.headers.get("set-cookie") ?? "";

    const yaml = await fetch(
      `http://127.0.0.1:${daemon.info.port}/__holdpoint/initial-yaml?project=${projectHash}`,
      {
        headers: {
          cookie,
          origin: `http://127.0.0.1:${daemon.info.port}`,
        },
      },
    );
    expect(yaml.status).toBe(200);
    expect(await yaml.text()).toContain("version: 1");

    const reports = await fetch(
      `http://127.0.0.1:${daemon.info.port}/__holdpoint/initial-reports?project=${projectHash}`,
      {
        headers: {
          cookie,
          origin: `http://127.0.0.1:${daemon.info.port}`,
        },
      },
    );
    expect(reports.status).toBe(200);
    expect(await reports.json()).toEqual({ runs: [] });

    await daemon.close();
  });

  it("writes checks.yaml to disk via the authenticated PUT endpoint", async () => {
    const homeDir = makeHomeDir();
    const projectRoot = makeHomeDir();
    const projectHash = "writeproj1234";
    const checksPath = join(projectRoot, "checks.yaml");
    writeFileSync(checksPath, "version: 1\nchecks: []\n");
    const daemon = await startDaemonProcess({ homeDir, version: "test" });

    const checksUrl = `http://127.0.0.1:${daemon.info.port}/__holdpoint/checks?project=${projectHash}`;

    // Unauthenticated writes are rejected.
    const unauth = await fetch(checksUrl, { method: "PUT", body: "version: 1\nchecks: []\n" });
    expect(unauth.status).toBe(401);

    // Register the project + obtain the UI auth cookie.
    const authResponse = await fetch(
      `http://127.0.0.1:${daemon.info.port}/__holdpoint/live-auth?token=${daemon.info.token}&path=/live/&project=${projectHash}&name=Fixture&root=${encodeURIComponent(projectRoot)}`,
      { redirect: "manual" },
    );
    const cookie = authResponse.headers.get("set-cookie") ?? "";
    const authedHeaders = {
      cookie,
      origin: `http://127.0.0.1:${daemon.info.port}`,
      "content-type": "text/yaml",
    };

    // Invalid YAML is refused before touching disk.
    const invalid = await fetch(checksUrl, {
      method: "PUT",
      headers: authedHeaders,
      body: "this: : not: valid: yaml",
    });
    expect(invalid.status).toBe(422);
    expect(readFileSync(checksPath, "utf8")).toBe("version: 1\nchecks: []\n");

    // Valid YAML is written through.
    const nextYaml = "version: 1\nchecks:\n  - id: lint\n    label: Lint\n    cmd: npm run lint\n";
    const ok = await fetch(checksUrl, {
      method: "PUT",
      headers: authedHeaders,
      body: nextYaml,
    });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ok: true });
    expect(readFileSync(checksPath, "utf8")).toContain("id: lint");

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

  it("routes control commands to registered control sockets", async () => {
    const homeDir = makeHomeDir();
    const daemon = await startDaemonProcess({ homeDir, version: "test" });

    await fetch(`http://127.0.0.1:${daemon.info.port}/v1/events`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${daemon.info.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(COPILOT_SESSION_START),
    });

    const sessionKey = `${COPILOT_SESSION_START.project_hash}:copilot:${COPILOT_SESSION_START.session_id}`;
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(
        `ws://127.0.0.1:${daemon.info.port}/v1/stream`,
        `holdpoint-${daemon.info.token}`,
      );
      ws.on("open", () => {
        ws.send(JSON.stringify({ type: "register_control", session_key: sessionKey }));
      });
      ws.on("message", async (data) => {
        const payload = JSON.parse(String(data)) as {
          type: string;
          for?: string;
          session_key?: string;
          command?: { command: string };
        };
        if (payload.type === "ack" && payload.for === sessionKey) {
          const response = await fetch(`http://127.0.0.1:${daemon.info.port}/v1/control`, {
            method: "POST",
            headers: {
              authorization: `Bearer ${daemon.info.token}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              session_key: sessionKey,
              command: {
                command: "trigger_tool",
                args: {
                  tool_name: "holdpoint_dry_run",
                  input: {},
                },
                actor: "user",
              },
            }),
          });
          expect(response.status).toBe(200);
          return;
        }
        if (payload.type === "control") {
          expect(payload.session_key).toBe(sessionKey);
          expect(payload.command?.command).toBe("trigger_tool");
          ws.close();
          resolve();
        }
      });
      ws.on("error", reject);
    });

    const events = await fetch(
      `http://127.0.0.1:${daemon.info.port}/v1/sessions/${encodeURIComponent(sessionKey)}/events`,
      {
        headers: { authorization: `Bearer ${daemon.info.token}` },
      },
    ).then(async (response) => await response.json());
    expect(
      events.events.some(
        (event: EventV1) =>
          event.type === "meta" && event.payload.kind === "control_socket_registered",
      ),
    ).toBe(true);
    expect(events.events.some((event: EventV1) => event.type === "control")).toBe(true);

    await daemon.close();
  });
});
