# Holdpoint Live — Feature Spec & MVP Plan

> **Status:** In progress — Phase 1-5 core landed + unified Live/Builder daemon UI · **Owner:** TBD · **Last updated:** 2026-05-27
> **Purpose:** Vollständiges Lastenheft für die Live-Beobachtungsschicht von Holdpoint. Detailliert genug, dass ein Implementations-Agent (Claude, Copilot, Codex) jeden Punkt eigenständig umsetzen kann.

---

## 0. Kontext

Holdpoint ist heute ein eval-guard für AI-Coding-Agents: `checks.yaml` definiert was passen muss bevor ein Agent eine Aufgabe als done markieren darf. Engine-Adapter generieren pro Agent (Claude Code, Copilot CLI, Codex, Cursor) die jeweiligen Hook-/Extension-Files.

**Live** erweitert Holdpoint um eine real-time Observability- und Steuerungsschicht. Während Agents arbeiten, fliessen ihre Lifecycle-Events (Tool-Calls, File-Writes, Prompts, Stops) durch einen lokalen Daemon in eine Web-UI. Der User sieht parallel laufende Sessions, erkennt Konflikte zwischen Agents, und kann (wo die Agent-API das hergibt) live steuern.

Live ist **additiv**: Holdpoint funktioniert ohne Live unverändert wie bisher. Wer Live nicht braucht, merkt nichts davon.

**Produktpositionierung:** Holdpoint Live ist **für alle Engines beobachtbar**, aber nur dort **live steuerbar**, wo die Agent-API einen persistenten bidirektionalen Kanal erlaubt. Für v1 bedeutet das: universelle Observability für Claude/Codex/Copilot, bidirektionale Control nur für Copilot Extensions.

### 0.1 Implementierungs-Tracker

| Area                                              | Status          | Notes                                                                                                                                                                     |
| ------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1 — protocol / daemon / CLI / Claude bridge | **implemented** | `@holdpoint/live-protocol`, `@holdpoint/live-daemon`, `@holdpoint/sdk`, CLI `daemon` + `event`, expanded Claude lifecycle hooks with session context, README/docs updates |
| Phase 2 — live web UI                             | **implemented** | `apps/live`, daemon static serving, reconnecting all-project WS client, project-first shell, session cards, event filters                                                 |
| Phase 3 — conflict detection                      | **implemented** | write-target aware conflict tracker, conflict events in protocol/store, passive UI conflict banners                                                                       |
| Phase 4 — Copilot live control                    | **implemented** | Copilot WS bridge, typed control commands, pending permission lifecycle, queued context injection, bounded completion gate events, and `holdpoint_dry_run`                |
| Phase 5 — plugin SDK / discovery                  | **implemented** | manifest v1, CLI discovery, `holdpoint engines`, Claude + Cursor adapter registry, repo-local template, README/docs sync                                                  |
| UI consolidation — Live + Builder routes          | **implemented** | Daemon serves `/live/` and `/builder/`; `holdpoint builder` reuses the singleton daemon instead of starting a second localhost server                                     |

### 0.2 Granulare To-dos

#### Phase 1 — Foundation

- [x] P1-01 Create `@holdpoint/live-protocol` with Zod event schema plus HTTP / WS message types.
- [x] P1-02 Create `@holdpoint/live-daemon` with singleton lockfile helpers, auth, session store, pending spool replay, HTTP API, and WS stream.
- [x] P1-03 Create `@holdpoint/sdk` with `BridgeClient` and `LiveAdapter`.
- [x] P1-04 Extend `@holdpoint/cli` with `holdpoint daemon start|status|stop`, internal `daemon-serve`, and `holdpoint event`.
- [x] P1-05 Add `ensureDaemon()` helper for CLI-controlled singleton spawn / connect flow.
- [x] P1-06 Extend `holdpoint check` to emit best-effort `check_run` events into Live.
- [x] P1-07 Extend `@holdpoint/engine-claude` to emit best-effort Live hook events while preserving blocking check hooks. Current coverage includes SessionStart context injection, prompt/tool/permission/notification/subagent/compaction/session lifecycle events, and exit-2 completion gates.
- [x] P1-08 Add Phase 1 tests for protocol validation, bridge buffering, singleton lock handling, daemon server/store behaviour, and Claude engine output.
- [x] P1-09 Update README + docs for Live alpha and new CLI / Claude surfaces.

#### Phase 1 — Explicitly deferred after this pass

- [ ] P1-D1 Auto-spawn the daemon from every hook event path. Current implementation prefers best-effort spool buffering to keep hook latency low.
- [x] P1-D2 Serve the real Live UI from `/`. Implemented in Phase 2 by bundling `apps/live` into the daemon build.
- [ ] P1-D3 Add auto-shutdown / persistent daemon config. The daemon is explicit-start for now.
- [ ] P1-D4 Attach `check_run` events to the originating agent session instead of the shared `holdpoint/check-runner` stream.

#### Phase 2 — Live Web UI

- [x] P2-01 Create `apps/live/` as a Vite/React app and bundle its build output into the daemon static assets.
- [x] P2-02 Add a project-first shell: sidebar lists all known projects; main panel shows exactly one selected project.
- [x] P2-03 Render project rows with stable color dots derived from `project_hash` and full root-path subtitles for same-name repo disambiguation.
- [x] P2-04 Add session cards with engine badge, session id tail, status, last-event timestamp, and live event counts.
- [x] P2-05 Add `EventTimeline`, `EventFilter`, and HTTP bootstrap + reconnecting WS client.
- [x] P2-06 Make `holdpoint` with no args ensure the singleton daemon and open the browser filtered to the current project when possible.

#### Phase 3 — Conflict Detection

- [x] P3-01 Add `conflict` payload/schema support in `@holdpoint/live-protocol`.
- [x] P3-02 Implement a per-project lock tracker in the daemon keyed by normalized file paths with TTL refresh.
- [x] P3-03 Detect write-intent collisions from `tool_pre` / `tool_post` events and emit conflict events only within the same project.
- [x] P3-04 Show passive UI conflict banners and lock indicators; do not inject context into agents in this phase.

#### Phase 4 — Copilot Live Control

- [x] P4-01 Upgrade `engine-copilot` to keep a persistent authenticated WS connection to the daemon and explicitly register itself as the control socket for its `session_key`.
- [x] P4-02 Extend the live protocol with typed control-command args plus explicit pending-permission lifecycle events keyed by runtime `request_id`.
- [x] P4-03 Implement `approve_pending` / `deny_pending` as **approve-once / reject** only in v1; do not offer persistent approval rules in this phase.
- [x] P4-04 Implement `inject_context` as a bounded queued developer-style addendum consumed on the next eligible hook boundary (`onUserPromptSubmitted` / `onPreToolUse`), with TTL + consumed/dropped audit events.
- [x] P4-05 Register a Holdpoint-owned control-tool registry, ship `holdpoint_dry_run` as the reference tool, and route `trigger_tool` only through that registry.
- [x] P4-06 Gate control UI by engine capabilities **and** active control-socket presence so non-bidirectional engines remain observe-only.
- [x] P4-07 Emit Copilot completion gate pass/block events into Live and bound context/check output injection so the extension remains predictable under large project guidance or verbose check failures.

#### Phase 5 — Plugin SDK / Discovery

