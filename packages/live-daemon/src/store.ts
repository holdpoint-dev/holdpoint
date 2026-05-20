import { appendFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { EventV1, ProjectSummary, SessionSummary } from "@holdpoint/live-protocol";
import { EventV1Schema } from "@holdpoint/live-protocol";
import { ConflictTracker } from "./conflict-tracker.js";
import { identifyProject } from "./project-identity.js";

interface StoredProject extends ProjectSummary {
  root: string;
}

interface StoredSession extends SessionSummary {
  events: EventV1[];
  filePath: string;
}

function sessionFileName(engine: string, sessionId: string): string {
  return `${encodeURIComponent(engine)}-${encodeURIComponent(sessionId)}.jsonl`;
}

async function readJsonl(filePath: string): Promise<EventV1[]> {
  const raw = await readFile(filePath, "utf8");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [EventV1Schema.parse(JSON.parse(line))];
      } catch {
        return [];
      }
    });
}

export function buildSessionKey(
  event: Pick<EventV1, "project_hash" | "engine" | "session_id">,
): string {
  return `${event.project_hash}:${event.engine}:${event.session_id}`;
}

export class LiveStore {
  private readonly homeDir: string;
  private readonly projects = new Map<string, StoredProject>();
  private readonly sessions = new Map<string, StoredSession>();
  private readonly projectIdentityCache = new Map<string, ReturnType<typeof identifyProject>>();
  private readonly conflictTracker = new ConflictTracker();
  private nextSeq = 1;

  private constructor(homeDir: string) {
    this.homeDir = homeDir;
  }

  static async create(homeDir: string): Promise<LiveStore> {
    const store = new LiveStore(homeDir);
    await store.hydrate();
    return store;
  }

  async replayPending(): Promise<void> {
    const pendingDir = join(this.homeDir, "spool", "pending");
    if (!existsSync(pendingDir)) return;
    const entries = await readdir(pendingDir);
    for (const entry of entries.filter((name) => name.endsWith(".jsonl"))) {
      const filePath = join(pendingDir, entry);
      const events = await readJsonl(filePath);
      if (events.length > 0) {
        await this.ingestMany(events);
      }
      await rm(filePath, { force: true });
    }
  }

  async ingestMany(events: EventV1[]): Promise<EventV1[]> {
    const accepted: EventV1[] = [];
    for (const event of events) {
      accepted.push(...(await this.ingest(event)));
    }
    return accepted;
  }

  async ingest(event: EventV1): Promise<EventV1[]> {
    const accepted: EventV1[] = [];
    const storedPrimary = await this.persistEvent(event);
    accepted.push(storedPrimary);

    for (const derivedEvent of this.conflictTracker.handleEvent(storedPrimary)) {
      accepted.push(await this.persistEvent(derivedEvent));
    }

    return accepted;
  }

  listProjects(): ProjectSummary[] {
    return [...this.projects.values()].sort((a, b) => b.last_active - a.last_active);
  }

  listSessions(projectHash?: string): SessionSummary[] {
    return [...this.sessions.values()]
      .filter((session) => !projectHash || session.project_hash === projectHash)
      .sort((a, b) => b.last_event_at - a.last_event_at)
      .map(({ events: _events, filePath: _filePath, ...summary }) => summary);
  }

  getSessionEvents(sessionKey: string, sinceSeq = 0, limit = 500): EventV1[] {
    const session = this.sessions.get(sessionKey);
    if (!session) return [];
    return session.events.filter((event) => (event.seq ?? 0) > sinceSeq).slice(-limit);
  }

  getProjectEvents(projectHash: string, sinceSeq = 0, limit = 500): EventV1[] {
    return [...this.sessions.values()]
      .filter((session) => session.project_hash === projectHash)
      .flatMap((session) => session.events)
      .filter((event) => (event.seq ?? 0) > sinceSeq)
      .sort((left, right) => (left.seq ?? 0) - (right.seq ?? 0))
      .slice(-limit);
  }

  getAllEvents(sinceSeq = 0, limit = 1_000): EventV1[] {
    return [...this.sessions.values()]
      .flatMap((session) => session.events)
      .filter((event) => (event.seq ?? 0) > sinceSeq)
      .sort((left, right) => (left.seq ?? 0) - (right.seq ?? 0))
      .slice(-limit);
  }

  getLatestSeq(projectHash?: string): number {
    const sessions = [...this.sessions.values()].filter(
      (session) => !projectHash || session.project_hash === projectHash,
    );
    return sessions.reduce((maxSeq, session) => Math.max(maxSeq, session.last_seq ?? 0), 0);
  }

  getSessionLatestSeq(sessionKey: string): number {
    return this.sessions.get(sessionKey)?.last_seq ?? 0;
  }

  async purgeSession(sessionKey: string): Promise<boolean> {
    const session = this.sessions.get(sessionKey);
    if (!session) return false;
    this.sessions.delete(sessionKey);
    await rm(session.filePath, { force: true });

    const project = this.projects.get(session.project_hash);
    if (!project) {
      return true;
    }

    const remainingSessions = [...this.sessions.values()].filter(
      (candidate) => candidate.project_hash === session.project_hash,
    );
    if (remainingSessions.length === 0) {
      this.projects.delete(session.project_hash);
      return true;
    }

    project.session_count = remainingSessions.length;
    project.last_active = remainingSessions.reduce(
      (latest, candidate) => Math.max(latest, candidate.last_event_at),
      0,
    );

    const projectDir = join(this.homeDir, "sessions", session.project_hash);
    await writeFile(join(projectDir, "meta.json"), JSON.stringify(project, null, 2) + "\n", {
      encoding: "utf8",
      mode: 0o600,
    });
    return true;
  }

