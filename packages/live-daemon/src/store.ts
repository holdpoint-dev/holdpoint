import { mkdir, readdir, readFile, rm, writeFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { EventV1, ProjectSummary, SessionSummary } from "@holdpoint/live-protocol";
import { EventV1Schema } from "@holdpoint/live-protocol";
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

  async ingestMany(events: EventV1[]): Promise<void> {
    for (const event of events) {
      await this.ingest(event);
    }
  }

  async ingest(event: EventV1): Promise<void> {
    const projectIdentity = identifyProject(event.cwd);
    const project: StoredProject = {
      project_hash: event.project_hash,
      name: projectIdentity.name,
      root: projectIdentity.root,
      last_active: event.ts,
      session_count: 0,
    };
    const existingProject = this.projects.get(event.project_hash);
    this.projects.set(event.project_hash, {
      ...project,
      session_count: existingProject?.session_count ?? 0,
      last_active: Math.max(existingProject?.last_active ?? 0, event.ts),
    });

    const key = buildSessionKey(event);
    const existingSession = this.sessions.get(key);
    const filePath =
      existingSession?.filePath ??
      join(
        this.homeDir,
        "sessions",
        event.project_hash,
        sessionFileName(event.engine, event.session_id),
      );
    const events = [...(existingSession?.events ?? []), event];
    const session: StoredSession = {
      key,
      project_hash: event.project_hash,
      engine: event.engine,
      session_id: event.session_id,
      cwd: event.cwd,
      last_event_at: event.ts,
      event_count: events.length,
      caps: event.caps ?? existingSession?.caps,
      events,
      filePath,
    };
    this.sessions.set(key, session);

    const sessionsForProject = [...this.sessions.values()].filter(
      (candidate) => candidate.project_hash === event.project_hash,
    ).length;
    const updatedProject = this.projects.get(event.project_hash);
    if (updatedProject) {
      updatedProject.session_count = sessionsForProject;
    }

    const projectDir = join(this.homeDir, "sessions", event.project_hash);
    await mkdir(projectDir, { recursive: true, mode: 0o700 });
    await appendFile(filePath, JSON.stringify(event) + "\n", { encoding: "utf8", mode: 0o600 });
    await writeFile(
      join(projectDir, "meta.json"),
      JSON.stringify(this.projects.get(event.project_hash), null, 2) + "\n",
      { encoding: "utf8", mode: 0o600 },
    );
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

  getSessionEvents(sessionKey: string, since = 0, limit = 500): EventV1[] {
    const session = this.sessions.get(sessionKey);
    if (!session) return [];
    return session.events.filter((event) => event.ts > since).slice(-limit);
  }

  async purgeSession(sessionKey: string): Promise<boolean> {
    const session = this.sessions.get(sessionKey);
    if (!session) return false;
    this.sessions.delete(sessionKey);
    await rm(session.filePath, { force: true });
    const project = this.projects.get(session.project_hash);
    if (project) {
      project.session_count = [...this.sessions.values()].filter(
        (candidate) => candidate.project_hash === session.project_hash,
      ).length;
      if (project.session_count === 0) {
        this.projects.delete(session.project_hash);
      } else {
        const projectDir = join(this.homeDir, "sessions", session.project_hash);
        await writeFile(join(projectDir, "meta.json"), JSON.stringify(project, null, 2) + "\n", {
          encoding: "utf8",
          mode: 0o600,
        });
      }
    }
    return true;
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
        const events = await readJsonl(filePath);
        if (events.length === 0) continue;
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
          event_count: events.length,
          caps: last.caps,
          events,
          filePath,
        });

        if (!loadedProject) {
          const identity = identifyProject(first.cwd);
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