- [x] P5-01 Freeze the external live-adapter contract (`manifest` export, `adapter.translateHookInput`, package metadata).
- [x] P5-02 Add CLI discovery for built-in live engines plus installed third-party engine packages.
- [x] P5-03 Add `holdpoint engines` for discovery/debugging output.
- [x] P5-04 Add a repo-local `examples/holdpoint-engine-template` package and adapter authoring docs.
- [x] P5-05 Register Cursor as a built-in Live adapter and route native `.cursor/hooks.json` payloads into Live.

#### UI consolidation — Live + Builder

- [x] UI-01 Serve the Live SPA at `/live/` and the visual builder SPA at `/builder/` from the singleton daemon.
- [x] UI-02 Change `holdpoint builder` to open the daemon-served `/builder/` route instead of starting a separate `localhost:4321` server.
- [x] UI-03 Protect builder bootstrap endpoints with the daemon auth cookie and bind `checks.yaml` reads to the project root registered by the CLI auth flow.
- [x] UI-04 Keep `holdpoint live` explicit while bare `holdpoint` prints help to avoid accidental browser launches from scripts.

#### Maintenance — dependency compatibility

- [x] M-01 Keep Live protocol and daemon Zod schemas compatible with current dependency versions (`z.record(key, value)` and `ZodError.issues` APIs).

---

## 1. Ziele & Nicht-Ziele

### 1.1 Ziele

- **Beobachtbarkeit:** Jede Tool-Aktion jedes unterstützten Agents wird in Echtzeit sichtbar.
- **Multi-Session:** Mehrere Agents parallel im selben oder in verschiedenen Repos werden sauber getrennt dargestellt.
- **Konflikterkennung:** Wenn zwei Agents im selben Projekt am selben File arbeiten, warnt das System.
- **Live-Steuerung (Copilot):** Aus der UI heraus permissions overriden, Context injizieren, Tools triggern.
- **Singleton:** Auf einer Maschine läuft **maximal eine** Holdpoint-Instanz. Ein zweiter `holdpoint`-Aufruf öffnet die bestehende UI, startet keinen zweiten Daemon.
- **Erweiterbar:** Eine neue Engine anzubinden kostet ≤ 100 Zeilen Code via dokumentierten LiveAdapter-Interfaces.
- **Lokal & privat:** Kein Outbound-Netzwerktraffic, keine Telemetrie. Loopback-only.

### 1.2 Nicht-Ziele (jetzt)

- Cloud-Sync / Multi-Maschinen-View.
- Multi-User auf derselben Maschine (one user per host).
- Session-Replay aus Cloud-Logs.
- Aktive Cross-Agent-Context-Injection (Stufe 3 Cross-Reporting) — explizit ausgeklammert für v1.
- Standalone-Binaries ohne Node-Dependency. Kommt später via Bun/pkg.

---

## 2. Lastenheft — funktionale Anforderungen

### F1 — Multi-engine event ingestion

| ID   | Anforderung                                                                                                                                                                |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1.1 | Der Daemon nimmt Events von Claude Code, Codex, Copilot CLI und Cursor (falls Hooks vorhanden) entgegen.                                                                   |
| F1.2 | Events erreichen den Daemon via `POST /v1/events` (für kurzlebige Hook-Prozesse) oder via WebSocket `ws://localhost:<port>/v1/stream` (für langlebige Extension-Prozesse). |
| F1.3 | Jedes Event ist gegen ein **versioniertes Zod-Schema** validiert (`@holdpoint/live-protocol`). Invalide Events werden mit `400` abgelehnt und ins Daemon-Log geschrieben.  |
| F1.4 | Hooks und Extensions verwenden dasselbe Schema. Engine-spezifische Felder leben unter `payload`.                                                                           |
| F1.5 | Ingest-Latenz **p99 < 50ms** auf einer normalen Dev-Maschine.                                                                                                              |

### F2 — Multi-session, multi-project isolation

| ID   | Anforderung                                                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- |
| F2.1 | Jede Session wird identifiziert durch `(project_hash, engine, session_id)`.                                                     |
| F2.2 | `project_hash` wird aus `git rev-parse --show-toplevel` (mit `realpath`) gebildet, Fallback auf `cwd` bei Nicht-Git-Repos.      |
| F2.3 | Sessions aus verschiedenen Projekten sind im Daemon strukturell isoliert: kein Code-Pfad sieht je zwei Projekte gleichzeitig.   |
| F2.4 | Die UI listet Projekte in einer Sidebar; der Main-View zeigt **immer nur ein** Projekt. Kein cross-project "All Sessions" view. |
| F2.5 | Jede Session bekommt eine stable Farbe (deterministischer Hash über `project_hash`).                                            |

### F3 — Singleton daemon

| ID   | Anforderung                                                                                                                              |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| F3.1 | Auf einer Maschine läuft maximal **eine** Daemon-Instanz pro User.                                                                       |
| F3.2 | Lockfile `~/.holdpoint/daemon.lock` (Mode `0600`) enthält `{ pid, port, token, started_at, version }`.                                   |
| F3.3 | Beim Start: atomar Lockfile lesen → pid alive prüfen (`process.kill(pid, 0)`) → falls alive: connecten statt starten.                    |
| F3.4 | Falls Lockfile stale (PID tot): Lockfile löschen, frisch starten.                                                                        |
| F3.5 | Sekundärer Safeguard: TCP-Bind auf Port. Schlägt der fehl, ist eine andere Instanz aktiv.                                                |
| F3.6 | `holdpoint daemon stop` killt die laufende Instanz sauber (SIGTERM, dann SIGKILL nach 5s).                                               |
| F3.7 | Race condition: Bei zwei gleichzeitig startenden Instanzen gewinnt der erste atomare `O_EXCL` Lockfile-Write; der zweite verbindet sich. |

### F4 — Live web UI

| ID   | Anforderung                                                                                                          |
| ---- | -------------------------------------------------------------------------------------------------------------------- |
| F4.1 | UI wird vom Daemon auf `http://127.0.0.1:<port>/` statisch served (Vite-built React-App).                            |
| F4.2 | Project-Sidebar mit allen bekannten Projekten, sortiert nach last-active.                                            |
| F4.3 | Active-Project-View mit Liste der Sessions als Cards.                                                                |
| F4.4 | Pro Session: live Timeline der Events (PreToolUse, PostToolUse, Prompt, Stop, CheckRun).                             |
| F4.5 | Filter pro Event-Type (Tool-Calls, Check-Runs, Conflicts, Prompts).                                                  |
| F4.6 | Auto-Reconnect bei WS-Disconnect mit exponential backoff.                                                            |
| F4.7 | Initial-State per HTTP `GET /v1/projects` + `GET /v1/sessions/<key>/events?since=<ts>` — danach Live-Updates per WS. |

### F5 — Conflict detection (Cross-Reporting Stufe 2)

| ID   | Anforderung                                                                                        |
| ---- | -------------------------------------------------------------------------------------------------- |
| F5.1 | Daemon hält pro `project_hash` einen Lock-Tracker: Map `<file_path> → { engine, session_id, ts }`. |
| F5.2 | Auf `tool_pre` mit File-Write/-Edit-Intent: Lock setzen, TTL 30s, refresht durch `tool_post`.      |
| F5.3 | Bei zweitem `tool_pre` mit kollidierendem File-Path innerhalb der TTL: Conflict-Event emittieren.  |
| F5.4 | Conflict-Events werden an **alle** Sessions im selben Projekt gepusht (sowie an die UI).           |
| F5.5 | Kein Conflict-Crosstalk zwischen verschiedenen Projekten.                                          |
| F5.6 | Conflicts werden im jsonl-Spool persistiert für Forensik.                                          |

