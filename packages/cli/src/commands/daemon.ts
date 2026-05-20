import chalk from "chalk";
import {
  DaemonAlreadyRunningError,
  isProcessAlive,
  readDaemonLock,
  readHealthyDaemonLock,
  removeDaemonLock,
  startDaemonProcess,
  type DaemonLock,
} from "@holdpoint/live-daemon";
import { ensureDaemon } from "../lib/ensure-daemon.js";
import { CLI_VERSION } from "../version.js";

function formatUptime(lock: DaemonLock): string {
  const seconds = Math.max(0, Math.floor((Date.now() - lock.started_at) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

async function fetchSessionCount(lock: DaemonLock): Promise<number | null> {
  try {
    const response = await fetch(`http://127.0.0.1:${lock.port}/v1/sessions`, {
      headers: {
        authorization: `Bearer ${lock.token}`,
      },
    });
    if (!response.ok) return null;
    const parsed = (await response.json()) as { sessions?: unknown[] };
    return Array.isArray(parsed.sessions) ? parsed.sessions.length : null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

export async function daemonStartCommand(): Promise<void> {
  const { info, started } = await ensureDaemon();
  const sessionCount = await fetchSessionCount(info);
  const headline = started
    ? "Started Holdpoint Live daemon"
    : "Reused existing Holdpoint Live daemon";
  console.log(chalk.green(`✓ ${headline}`));
  console.log(`  pid: ${chalk.cyan(String(info.pid))}`);
  console.log(`  port: ${chalk.cyan(String(info.port))}`);
  console.log(`  uptime: ${chalk.cyan(formatUptime(info))}`);
  if (sessionCount !== null) {
    console.log(`  sessions: ${chalk.cyan(String(sessionCount))}`);
  }
}

export async function daemonStatusCommand(): Promise<void> {
  const lock = await readHealthyDaemonLock();
  if (!lock) {
    console.log(chalk.yellow("Holdpoint Live daemon is not running."));
    return;
  }

  const sessionCount = await fetchSessionCount(lock);
  console.log(chalk.green("✓ Holdpoint Live daemon is running"));
  console.log(`  pid: ${chalk.cyan(String(lock.pid))}`);
  console.log(`  port: ${chalk.cyan(String(lock.port))}`);
  console.log(`  uptime: ${chalk.cyan(formatUptime(lock))}`);
  if (sessionCount !== null) {
    console.log(`  sessions: ${chalk.cyan(String(sessionCount))}`);
  }
}

export async function daemonStopCommand(): Promise<void> {
  const lock = readDaemonLock();
  if (!lock) {
    console.log(chalk.yellow("Holdpoint Live daemon is not running."));
    return;
  }

  if (!isProcessAlive(lock.pid)) {
    removeDaemonLock(undefined, lock.token);
    console.log(chalk.yellow("Removed stale Holdpoint Live lockfile."));
    return;
  }

  process.kill(lock.pid, "SIGTERM");
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (!isProcessAlive(lock.pid)) {
      removeDaemonLock(undefined, lock.token);
      console.log(chalk.green(`✓ Stopped Holdpoint Live daemon (${lock.pid})`));
      return;
    }
    await sleep(100);
  }

  process.kill(lock.pid, "SIGKILL");
  await sleep(100);
  removeDaemonLock(undefined, lock.token);
  console.log(chalk.green(`✓ Force-stopped Holdpoint Live daemon (${lock.pid})`));
}

export async function daemonServeCommand(options: { port?: string }): Promise<void> {
  try {
    const daemon = await startDaemonProcess({
      version: CLI_VERSION,
      ...(options.port ? { port: Number(options.port) } : {}),
    });
    await daemon.closed;
  } catch (error) {
    if (error instanceof DaemonAlreadyRunningError) {
      process.exit(0);
    }
    throw error;
  }
}
