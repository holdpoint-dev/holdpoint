import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { EventV1 } from "@holdpoint/live-protocol";

interface DaemonLock {
  pid: number;
  port: number;
  token: string;
  started_at: number;
  version: string;
  host: string;
}

export interface BridgeClientOptions {
  homeDir?: string;
  timeoutMs?: number;
}

export interface BridgeClientResult {
  status: "sent" | "queued" | "skipped";
  accepted?: number;
}

function resolveHoldpointHome(homeDir?: string): string {
  return resolve(homeDir ?? process.env.HOLDPOINT_HOME ?? join(os.homedir(), ".holdpoint"));
}

function readDaemonLock(homeDir?: string): DaemonLock | null {
  const lockPath = join(resolveHoldpointHome(homeDir), "daemon.lock");
  if (!existsSync(lockPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(lockPath, "utf8")) as Partial<DaemonLock>;
    if (
      typeof parsed.pid === "number" &&
      typeof parsed.port === "number" &&
      typeof parsed.token === "string" &&
      typeof parsed.started_at === "number" &&
      typeof parsed.version === "string" &&
      typeof parsed.host === "string"
    ) {
      return parsed as DaemonLock;
    }
  } catch {
    return null;
  }
  return null;
}

function queuePendingEvents(events: EventV1[], homeDir?: string): void {
  const root = resolveHoldpointHome(homeDir);
  const pendingDir = join(root, "spool", "pending");
  mkdirSync(pendingDir, { recursive: true });
  const fileName = `${events[0]?.engine ?? "event"}-${randomUUID()}.jsonl`;
  const content = events.map((event) => JSON.stringify(event)).join("\n") + "\n";
  writeFileSync(join(pendingDir, fileName), content, { mode: 0o600 });
}

async function postJson(
  lock: DaemonLock,
  path: string,
  body: unknown,
  timeoutMs: number,
): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`http://127.0.0.1:${lock.port}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${lock.token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Daemon responded ${response.status}`);
    }
    const parsed = (await response.json()) as { accepted?: number };
    return parsed.accepted ?? 0;
  } finally {
    clearTimeout(timeout);
  }
}

function daemonDisabled(): boolean {
  const value = process.env.HOLDPOINT_NO_DAEMON?.toLowerCase();
  return value === "1" || value === "true";
}

export class BridgeClient {
  private readonly homeDir: string | undefined;
  private readonly timeoutMs: number;

  constructor(options: BridgeClientOptions = {}) {
    this.homeDir = options.homeDir;
    this.timeoutMs = options.timeoutMs ?? 250;
  }

  async sendEvent(event: EventV1): Promise<BridgeClientResult> {
    return this.sendEvents([event]);
  }

  async sendEvents(events: EventV1[]): Promise<BridgeClientResult> {
    if (events.length === 0) {
      return { status: "skipped", accepted: 0 };
    }

    if (daemonDisabled()) {
      return { status: "skipped", accepted: 0 };
    }

    const lock = readDaemonLock(this.homeDir);
    if (!lock) {
      queuePendingEvents(events, this.homeDir);
      return { status: "queued", accepted: events.length };
    }

    try {
      const accepted =
        events.length === 1
          ? await postJson(lock, "/v1/events", events[0], this.timeoutMs)
          : await postJson(lock, "/v1/events/batch", events, this.timeoutMs);
      return { status: "sent", accepted };
    } catch {
      queuePendingEvents(events, this.homeDir);
      return { status: "queued", accepted: events.length };
    }
  }
}