### F6 — Copilot bidirectional control (Stufe 3 für Copilot Extensions)

| ID   | Anforderung                                                                                                         |
| ---- | ------------------------------------------------------------------------------------------------------------------- |
| F6.1 | Die Copilot-Extension `extension.mjs` hält eine persistente WS-Connection zum Daemon.                               |
| F6.2 | UI kann an die Extension senden: `approve_pending`, `deny_pending`, `inject_context <text>`, `trigger_tool <name>`. |
| F6.3 | Die Extension reagiert: bei `approve_pending` ruft sie den blockierten `permissionDecision: 'allow'` Callback, etc. |
| F6.4 | Capabilities-Flags pro Engine entscheiden ob die UI Control-Buttons rendert.                                        |
| F6.5 | Alle Override-Aktionen werden im Spool mit `actor: "user"` getaggt für Audit.                                       |

### F7 — Plugin SDK für neue Engines

| ID   | Anforderung                                                                                                                                                    |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F7.1 | `@holdpoint/sdk` exportiert `LiveAdapter` Interface + Helper für File-Generation.                                                                              |
| F7.2 | Neue Engines registrieren sich beim CLI-Boot via Workspace-Scan (`packages/engine-*`) oder via npm-Resolution (`@holdpoint-engine-*` als peer-dep konvention). |
| F7.3 | Eine Drittanbieter-Engine braucht: (a) File-Generator, (b) LiveAdapter-Implementation, (c) `capabilities` declaration. ≤ 100 Zeilen Code als Reference-Target. |
| F7.4 | Beispiel-Repo `holdpoint-engine-template` zeigt vollständige Implementation.                                                                                   |

---

## 3. Nicht-funktionale Anforderungen

### 3.1 Sicherheit

- Daemon bindet **ausschliesslich** auf `127.0.0.1`. Niemals `0.0.0.0`.
- Auth-Token (32 byte random hex) wird beim Daemon-Start generiert, im Lockfile mit Mode `0600` abgelegt.
- Alle HTTP-Endpoints (ausser `/health`) erfordern `Authorization: Bearer <token>`.
- Browser-UI authentifiziert via server-gesetztem HttpOnly-Cookie nach einem einmaligen CLI→Browser Bootstrap-Redirect; non-browser Clients können weiter `Authorization: Bearer <token>` bzw. WS-Subprotocol `holdpoint-<token>` verwenden.
- Browser-Origin-Check: nur `http://127.0.0.1:<port>` akzeptiert.
- CORS strikt: keine cross-origin Anfragen akzeptieren.
- Keine Eval, kein Shell-Exec aus User-Input (UI sendet nur typisierte Commands).
- Spool-Files Mode `0600`.

### 3.2 Performance

- Daemon-Idle-RAM **< 50 MB**.
- Event-Ingest p99 **< 50 ms**.
- UI-Render bei 1000 Events in einer Session **< 100 ms** Initial-Paint.
- Spool-Write asynchron, blockiert nie den HTTP-Response.
- WS-Push-Batch: bis zu 20 Events / 50 ms zusammenfassen.

### 3.3 Verlässlichkeit

- Hooks **müssen** auch funktionieren wenn der Daemon nicht läuft (graceful skip, kein Crash der Hook-Pipeline).
- Hooks puffern bei Daemon-Down in `~/.holdpoint/spool/pending/<engine>-<uuid>.jsonl`.
- Daemon-Boot liest Pending-Spool und ingestet vor dem Listening.
- Daemon-Crash darf keine Hook-Aufrufe verlieren (alle Writes vor Response committed).
- Spool-Rotation: pro Session-File maximal 10 MB, danach `.1`, `.2`, etc.

### 3.4 Portabilität

- macOS, Linux: primärtargets.
- Windows: best-effort (vor allem die Hook-Generator-Seite, weil Codex Hooks dort eh deaktiviert sind; siehe Codex-Spec).
- Node ≥ 18 (matches existing Holdpoint engines).
- Keine native Dependencies. Pure JS/TS.

### 3.5 Privatsphäre

- **Null Outbound-Traffic.** Keine Analytics, kein Auto-Update-Check, kein Telemetrie-Endpoint.
- Optional manuelles `holdpoint update` checkt npm registry — nur auf expliziten Aufruf.
- Lokale Logs default 7 Tage Retention, dann auto-pruned.
- `holdpoint sessions purge` löscht den gesamten Spool.

---

## 4. Architektur

### 4.1 Komponenten

```
holdpoint (umbrella package, globally installed)
├── bin/holdpoint                        ← CLI entrypoint
│
├── @holdpoint/cli                       ← existing, extended
│   ├── commands/init, check, validate, update, builder    (existing)
│   ├── commands/live                                       (new — runs/connects daemon)
│   ├── commands/sessions                                   (new — list/inspect)
│   ├── commands/daemon                                     (new — start/stop/status)
│   └── commands/event                                      (new — internal, used by hooks)
│
├── @holdpoint/live-daemon               ← new
│   ├── server (Fastify + WS)
│   ├── singleton (lockfile + port-bind)
│   ├── store (in-memory + spool persistence)
│   ├── router (event → session → project routing)
│   ├── conflict-tracker
│   └── auth (token middleware)
│
├── @holdpoint/live-ui                   ← new
│   └── React + Vite, built and bundled into daemon static dir
│
├── @holdpoint/live-protocol             ← new
│   ├── event schema (zod)
│   ├── ws protocol types
│   └── http endpoint types
│
├── @holdpoint/sdk                       ← new
│   ├── LiveAdapter interface
│   ├── bridge client (used by hooks)
│   └── helpers for file generation
│
├── @holdpoint/engine-claude             ← existing, extended
├── @holdpoint/engine-codex              ← existing, extended
├── @holdpoint/engine-copilot            ← existing, extended (live WS)
├── @holdpoint/engine-cursor             ← existing, extended (native .cursor/hooks.json)
├── @holdpoint/yaml-core                 ← existing
└── @holdpoint/types                     ← existing
```

### 4.2 Datenfluss

```
Agent ──tool call──> Hook/Extension ──POST/WS──> Daemon ──> Spool (jsonl)
                                                    │
                                                    ├──> Conflict-Tracker
                                                    │
                                                    └──> WS multiplex ──> UI
                                                                  ↑
                                                                  └── HTTP /projects, /sessions
```

### 4.3 Singleton-Mechanik (Detail)

**Lockfile-Schema** (`~/.holdpoint/daemon.lock`, Mode `0600`):

```json
{
  "version": "0.4.0",
  "pid": 12345,
  "port": 8765,
  "token": "8f7e6d5c4b3a2918...",
  "started_at": 1716220800000,
  "host": "darwin-arm64"
}
```

**Boot-Sequenz** (pseudocode):

```ts
async function ensureDaemon(): Promise<DaemonInfo> {
  const lockPath = path.join(os.homedir(), ".holdpoint", "daemon.lock");

  // 1. Try to read existing lock atomically
  const existing = readLockfileOrNull(lockPath);

  if (existing) {
    // 2. Check if process is alive
    if (isProcessAlive(existing.pid)) {
      // 3. Verify it's actually our daemon (health check)
      if (await healthCheck(existing.port, existing.token)) {
        return existing; // already running, reuse
      }
    }
    // 4. Stale lockfile — remove
    await fs.unlink(lockPath);
  }

  // 5. Acquire lock via atomic write
  const port = await findFreePort();
  const token = crypto.randomBytes(32).toString("hex");
  const info: DaemonInfo = {
    version: PKG_VERSION,
    pid: process.pid,
    port,
    token,
    started_at: Date.now(),
    host: `${os.platform()}-${os.arch()}`,
  };

  // Atomic: write to .tmp + rename with O_EXCL
  await writeLockfileExclusive(lockPath, info);

  // 6. Spawn detached daemon process
  spawnDaemon(info);

  // 7. Wait for daemon health
  await waitForHealthy(port, token, { timeoutMs: 5000 });

  return info;
}
```

