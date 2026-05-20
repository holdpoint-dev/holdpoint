import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import os from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";

export const DaemonLockSchema = z.object({
  version: z.string().min(1),
  pid: z.number().int().positive(),
  port: z.number().int().positive(),
  token: z.string().min(1),
  started_at: z.number().int().nonnegative(),
  host: z.string().min(1),
});

export type DaemonLock = z.infer<typeof DaemonLockSchema>;

export function resolveHoldpointHome(homeDir?: string): string {
  return resolve(homeDir ?? process.env.HOLDPOINT_HOME ?? join(os.homedir(), ".holdpoint"));
}

export function ensureHoldpointHome(homeDir?: string): string {
  const root = resolveHoldpointHome(homeDir);
  mkdirSync(root, { recursive: true, mode: 0o700 });
  return root;
}

export function getDaemonLockPath(homeDir?: string): string {
  return join(resolveHoldpointHome(homeDir), "daemon.lock");
}

export function readDaemonLock(homeDir?: string): DaemonLock | null {
  const lockPath = getDaemonLockPath(homeDir);
  if (!existsSync(lockPath)) return null;
  try {
    return DaemonLockSchema.parse(JSON.parse(readFileSync(lockPath, "utf8")));
  } catch {
    return null;
  }
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function findFreePort(host = "127.0.0.1"): Promise<number> {
  return await new Promise<number>((resolvePromise, reject) => {
    const server = createServer();
    server.listen(0, host, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Expected TCP address"));
        return;
      }
      const { port } = address;
      server.close((err) => {
        if (err) reject(err);
        else resolvePromise(port);
      });
    });
    server.on("error", reject);
  });
}

export function createDaemonLock(port: number, version: string): DaemonLock {
  return {
    version,
    pid: process.pid,
    port,
    token: randomBytes(32).toString("hex"),
    started_at: Date.now(),
    host: `${os.platform()}-${os.arch()}`,
  };
}

export function writeDaemonLockExclusive(lock: DaemonLock, homeDir?: string): void {
  ensureHoldpointHome(homeDir);
  writeFileSync(getDaemonLockPath(homeDir), JSON.stringify(lock, null, 2) + "\n", {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
}

export function removeDaemonLock(homeDir?: string, expectedToken?: string): void {
  const lockPath = getDaemonLockPath(homeDir);
  if (!existsSync(lockPath)) return;
  if (expectedToken) {
    const lock = readDaemonLock(homeDir);
    if (!lock || lock.token !== expectedToken) {
      return;
    }
  }
  try {
    unlinkSync(lockPath);
  } catch {
    /* ignore cleanup races */
  }
}

async function fetchHealth(port: number, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function waitForDaemonHealthy(
  lock: DaemonLock,
  timeoutMs = 5_000,
  pollMs = 100,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fetchHealth(lock.port, Math.min(pollMs, timeoutMs))) {
      return true;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, pollMs));
  }
  return false;
}

export async function readHealthyDaemonLock(homeDir?: string): Promise<DaemonLock | null> {
  const lock = readDaemonLock(homeDir);
  if (!lock) return null;
  if (!isProcessAlive(lock.pid)) {
    removeDaemonLock(homeDir);
    return null;
  }
  if (!(await waitForDaemonHealthy(lock, 300, 100))) {
    removeDaemonLock(homeDir);
    return null;
  }
  return lock;
}
