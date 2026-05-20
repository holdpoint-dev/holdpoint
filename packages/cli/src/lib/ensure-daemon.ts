import { spawn } from "node:child_process";
import { readHealthyDaemonLock, type DaemonLock } from "@holdpoint/live-daemon";

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

export async function ensureDaemon(timeoutMs = 5_000): Promise<{
  info: DaemonLock;
  started: boolean;
}> {
  const existing = await readHealthyDaemonLock();
  if (existing) {
    return { info: existing, started: false };
  }

  const cliEntry = process.argv[1];
  if (!cliEntry) {
    throw new Error("Cannot determine the current holdpoint CLI entrypoint");
  }
  const child = spawn(process.execPath, [cliEntry, "daemon-serve"], {
    stdio: "ignore",
    env: process.env,
    cwd: process.cwd(),
  });
  child.unref();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const lock = await readHealthyDaemonLock();
    if (lock) {
      return { info: lock, started: true };
    }
    await sleep(100);
  }

  throw new Error("Daemon unavailable + cannot spawn");
}