**Race-Condition-Edge:** Zwei `holdpoint` Aufrufe gleichzeitig. Beide lesen Lockfile = absent. Beide rufen `writeLockfileExclusive` mit `O_EXCL`. Einer wins, der andere bekommt `EEXIST` → liest neu, findet das frische Lockfile, healthchecked, verbindet.

### 4.4 Daemon-Lifecycle

- **Current alpha:** `holdpoint` ohne Args ensured den Singleton-Daemon, bootstrapt Browser-Auth und öffnet die Live-UI im Browser; `holdpoint live` ist der explizite Alias, `holdpoint daemon start` die manuelle Variante.
- **Singleton UX:** Ein zweiter `holdpoint`-Aufruf verbindet sich mit der bestehenden Instanz statt eine neue zu starten. Mehrere Browser-Tabs sind okay; mehrere Daemons nicht.
- **Hook event path:** Hook-Event-Pfade bleiben bewusst best-effort und schreiben bei Daemon-Down in die Pending-Spool statt synchron einen Spawn zu erzwingen.
- **Hook auto-spawn:** Bleibt vorerst ein bewusst deferred Feature. Erst wenn Latenz und Robustheit belegt sind, darf ein Hook-Event-Pfad selbst einen detached Spawn anstossen.
- **Auto-Shutdown:** Geplant nach 30 min ohne aktive Sessions UND ohne UI-Clients. Configurable via `~/.holdpoint/config.json`: `auto_shutdown_ms`.
- **Explicit persistent mode:** `holdpoint daemon start --persistent` deaktiviert später Auto-Shutdown.
- **Crash:** Beim nächsten UI-/CLI-Aufruf wird neu gespawnt. Pending-Spool bleibt erhalten und wird replayed.

### 4.5 Project-first UI isolation

- Sidebar zeigt **alle** bekannten Projekte gleichzeitig, das Main-Panel aber **immer genau ein** aktives Projekt.
- Es gibt in v1 **keine** cross-project "All Sessions"-Ansicht. Versehentlich gemischte Session-Streams sind UX- und Sicherheitsfehler.
- Jedes Projekt zeigt `name` + `root` (voller Pfad als Subtitle), damit Forks / gleichnamige Repos klar unterscheidbar bleiben.
- Projektfarbe kommt aus einem stabilen Hash über den realpath des Git-Roots, nicht über den Namen.
- Session-Keys und Conflict-Tracking arbeiten immer auf `(project_hash, engine, session_id)`. Cross-project Crosstalk ist damit strukturell ausgeschlossen.

---

## 5. Datenmodelle & Schemas

### 5.1 Event Schema (`@holdpoint/live-protocol`)

```ts
import { z } from "zod";

export const EventV1 = z.object({
  // identity
  v: z.literal(1),
  id: z.string().uuid(),
  ts: z.number().int().nonnegative(), // unix ms
  seq: z.number().int().positive().optional(), // server-assigned replay cursor

  // session identity
  engine: z.string().min(1), // "claude" | "codex" | "copilot" | "<plugin>"
  session_id: z.string().min(1),
  project_hash: z.string().length(12),
  cwd: z.string(),

  // event
  type: z.enum([
    "session_start",
    "session_end",
    "prompt_submit",
    "tool_pre",
    "tool_post",
    "tool_failure",
    "notification",
    "stop_block",
    "stop_pass",
    "check_run",
    "conflict",
    "control", // bidirectional commands UI→extension
    "meta", // cwd changes, version bumps, etc.
  ]),
  payload: z.unknown(),

  // optional capabilities snapshot for this session
  caps: z
    .object({
      can_stream: z.boolean(),
      can_control: z.boolean(),
      can_modify_context: z.boolean(),
      can_register_tools: z.boolean(),
    })
    .partial()
    .optional(),
});

export type EventV1 = z.infer<typeof EventV1>;
```

**Per-type payload schemas** (siehe Anhang A). `tool_pre` / `tool_post` payloads may include normalized `write_targets` when the engine can determine concrete file-write intent; `seq` is assigned by the daemon at ingest time and powers reconnect-safe replay.

### 5.2 HTTP Endpoints

| Method | Path                       | Description                                                                   | Auth  |
| ------ | -------------------------- | ----------------------------------------------------------------------------- | ----- |
| GET    | `/health`                  | Liveness probe, returns `{ ok, version, started_at }`                         | none  |
| GET    | `/__holdpoint/live-auth`   | Browser bootstrap: validates `?token=...`, sets auth cookie, redirects to `/` | token |
| POST   | `/v1/events`               | Ingest a single event (used by short-lived hooks)                             | token |
| POST   | `/v1/events/batch`         | Ingest array of events                                                        | token |
| GET    | `/v1/projects`             | List all projects with summary                                                | token |
| GET    | `/v1/sessions`             | List all sessions, optionally filtered by `project_hash`                      | token |
| GET    | `/v1/sessions/:key/events` | Paginated event history (`?since_seq=<n>&limit=N`)                            | token |
| POST   | `/v1/control/:session_key` | Send a control command (Copilot only)                                         | token |
| DELETE | `/v1/sessions/:key`        | Purge a session's spool                                                       | token |
| GET    | `/`                        | Live UI (static SPA)                                                          | none  |
| GET    | `/assets/*`                | UI assets                                                                     | none  |

### 5.3 WebSocket Protocol

**Endpoint:** `ws://127.0.0.1:<port>/v1/stream`
**Auth:** Browser clients authenticate via the daemon-set auth cookie; non-browser clients can still use subprotocol `holdpoint-<token>`.

**Client→Server messages:**

```ts
type ClientMsg =
  | { type: "subscribe"; scope: "project" | "session" | "all"; key?: string; since_seq?: number }
  | { type: "unsubscribe"; key: string }
  | { type: "publish_event"; event: EventV1 } // for long-lived extensions
  | { type: "ping" };
```

**Server→Client messages:**

```ts
type ServerMsg =
  | { type: "event"; event: EventV1 }
  | { type: "events_batch"; events: EventV1[] }
  | { type: "control"; session_key: string; command: ControlCommand }
  | { type: "ack"; for: string }
  | { type: "error"; code: string; message: string }
  | { type: "pong" };
```

### 5.4 Filesystem Layout

```
~/.holdpoint/
├── daemon.lock                          ← singleton lockfile (0600)
├── config.json                          ← user config (auto_shutdown_ms etc.)
├── log/
│   └── daemon-<date>.log                ← rotating daemon logs (7d retention)
├── sessions/
│   └── <project_hash>/
│       ├── meta.json                    ← project name, root, last-active
│       └── <engine>-<session_id>.jsonl  ← event spool, one per session
└── spool/
    └── pending/
        └── <engine>-<uuid>.jsonl        ← pre-daemon buffer for offline hooks
```

### 5.5 Project Identity