  private async persistEvent(event: EventV1): Promise<EventV1> {
    const storedEvent: EventV1 = {
      ...event,
      seq: event.seq ?? this.nextSeq++,
    };

    this.upsertProject(storedEvent);
    const session = this.upsertSession(storedEvent);
    const projectDir = join(this.homeDir, "sessions", storedEvent.project_hash);
    await mkdir(projectDir, { recursive: true, mode: 0o700 });
    await appendFile(session.filePath, JSON.stringify(storedEvent) + "\n", {
      encoding: "utf8",
      mode: 0o600,
    });
    await writeFile(
      join(projectDir, "meta.json"),
      JSON.stringify(this.projects.get(storedEvent.project_hash), null, 2) + "\n",
      { encoding: "utf8", mode: 0o600 },
    );

    return storedEvent;
  }

  private upsertProject(event: EventV1): void {
    const identity = this.getProjectIdentity(event.cwd);
    const existing = this.projects.get(event.project_hash);
    const sessionCount = existing?.session_count ?? 0;
    this.projects.set(event.project_hash, {
      project_hash: event.project_hash,
      name: existing?.name ?? identity.name,
      root: existing?.root ?? identity.root,
      last_active: Math.max(existing?.last_active ?? 0, event.ts),
      session_count: sessionCount,
    });
  }

  private upsertSession(event: EventV1): StoredSession {
    const key = buildSessionKey(event);
    const existing = this.sessions.get(key);
    const filePath =
      existing?.filePath ??
      join(
        this.homeDir,
        "sessions",
        event.project_hash,
        sessionFileName(event.engine, event.session_id),
      );
    const events = [...(existing?.events ?? []), event];
    const session: StoredSession = {
      key,
      project_hash: event.project_hash,
      engine: event.engine,
      session_id: event.session_id,
      cwd: event.cwd,
      last_event_at: event.ts,
      last_seq: event.seq,
      event_count: events.length,
      caps: event.caps ?? existing?.caps,
      events,
      filePath,
    };
    this.sessions.set(key, session);

    const project = this.projects.get(event.project_hash);
    if (project) {
      project.session_count = [...this.sessions.values()].filter(
        (candidate) => candidate.project_hash === event.project_hash,
      ).length;
      project.last_active = Math.max(project.last_active, event.ts);
    }

    return session;
  }

  private getProjectIdentity(cwd: string): ReturnType<typeof identifyProject> {
    const cached = this.projectIdentityCache.get(cwd);
    if (cached) {
      return cached;
    }
    const identity = identifyProject(cwd);
    this.projectIdentityCache.set(cwd, identity);
    return identity;
  }

  private async hydrate(): Promise<void> {
    const sessionsRoot = join(this.homeDir, "sessions");
    if (!existsSync(sessionsRoot)) return;

    const projectEntries = await readdir(sessionsRoot, { withFileTypes: true });
    for (const projectDirEntry of projectEntries) {
      if (!projectDirEntry.isDirectory()) continue;
      const projectHash = projectDirEntry.name;
      const projectDir = join(sessionsRoot, projectHash);
      const files = await readdir(projectDir);
      let loadedProject: StoredProject | undefined;
      const metaPath = join(projectDir, "meta.json");
      if (existsSync(metaPath)) {
        try {
          loadedProject = JSON.parse(await readFile(metaPath, "utf8")) as StoredProject;
        } catch {
          loadedProject = undefined;
        }
      }

      for (const file of files.filter((entry) => entry.endsWith(".jsonl"))) {
        const filePath = join(projectDir, file);
        const rawEvents = await readJsonl(filePath);
        if (rawEvents.length === 0) continue;

        const events = rawEvents
          .sort((left, right) => {
            const leftSeq = left.seq ?? 0;
            const rightSeq = right.seq ?? 0;
            if (leftSeq !== rightSeq) return leftSeq - rightSeq;
            return left.ts - right.ts;
          })
          .map((event) => {
            const seq = event.seq ?? this.nextSeq++;
            this.nextSeq = Math.max(this.nextSeq, seq + 1);
            return {
              ...event,
              seq,
            };
          });

        const first = events[0];
        const last = events[events.length - 1];
        if (!first || !last) continue;
        const key = buildSessionKey(first);
        this.sessions.set(key, {
          key,
          project_hash: first.project_hash,
          engine: first.engine,
          session_id: first.session_id,
          cwd: first.cwd,
          last_event_at: last.ts,
          last_seq: last.seq,
          event_count: events.length,
          caps: last.caps,
          events,
          filePath,
        });

        if (!loadedProject) {
          const identity = this.getProjectIdentity(first.cwd);
          loadedProject = {
            project_hash: first.project_hash,
            name: identity.name,
            root: identity.root,
            last_active: last.ts,
            session_count: 0,
          };
        } else {
          loadedProject.last_active = Math.max(loadedProject.last_active, last.ts);
        }
      }

      if (loadedProject) {
        loadedProject.session_count = [...this.sessions.values()].filter(
          (session) => session.project_hash === projectHash,
        ).length;
        this.projects.set(projectHash, loadedProject);
      }
    }
  }
}
