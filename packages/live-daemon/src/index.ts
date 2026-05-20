import {
  removeDaemonLock,
  createDaemonLock,
  findFreePort,
  readHealthyDaemonLock,
  type DaemonLock,
  writeDaemonLockExclusive,
  resolveHoldpointHome,
} from "./singleton.js";
import { startLiveServer, type RunningLiveServer } from "./server.js";
import { LiveStore } from "./store.js";

export class DaemonAlreadyRunningError extends Error {
  readonly info: DaemonLock;

  constructor(info: DaemonLock) {
    super(`Holdpoint daemon already running on port ${info.port}`);
    this.info = info;
  }
}

export interface StartDaemonProcessOptions {
  homeDir?: string;
  port?: number;
  version: string;
}

export interface StartedDaemon {
  info: DaemonLock;
  server: RunningLiveServer;
  store: LiveStore;
  close(): Promise<void>;
  closed: Promise<void>;
}

export async function startDaemonProcess(
  options: StartDaemonProcessOptions,
): Promise<StartedDaemon> {
  const existing = await readHealthyDaemonLock(options.homeDir);
  if (existing) {
    throw new DaemonAlreadyRunningError(existing);
  }

  const port = options.port ?? (await findFreePort());
  const info = createDaemonLock(port, options.version);
  writeDaemonLockExclusive(info, options.homeDir);

  const store = await LiveStore.create(resolveHoldpointHome(options.homeDir));
  await store.replayPending();

  let server: RunningLiveServer;
  try {
    server = await startLiveServer({
      port,
      token: info.token,
      version: options.version,
      startedAt: info.started_at,
      store,
    });
  } catch (error) {
    removeDaemonLock(options.homeDir, info.token);
    throw error;
  }

  let closed = false;
  const cleanup = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    removeDaemonLock(options.homeDir, info.token);
    await server.close();
  };

  const onSignal = (): void => {
    void cleanup().finally(() => process.exit(0));
  };

  process.once("SIGTERM", onSignal);
  process.once("SIGINT", onSignal);

  return {
    info,
    server,
    store,
    close: cleanup,
    closed: server.closed.finally(() => {
      process.off("SIGTERM", onSignal);
      process.off("SIGINT", onSignal);
    }),
  };
}

export {
  createDaemonLock,
  ensureHoldpointHome,
  findFreePort,
  getDaemonLockPath,
  isProcessAlive,
  readDaemonLock,
  readHealthyDaemonLock,
  removeDaemonLock,
  resolveHoldpointHome,
  waitForDaemonHealthy,
  writeDaemonLockExclusive,
} from "./singleton.js";
export { identifyProject } from "./project-identity.js";
export { startLiveServer } from "./server.js";
export { buildSessionKey, LiveStore } from "./store.js";
export type { ProjectIdentity } from "./project-identity.js";
export type { RunningLiveServer } from "./server.js";
export type { DaemonLock } from "./singleton.js";