```ts
function identifyProject(cwd: string): ProjectIdentity {
  try {
    const root = realpathSync(
      execSync("git rev-parse --show-toplevel", {
        cwd,
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim(),
    );
    return {
      hash: sha256(root).slice(0, 12),
      name: path.basename(root),
      root,
      git: {
        common_dir: tryGitCommonDir(root), // for worktree detection
        remote: tryGitRemote(root),
      },
    };
  } catch {
    const resolved = realpathSync(cwd);
    return {
      hash: sha256(resolved).slice(0, 12),
      name: path.basename(resolved),
      root: resolved,
      git: undefined,
    };
  }
}
```

---

## 6. Paket-Struktur & Verteilung

### 6.1 Distribution

| Channel                                             | Target                   | Status              |
| --------------------------------------------------- | ------------------------ | ------------------- |
| `npm i -g holdpoint`                                | All platforms            | Primary             |
| `brew install holdpoint`                            | macOS, Linux (Linuxbrew) | Phase 4             |
| `curl -fsSL https://holdpoint.dev/install.sh \| sh` | macOS, Linux             | Phase 1 (wraps npm) |
| Standalone binary (bun/pkg)                         | All                      | Future, post-1.0    |

### 6.2 Versioning

- Semver für alle Pakete.
- `@holdpoint/live-protocol` versioniert **unabhängig** und konservativ (Schema-changes = breaking).
- `holdpoint` umbrella version = max of all bundled internals.
- `checks.yaml` darf `holdpoint_version: ">=0.4"` deklarieren. `holdpoint validate` schreit bei Mismatch.

### 6.3 Hook-Command-Resolution (Smart Fallback)

Generierte Hooks rufen Holdpoint mit drei-stufigem Fallback:

```sh
{ command -v holdpoint >/dev/null 2>&1 && holdpoint check --staged; } \
  || { test -x node_modules/.bin/holdpoint && node_modules/.bin/holdpoint check --staged; } \
  || npx -y holdpoint@alpha check --staged
```

---

## 7. CLI-Kommandos

### 7.1 Default Action

`holdpoint` (no args):

1. Identifiziere `cwd` → project.
2. Ensure daemon (singleton mechanic).
3. Öffne Browser auf `http://127.0.0.1:<port>/?project=<hash>`.
4. Wenn Projekt unbekannt (kein `checks.yaml`): kurze interaktive Frage „No holdpoint config here. Run `holdpoint init`?" mit y/N.

### 7.2 Subcommands

| Command                                       | Description                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------ |
| `holdpoint init [--stack=<x>] [--agent=<x>]`  | Existing. Generiert hooks + checks.yaml. Erweitert: hooks bekommen Live-Bridge-Call. |
| `holdpoint check [--staged]`                  | Existing. Erweitert: emittiert `check_run` event an Daemon.                          |
| `holdpoint validate`                          | Existing.                                                                            |
| `holdpoint update`                            | Existing.                                                                            |
| `holdpoint builder`                           | Existing visual editor.                                                              |
| `holdpoint live [--project=<hash>]`           | Alias auf default.                                                                   |
| `holdpoint sessions`                          | List active sessions across all projects (TUI table).                                |
| `holdpoint sessions purge [--project=<hash>]` | Clear spool.                                                                         |
| `holdpoint daemon status`                     | Print pid, port, uptime, sessions.                                                   |
| `holdpoint daemon start [--persistent]`       | Explicit start.                                                                      |
| `holdpoint daemon stop`                       | SIGTERM → SIGKILL after 5s.                                                          |
| `holdpoint event`                             | Internal. Reads JSON from stdin, POSTs to daemon. Used by Claude/Codex hooks.        |
| `holdpoint version`                           | Prints umbrella + protocol versions.                                                 |

### 7.3 Exit Codes

| Code | Meaning                                                 |
| ---- | ------------------------------------------------------- |
| 0    | Success                                                 |
| 1    | Generic error                                           |
| 2    | Checks failed (used by hooks to block agents)           |
| 3    | Validation error (checks.yaml malformed)                |
| 4    | Daemon unavailable + cannot spawn                       |
| 5    | Version mismatch (checks.yaml requires newer holdpoint) |

### 7.4 Environment Variables

| Var                   | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| `HOLDPOINT_HOME`      | Override `~/.holdpoint`                              |
| `HOLDPOINT_PORT`      | Force a specific daemon port                         |
| `HOLDPOINT_NO_DAEMON` | Hook skips daemon ingest, just runs checks (CI mode) |
| `HOLDPOINT_LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error`               |

---

## 8. MVP — Phase 1 (Foundation)

**Goal:** End-to-End: zwei Claude-Sessions parallel, beide Events fließen in den Daemon, sind im Spool persistent, und können per HTTP-GET abgerufen werden. **Noch keine UI** — Phase 2.

**Implementation status (2026-05-20):** implemented in-repo with the daemon, protocol, SDK, CLI, and Claude live hooks. The explicitly deferred follow-ups are tracked above under `P1-D*`.

### 8.1 Deliverables

1. **`@holdpoint/live-protocol`** Package
   - Event schema (Zod)
   - HTTP + WS type defs
   - Published als alpha
2. **`@holdpoint/live-daemon`** Package
   - Fastify server, WS via `@fastify/websocket`
   - Singleton mechanic (lockfile + atomic write + race handling)
   - Token auth middleware
   - In-memory session store with jsonl persistence
   - HTTP endpoints: `/health`, `POST /v1/events`, `GET /v1/projects`, `GET /v1/sessions`, `GET /v1/sessions/:key/events`
3. **`@holdpoint/sdk`** Package (minimal)
   - `BridgeClient` class: POST events with retry + offline-spool fallback
4. **`@holdpoint/cli`** extensions
   - `holdpoint event` subcommand
   - `holdpoint daemon start|stop|status` subcommands
   - `ensureDaemon()` helper
5. **`@holdpoint/engine-claude`** update
   - Generated `.claude/settings.json` hooks bekommen einen **zusätzlichen** Hook-Eintrag pro Event-Type (`PreToolUse`, `PostToolUse`, `Stop`, `TaskCompleted`) der `holdpoint event` aufruft.
   - Bestehende check-Aufrufe unverändert.

### 8.2 File-Liste (neu/geändert)

```
packages/live-protocol/
  package.json
  src/index.ts
  src/event.ts
  src/http.ts
  src/ws.ts
  src/__tests__/event.test.ts

packages/live-daemon/
  package.json
  src/index.ts                  ← exports start()/stop()
  src/server.ts                 ← Fastify setup
  src/singleton.ts              ← lockfile mechanic
  src/auth.ts
  src/store.ts                  ← in-memory + jsonl
  src/router.ts                 ← event routing
  src/project-identity.ts
  src/__tests__/singleton.test.ts
  src/__tests__/store.test.ts
  src/__tests__/server.e2e.test.ts

packages/sdk/
  package.json
  src/index.ts
  src/bridge-client.ts
  src/live-adapter.ts           ← interface only (impl in Phase 5)
  src/__tests__/bridge-client.test.ts

packages/cli/src/commands/
  event.ts                      ← NEW: stdin→daemon
  daemon.ts                     ← NEW: start/stop/status

packages/cli/src/lib/
  ensure-daemon.ts              ← NEW

packages/engine-claude/src/
  engine.ts                     ← extended: live hook entries
  __tests__/engine.test.ts      ← extended

(no UI yet — phase 2)
```

### 8.3 Akzeptanzkriterien Phase 1

