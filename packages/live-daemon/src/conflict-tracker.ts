import { randomUUID } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import type { EventV1 } from "@holdpoint/live-protocol";

const DEFAULT_LOCK_TTL_MS = 30_000;

interface FileLock {
  sessionKey: string;
  engine: string;
  sessionId: string;
  expiresAt: number;
}

type LockEvent = Extract<EventV1, { type: "tool_pre" | "tool_post" | "tool_failure" }>;

function buildSessionKey(event: Pick<EventV1, "project_hash" | "engine" | "session_id">): string {
  return `${event.project_hash}:${event.engine}:${event.session_id}`;
}

function normalizeWriteTarget(cwd: string, target: string): string {
  const resolved = resolve(cwd, target);
  return existsSync(resolved) ? realpathSync.native(resolved) : resolved;
}

function getWriteTargets(event: LockEvent, activeTargets: Map<string, string[]>): string[] {
  const toolKey = `${buildSessionKey(event)}:${event.payload.tool_use_id}`;
  if (event.type === "tool_pre") {
    return (event.payload.write_targets ?? []).map((target: string) =>
      normalizeWriteTarget(event.cwd, target),
    );
  }

  return (
    (event.type === "tool_post"
      ? event.payload.write_targets?.map((target: string) =>
          normalizeWriteTarget(event.cwd, target),
        )
      : undefined) ??
    activeTargets.get(toolKey) ??
    []
  );
}

export class ConflictTracker {
  private readonly lockTtlMs: number;
  private readonly locksByProject = new Map<string, Map<string, FileLock>>();
  private readonly activeTargets = new Map<string, string[]>();
  private readonly emittedConflicts = new Map<string, number>();

  constructor(lockTtlMs = DEFAULT_LOCK_TTL_MS) {
    this.lockTtlMs = lockTtlMs;
  }

  handleEvent(event: EventV1): EventV1[] {
    switch (event.type) {
      case "tool_pre":
        return this.handleToolPre(event);
      case "tool_post":
      case "tool_failure":
        this.releaseLocks(event);
        return [];
      default:
        return [];
    }
  }

  private handleToolPre(event: Extract<EventV1, { type: "tool_pre" }>): EventV1[] {
    const sessionKey = buildSessionKey(event);
    const toolKey = `${sessionKey}:${event.payload.tool_use_id}`;
    const writeTargets = getWriteTargets(event, this.activeTargets);
    if (writeTargets.length === 0) {
      return [];
    }

    this.activeTargets.set(toolKey, writeTargets);
    const projectLocks = this.getProjectLocks(event.project_hash);
    this.pruneExpiredLocks(projectLocks, event.ts);

    const conflicts: EventV1[] = [];
    for (const filePath of writeTargets) {
      const existing = projectLocks.get(filePath);
      if (!existing) {
        projectLocks.set(filePath, {
          sessionKey,
          engine: event.engine,
          sessionId: event.session_id,
          expiresAt: event.ts + this.lockTtlMs,
        });
        continue;
      }

      if (existing.sessionKey === sessionKey) {
        existing.expiresAt = event.ts + this.lockTtlMs;
        continue;
      }

      const dedupeKey = `${event.project_hash}:${filePath}:${existing.sessionKey}:${sessionKey}`;
      const previousEmission = this.emittedConflicts.get(dedupeKey) ?? 0;
      if (previousEmission > event.ts) {
        continue;
      }

      this.emittedConflicts.set(dedupeKey, event.ts + this.lockTtlMs);
      conflicts.push({
        v: 1,
        id: randomUUID(),
        ts: event.ts,
        engine: event.engine,
        session_id: event.session_id,
        project_hash: event.project_hash,
        cwd: event.cwd,
        type: "conflict",
        payload: {
          kind: "file_write",
          file_path: filePath,
          holder: {
            engine: existing.engine,
            session_id: existing.sessionId,
          },
          requester: {
            engine: event.engine,
            session_id: event.session_id,
          },
        },
      });
    }

    return conflicts;
  }

  private releaseLocks(event: Extract<EventV1, { type: "tool_post" | "tool_failure" }>): void {
    const sessionKey = buildSessionKey(event);
    const toolKey = `${sessionKey}:${event.payload.tool_use_id}`;
    const projectLocks = this.getProjectLocks(event.project_hash);
    const writeTargets = getWriteTargets(event, this.activeTargets);

    for (const filePath of writeTargets) {
      const existing = projectLocks.get(filePath);
      if (existing?.sessionKey === sessionKey) {
        projectLocks.delete(filePath);
      }
    }

    this.activeTargets.delete(toolKey);
    this.pruneExpiredLocks(projectLocks, event.ts);
  }

  private getProjectLocks(projectHash: string): Map<string, FileLock> {
    let existing = this.locksByProject.get(projectHash);
    if (!existing) {
      existing = new Map<string, FileLock>();
      this.locksByProject.set(projectHash, existing);
    }
    return existing;
  }

  private pruneExpiredLocks(projectLocks: Map<string, FileLock>, now: number): void {
    for (const [filePath, lock] of projectLocks.entries()) {
      if (lock.expiresAt <= now) {
        projectLocks.delete(filePath);
      }
    }

    for (const [key, expiresAt] of this.emittedConflicts.entries()) {
      if (expiresAt <= now) {
        this.emittedConflicts.delete(key);
      }
    }
  }
}