- [ ] `holdpoint daemon start` startet einen Daemon. `holdpoint daemon status` zeigt pid + port + uptime.
- [ ] Zweiter `holdpoint daemon start` Aufruf gibt **denselben** pid/port zurück, startet keinen zweiten Prozess.
- [ ] `kill -9 <pid>` + neuer Start: stale lockfile wird sauber überschrieben.
- [ ] In zwei verschiedenen Repos parallel `holdpoint init` und kurz simulierte Hooks via `echo '{...}' | holdpoint event` aufrufen.
- [ ] `curl http://127.0.0.1:<port>/v1/projects` zeigt beide Projekte mit korrekten hashes.
- [ ] Daemon kill → Hook puffert in `~/.holdpoint/spool/pending/` → Daemon restart → Events landen retroaktiv im richtigen Session-File.
- [ ] Auth: unauthorisierte HTTP-Anfrage → 401. Falscher Token → 401.
- [ ] CORS / Origin-Check: Anfrage von `http://evil.com` → 403.
- [ ] 130 existing tests bleiben grün.

### 8.4 Aufwandsschätzung

| Item                           | Effort          |
| ------------------------------ | --------------- |
| `@holdpoint/live-protocol`     | 0.5 d           |
| `@holdpoint/live-daemon` core  | 2 d             |
| Singleton mechanic incl. tests | 1 d             |
| `@holdpoint/sdk` BridgeClient  | 0.5 d           |
| CLI commands                   | 0.5 d           |
| engine-claude update           | 0.5 d           |
| Integration tests              | 1 d             |
| **Total Phase 1**              | **~6 dev days** |

---

## 9. Phase 2 — Live Web UI

**Goal:** Browser-UI mit Project-Sidebar, Session-Cards, live Event-Timeline.

**Implementation status (2026-05-20):** implemented in-repo with `apps/live`, daemon static serving, cookie-backed browser auth bootstrap, reconnecting all-project WS subscription, and a project-first session/timeline shell. The acceptance checklist below remains the formal product/perf signoff list.

### 9.1 Deliverables

- `apps/live/` (Vite + React + Tailwind, ähnlich `apps/builder/`)
- Components: `ProjectSidebar`, `ProjectHeader`, `SessionCard`, `EventTimeline`, `EventFilter`, `ConflictBanner` (Placeholder in Phase 2, aktiviert in Phase 3).
- Project rows render `displayName`, full repo path, stable color dot, last active timestamp, and active/idle state.
- Session cards show engine, short session id, turn/event counters, latest tool/check state, and optional "would block" indicator.
- WS client with auto-reconnect and HTTP bootstrap (`/v1/projects`, `/v1/sessions`, `/v1/sessions/:key/events`).
- Build-Step bundelt die UI in `live-daemon/static/`.
- `holdpoint` (no args) öffnet Browser und filtert wenn möglich direkt auf das aktuelle Projekt.

### 9.2 Implementation plan

1. Create `apps/live/` plus a daemon build step that copies the production bundle into `packages/live-daemon/static/`.
2. Introduce a project-first client state model:
   - `projectsByHash`
   - `sessionsByKey`
   - `selectedProjectHash`
   - `sessionEventsByKey`
3. Bootstrap initial state over HTTP, then merge live updates from the WS stream with reconnect + replay-by-`since`.
4. Keep the main view hard-scoped to one project at a time; no mixed cross-project timeline in Phase 2.
5. Add `holdpoint live` as alias to the default `holdpoint` browser-opening flow.

### 9.3 Akzeptanzkriterien

- [ ] Zwei Sessions in zwei Repos sind sichtbar als getrennte Projects, getrennte Cards.
- [ ] Das UI zeigt nie Sessions aus zwei verschiedenen Projekten gleichzeitig im Main-Panel.
- [ ] Zwei Repos mit gleichem Namen sind durch Root-Pfad und stabile Farbmarkierung klar unterscheidbar.
- [ ] Events erscheinen live (<200ms vom Hook-Call zur UI).
- [ ] UI funktioniert auch wenn Daemon währenddessen reconnected.
- [ ] Initial-Load von 1000 Events <100ms paint.

**Effort:** ~10 dev days.

---

## 10. Phase 3 — Conflict Detection

**Goal:** F5 vollständig umgesetzt als **passive project-local conflict awareness**, nicht als automatische Context-Injection.

**Implementation status (2026-05-20):** implemented in-repo with write-target aware `tool_pre` / `tool_post` handling, per-project lock tracking, conflict-event emission, and passive conflict banners in the Live UI. The checklist below remains the formal signoff list.

### 10.1 Deliverables

- `packages/live-daemon/src/conflict-tracker.ts`
- Conflict-Event type in protocol.
- Conflict-Banner + lock indicators in UI.
- Path-normalization helper for deriving candidate write targets from `tool_pre` / `tool_post` payloads.
- Optional später: conflict-aware hook notifications (`engines.<x>.cross_aware: true`) als separate opt-in Erweiterung, nicht Bestandteil des Core-MVP.

### 10.2 Implementation plan

1. Maintain an in-memory map per `project_hash`: `<normalized file path> -> lock holder`.
2. On `tool_pre` for file-writing tools, infer candidate file paths, set/refresh the lock, and check for collisions against existing non-expired locks.
3. Emit `conflict` events to:
   - the affected project stream
   - the UI subscribers for that project
   - the persistent session spool for audit / replay
4. Expire locks automatically by TTL or immediately on matching `tool_post`.
5. Keep the feature passive in this phase: warn humans in the UI, but do not inject cross-session context into other agents.

### 10.3 Akzeptanzkriterien

- [ ] Zwei Agents im selben Repo editieren dasselbe File → Conflict-Event innerhalb 100ms emittiert.
- [ ] Conflicts in verschiedenen Repos → **kein** Cross-Talk.
- [ ] Conflict-Banner verschwindet wenn Lock TTL abläuft oder PostToolUse confirmed.
- [ ] Conflict-Warnungen bleiben auf das betroffene Projekt begrenzt; andere Projekte sehen weder Banner noch Events.

**Effort:** ~4 dev days.

---

## 11. Phase 4 — Copilot Live Control

**Goal:** F6 vollständig umgesetzt. Phase 4 ist **Copilot-spezifisch**, weil nur dort heute ein persistenter bidirektionaler Session-Kanal verfügbar ist.

**Research update (2026-05-20):** The current Copilot SDK surface is sufficient for Phase 4, but the implementation must respect two real constraints from the SDK docs/types:

1. Pending approvals are identified by runtime `requestId` from `permission.requested` events, while the permission handler itself does **not** receive that id directly.
2. There is no first-class API to inject a mid-turn developer message directly into the live conversation; queued context must therefore land through the next eligible hook `additionalContext` boundary.

**Implementation status (2026-05-20):** implemented in-repo with a persistent Copilot bridge, daemon control routing, typed control commands, explicit permission pending/resolved events, queued context injection, a reference `holdpoint_dry_run` control tool, and Copilot-only control UI. The checklist below remains the formal signoff list.

### 11.1 Deliverables

- `engine-copilot` Extension wird zu session-langlebigem WS-Client und registriert sich explizit als Control-Socket für ihren `session_key`.
- Typed Control-Commands implementiert:
  - `approve_pending { request_id }`
  - `deny_pending { request_id, reason? }`
  - `inject_context { text }`
  - `trigger_tool { tool_name, input }`
- UI-Buttons: Approve / Deny / Inject Context / Trigger Tool.
- Custom Tool registration: `holdpoint_dry_run` als reference impl.
- Audit-Log für alle User-Overrides; `control` Events bleiben die persistierte Audit-Spur im jsonl Store.
- Pending-permission registry in der Extension plus explizite open/resolved Events, damit UI-Aktionen einem konkreten blockierten Tool-Request zugeordnet werden können.
- Daemon-Control-Routing: Browser-UI postet Control-Commands an den Daemon; der Daemon persistiert das Audit-Event und forwardet an den registrierten Copilot-Control-Socket.

### 11.2 Control semantics

- `approve_pending` ist in Phase 4 bewusst auf **approve once** beschränkt. Keine sessionweiten oder permanenten Approval-Rules in dieser Phase, damit Audit und UI-Status nicht durch implizite Folgefreigaben verzerrt werden.
- `deny_pending` lehnt genau diese pending Aktion explizit ab und schreibt eine Audit-Notiz. Optionales `reason` wird im Audit-Event mitgespeichert.
- `inject_context` queued Text als **developer-level context addendum** für die **nächste eligible hook boundary** (`onUserPromptSubmitted` oder `onPreToolUse`). Kein stilles Umschreiben historischer Prompts und kein Anspruch auf sofortige Mid-turn-Injektion.
- Der Inject-Queue ist bounded und TTL-basiert, damit alte UI-Notizen nicht beliebig spät in einen späteren Turn gelangen. Konsumierte oder abgelaufene Einträge erzeugen eigene Audit-/Status-Events.
- `trigger_tool` darf nur registrierte Holdpoint-Tools auslösen, nicht beliebige Shell-Befehle. In Phase 4 wird das Tool direkt über die Extension-Registry ausgeführt; das Ergebnis wird als queued Context-Addendum für den nächsten Turn bereitgestellt.
- UI rendert Controls nur wenn `capabilities.canControl === true` **und** ein aktiver Copilot-Control-Socket für diese Session registriert ist. Claude/Codex/Cursor bleiben in dieser Phase observe-only.

### 11.3 Permission lifecycle

- Bei `permission.requested` speichert die Extension einen Pending-Eintrag mit:
  - `request_id`
  - `toolCallId` / Permission-Kind
  - user-facing Prompt-Metadaten soweit verfügbar
  - open timestamp
- Zusätzlich emittiert sie ein explizites Pending-Open Live-Event, damit die UI rekonstruierbar ist.
- Wenn User approve/deny klickt, wird der Command via Daemon an den passenden Control-Socket forwardet; die Extension resolved genau diesen Pending-Eintrag.
- Bei Approve/Deny/Timeout/Hook-Resolution/Session-End emittiert die Extension ein explizites Pending-Resolved Event, damit reconnectende Clients keine stale Pending-Controls sehen.
- Die Korrelation zwischen `permission.requested` Event und `onPermissionRequest` Handler erfolgt primär über dieselbe SDK `PermissionRequest` / `toolCallId` Repräsentation; falls Reihenfolge im Runtime-Verhalten anders ist, fällt die Implementierung auf den ältesten passenden unresolved Pending-Eintrag derselben Session zurück.

### 11.4 Akzeptanzkriterien

- [ ] Agent läuft auf `task_complete` in Block (checks failed). User klickt „Approve". Agent läuft weiter.
- [ ] User klickt „Inject Context", tippt Text, die nächste eligible hook boundary injiziert den Text als developer-style additional context.
- [ ] Alle Overrides im jsonl gespoolt mit `actor: "user"`.
- [ ] Trigger-Tool Controls sind auf explizit registrierte Holdpoint-Tools beschränkt.
- [ ] Nicht-Copilot Sessions zeigen keine aktiven Control-Buttons, sondern observe-only State.
- [ ] Reconnect nach bereits aufgelöster Permission zeigt **keine** stale Pending-Controls.

**Effort:** ~5 dev days.

---

## 12. Phase 5 — Plugin SDK

**Goal:** F7 — externe Engines können sich ohne Holdpoint-Repo-PR anbinden.

**Implementation status (2026-05-20):** implemented for external **Live engines**. This pass deliberately freezes the runtime contract around discovery + hook-payload translation, not arbitrary check-generation plugins. Third-party packages can now expose a manifest + engine module, appear in `holdpoint engines`, and back `holdpoint event --engine <id> --from-hook` without a Holdpoint repo PR.

### 12.1 Deliverables

- `@holdpoint/sdk` exports `HoldpointEngineManifest` plus a documented `LiveAdapter` interface with `translateHookInput()`.
- `@holdpoint/engine-claude` exports the same `manifest` + `adapter` contract used by external packages.
- CLI discovery for built-in live engines and installed third-party engine packages.
- `holdpoint engines [--json]` lists loaded / ignored engines and the reason for each decision.
- Repo-local example package at `examples/holdpoint-engine-template`.
- README + docs page sections covering the engine authoring contract.

### 12.2 Discovery contract

Supported discovery order:

1. Built-in live engine packages bundled with the CLI load first (currently `@holdpoint/engine-claude`)
2. Installed project packages from `dependencies`, `devDependencies`, or `optionalDependencies` matching `holdpoint-engine-*` or `@*/holdpoint-engine-*`
3. Only packages that declare the Holdpoint manifest metadata and export a valid manifest are activated

Minimal external engine contract:

- `package.json` contains `keywords: ["holdpoint-engine"]`
- `package.json` contains:
  ```json
  {
    "holdpoint": {
      "manifest": "./dist/manifest.js",
      "adapter": "./dist/index.js"
    }
  }
  ```
- the manifest module exports `manifest`
- the adapter module exports `adapter`
- `manifest` declares:
  - `manifestVersion: 1`
  - `id`
  - `displayName`
- `adapter` implements:
  - `id`
  - `displayName`
  - `capabilities`
  - `generateBridgeCommand()`
  - `translateHookInput(raw, options) => EventV1 | null`
- `id` collisions are resolved first-wins; built-ins load before third-party packages

**Explicit non-goal of this phase:** generic external `buildEngine()` / `buildHookConfig()` installation hooks. This pass makes external Live adapters discoverable and usable at runtime without destabilising the existing built-in init/update flow.

### 12.3 Implementation plan

1. Freeze the `LiveAdapter` surface in `@holdpoint/sdk`.
2. Move Claude's native hook-payload translation into an exported `adapter` so the CLI consumes the same public contract it expects from third parties.
3. Add manifest validation and discovery to the CLI boot path, plus `holdpoint event --engine <id> --from-hook` resolution through that registry.
4. Add `holdpoint engines` for visibility into found/ignored adapters and validation failures.
5. Ship a tiny repo-local example engine (`examples/holdpoint-engine-template`) that stays under the "~100 lines of adapter code" target.

### 12.4 Akzeptanzkriterien

- [x] External packages can expose `manifest` + `adapter` and be discovered without a Holdpoint repo PR.
- [x] `holdpoint event --engine <id> --from-hook` resolves the discovered adapter and uses its payload translator.
- [x] Holdpoint funktioniert ohne diese externe Engine (kein hard dependency).
- [x] `holdpoint engines` erklärt sichtbar warum ein Paket geladen oder ignoriert wurde.
- [x] Repo-local template package shows the minimal contract in code.

**Effort:** ~3 dev days + dokumentation.

---

## 13. Test-Plan

### 13.1 Unit

- Singleton-Mechanic: race conditions, stale lockfile, EEXIST handling.
- Project-Identity: git/no-git/symlink/worktree cases.
- Event schema validation: known-good and known-bad events.
- Conflict-Tracker: TTL expiration, cross-project isolation.
- BridgeClient: offline buffering, retry, daemon-restart resilience.

### 13.2 Integration

- Spawn daemon → POST events → query state → assert correct partitioning.
- Daemon crash mid-stream → reboot → spool replay.
- Two concurrent daemon-start invocations → exactly one wins.

### 13.3 E2E

- Real Claude Code session + simulated parallel session → UI shows both.
- Conflict scenario: two sessions editing same file → banner appears.
- Copilot override: extension blocks tool → UI override → tool proceeds.

### 13.4 Security

- Unauth request → 401.
- Wrong-origin browser request → 403.
- Lockfile mode != 0600 → daemon refuses to start.
- Spool files mode != 0600 → warning logged.

---

## 14. Bekannte Risiken & Open Questions

### 14.1 Risiken

| Risk                                                      | Mitigation                                                                                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Copilot Extension API ändert sich (sie ist experimentell) | LiveAdapter abstraction isoliert das. Worst case: Copilot-Bidi fällt aus, Beobachtung über hooks.json bleibt.                               |
| Daemon-Bug crasht alle Sessions                           | Hooks failen gracefully. Spool ist persistent. User merkt's, restartet.                                                                     |
| Auth-Token leak via Process-Listing (`ps` zeigt env vars) | Token nur in Lockfile, nie als env-var / CLI-arg.                                                                                           |
| Disk-fill bei langen Sessions                             | Spool-Rotation + Retention-Pruning.                                                                                                         |
| Multi-user host (geteilt)                                 | Lockfile pro-user via `os.homedir()`. Aber: zwei User auf gleicher Maschine = zwei Daemons auf verschiedenen Ports. Out-of-scope für jetzt. |

### 14.2 Resolved design decisions

- **D1:** `Stop`-Hooks blockieren auch bei Daemon-Down weiter. Live ist Observability/Control, nicht der Enforcement-Pfad.
- **D2:** UI default theme = `system`, optional override später.
- **D3:** Daemon bleibt auf HTTP/1.1. Lokales h2 bringt hier keinen nennenswerten Vorteil.
- **D4:** `@holdpoint/sdk` nutzt MIT wie der Rest des Repos.
- **D5:** Performance-Tuning darf initial von `<10 events/s` pro Session und `p99 < 50/s burst` ausgehen; härtere Limits werden erst mit realen traces kalibriert.
- **D6:** Cross-project Sessions werden im UI immer getrennt gehalten; kein "All Sessions"-Mischview in v1.
- **D7:** Cross-reporting in Core beschränkt sich auf passive project-local conflict awareness. Aktive cross-agent context injection bleibt optional und nicht Teil des Kern-MVP.

### 14.3 Remaining questions

- **Q1:** Soll Hook-auto-spawn nach Phase 2 überhaupt eingeführt werden, oder bleibt spool-first langfristig das Default?
- **Q2:** Braucht die Live-UI nach v1 einen expliziten Split-View für zwei Projekte nebeneinander, oder reicht project-first Navigation?
- **Q3:** Soll aktive Cross-Agent-Koordination später als optionales Core-Feature oder als separates Plugin (`@holdpoint/cross`) entstehen?

---

## 15. Anhang

### A. Event-Type Katalog (Payload-Schemas)

```ts
// session_start
{ source: "startup" | "resume"; tools_available: string[] }

// session_end
{ reason: "user" | "completed" | "error"; turn_count: number }

// prompt_submit
{ prompt: string; truncated_at?: number }

// tool_pre
{ tool_name: string; tool_use_id: string; tool_input: Record<string, unknown> }

// tool_post
{ tool_name: string; tool_use_id: string; success: boolean; output_summary?: string; duration_ms: number }

// tool_failure
{ tool_name: string; tool_use_id: string; error: string }

// notification
{ kind: "permission_prompt" | "idle" | "auth_success" | "elicitation"; message: string }

// stop_block
{ reason: string; failing_checks: string[] }

// stop_pass
{ duration_ms: number }

// check_run
{ check_id: string; label: string; status: "pass" | "fail" | "skip"; duration_ms: number; output?: string }

// conflict
{ kind: "file_write" | "lock_held"; file_path: string; holder: { engine: string; session_id: string }; requester: { engine: string; session_id: string } }

// control (UI → extension)
{ command: "approve_pending" | "deny_pending" | "inject_context" | "trigger_tool"; args?: Record<string, unknown>; actor: "user"; actor_session?: string }

// meta
{ kind: "cwd_changed" | "version_bump" | "schema_warn"; ... }
```

### B. Beispiel-Event-Sequenz (Claude session, file edit)

```jsonl
{"v":1,"id":"...","ts":1716220801000,"engine":"claude","session_id":"a3f9...","project_hash":"abc123def456","cwd":"/Users/eneas/projects/holdpoint","type":"session_start","payload":{"source":"startup","tools_available":["Read","Write","Edit","Bash"]}}
{"v":1,"id":"...","ts":1716220812000,"engine":"claude","session_id":"a3f9...","project_hash":"abc123def456","cwd":"/Users/eneas/projects/holdpoint","type":"prompt_submit","payload":{"prompt":"Fix the bug in auth.ts"}}
{"v":1,"id":"...","ts":1716220815000,"engine":"claude","session_id":"a3f9...","project_hash":"abc123def456","cwd":"/Users/eneas/projects/holdpoint","type":"tool_pre","payload":{"tool_name":"Edit","tool_use_id":"toolu_01ABC","tool_input":{"file_path":"src/auth.ts","old_string":"...","new_string":"..."}}}
{"v":1,"id":"...","ts":1716220815240,"engine":"claude","session_id":"a3f9...","project_hash":"abc123def456","cwd":"/Users/eneas/projects/holdpoint","type":"tool_post","payload":{"tool_name":"Edit","tool_use_id":"toolu_01ABC","success":true,"duration_ms":240}}
{"v":1,"id":"...","ts":1716220820000,"engine":"claude","session_id":"a3f9...","project_hash":"abc123def456","cwd":"/Users/eneas/projects/holdpoint","type":"check_run","payload":{"check_id":"typecheck","label":"TypeScript — all packages","status":"pass","duration_ms":4100}}
```

### C. Beispiel: Drittanbieter-Engine (`holdpoint-engine-myagent`)

```ts
// packages/engine-myagent/src/index.ts
import type { LiveAdapter, HoldpointConfig } from "@holdpoint/sdk";

export const adapter: LiveAdapter = {
  id: "myagent",
  displayName: "My Agent",
  capabilities: {
    can_stream: true,
    can_control: false,
    can_modify_context: false,
    can_register_tools: false,
  },
  generateBridgeCommand({ event }) {
    return `myagent-cli hook --event=${event} | holdpoint event --engine=myagent`;
  },
};

export function buildHookConfig(config: HoldpointConfig) {
  return {
    // ...engine-specific file generation
  };
}
```

---

## 16. Definition of Done für Phase 1 MVP

Phase 1 ist abgenommen wenn:

1. Alle Akzeptanzkriterien aus §8.3 passieren in CI.
2. README hat einen neuen Abschnitt „Live (alpha)" mit Quickstart.
3. `npx holdpoint@alpha init` + manuelle Hook-Simulation zeigt Events korrekt im Daemon-State.
4. Bestehende 130 Tests bleiben grün, ≥ 30 neue Tests für die Live-Komponenten.
5. Lockfile-Mechanik gegen race condition mit zwei parallelen Spawns geprüft (Stress-Test).
6. Doku in `docs/live/` mit (a) Architektur-Overview, (b) Event-Schema-Reference, (c) Plugin-Adapter HOWTO.

---

**End of spec.**
