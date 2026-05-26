import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath, URL } from "node:url";
import type { EventV1, ServerMessage } from "@holdpoint/live-protocol";
import {
  ClientMessageSchema,
  ControlRequestSchema,
  EventV1Schema,
  EventsBatchSchema,
} from "@holdpoint/live-protocol";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import {
  authorizeRequest,
  authorizeWebSocket,
  readJsonBody,
  writeJson,
  writeUiAuthCookie,
} from "./auth.js";
import { matchesSubscription, type Subscription } from "./router.js";
import type { LiveStore } from "./store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIVE_UI_DIR = join(__dirname, "live-ui");
const BUILDER_UI_DIR = join(__dirname, "builder-ui");
const CONTENT_SECURITY_POLICY =
  "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: http:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
const MIME: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

export interface StartLiveServerOptions {
  host?: string;
  port: number;
  token: string;
  version: string;
  startedAt: number;
  store: LiveStore;
}

export interface RunningLiveServer {
  host: string;
  port: number;
  close(): Promise<void>;
  closed: Promise<void>;
}

interface RegisteredProject {
  hash: string;
  name?: string;
  root: string;
}

function sendSocketMessage(socket: WebSocket, message: ServerMessage): void {
  socket.send(JSON.stringify(message));
}

function decodeRawData(raw: RawData): string {
  if (typeof raw === "string") return raw;
  if (raw instanceof Buffer) return raw.toString("utf8");
  if (Array.isArray(raw)) return Buffer.concat(raw).toString("utf8");
  return Buffer.from(new Uint8Array(raw)).toString("utf8");
}

function getEventsForScope(
  store: LiveStore,
  subscription: Subscription,
  sinceSeq: number,
): EventV1[] {
  switch (subscription.scope) {
    case "all":
      return store.getAllEvents(sinceSeq);
    case "project":
      return subscription.key ? store.getProjectEvents(subscription.key, sinceSeq) : [];
    case "session":
      return subscription.key ? store.getSessionEvents(subscription.key, sinceSeq) : [];
  }
}

function buildControlStateEvent(
  session: {
    project_hash: string;
    engine: string;
    session_id: string;
    cwd: string;
    caps?: EventV1["caps"];
  },
  controlOnline: boolean,
): EventV1 {
  return {
    v: 1,
    id: randomUUID(),
    ts: Date.now(),
    engine: session.engine,
    session_id: session.session_id,
    project_hash: session.project_hash,
    cwd: session.cwd,
    caps: {
      ...(session.caps ?? {}),
      can_control: session.caps?.can_control ?? true,
      control_online: controlOnline,
    },
    type: "meta",
    payload: {
      kind: controlOnline ? "control_socket_registered" : "control_socket_disconnected",
    },
  };
}

function servePlaceholder(res: ServerResponse, appName = "Holdpoint Live"): void {
  res.writeHead(200, {
    "cache-control": "no-store",
    "content-security-policy": CONTENT_SECURITY_POLICY,
    "content-type": "text/html; charset=utf-8",
  });
  res.end(
    `<!doctype html><title>${appName}</title><body style="font-family:system-ui;background:#0b0f14;color:#f5f1e8;padding:32px"><h1>${appName}</h1><p>UI assets were not found in this build. Rebuild the monorepo with <code>pnpm turbo build</code>.</p></body>`,
  );
}

function serveUiAsset(res: ServerResponse, filePath: string): void {
  const mime = MIME[extname(filePath)] ?? "application/octet-stream";
  const headers: Record<string, string> = {
    "cache-control": "no-store",
    "content-type": mime,
  };
  if (filePath.endsWith(".html")) {
    headers["content-security-policy"] = CONTENT_SECURITY_POLICY;
  }
  res.writeHead(200, headers);
  createReadStream(filePath).pipe(res);
}

function isWithinRoot(candidate: string, root: string): boolean {
  return candidate === root || candidate.startsWith(root + sep);
}

function resolveUiFilePath(uiDir: string, requestedPath: string): string | null {
  const requested = requestedPath === "" || requestedPath === "/" ? "index.html" : requestedPath;
  const candidate = resolve(uiDir, requested.replace(/^\//, ""));
  if (!isWithinRoot(candidate, uiDir)) {
    return null;
  }
  if (existsSync(candidate)) {
    return candidate;
  }
  return existsSync(join(uiDir, "index.html")) ? join(uiDir, "index.html") : null;
}

function normalizeUiPath(path: string | null): "/live/" | "/builder/" {
  if (!path) return "/live/";
  if (path === "/live" || path.startsWith("/live/")) return "/live/";
  if (path === "/builder" || path.startsWith("/builder/")) return "/builder/";
  return "/live/";
}

function registerProjectFromAuthUrl(
  url: URL,
  registeredProjects: Map<string, RegisteredProject>,
): void {
  const hash = url.searchParams.get("project");
  const root = url.searchParams.get("root");
  if (!hash || !root || root.includes("\0")) {
    return;
  }
  const name = url.searchParams.get("name");
  registeredProjects.set(hash, {
    hash,
    ...(name ? { name } : {}),
    root: resolve(root),
  });
}

function getProjectForRequest(
  url: URL,
  registeredProjects: Map<string, RegisteredProject>,
): RegisteredProject | null {
  const hash = url.searchParams.get("project");
  if (hash) {
    return registeredProjects.get(hash) ?? null;
  }
  if (registeredProjects.size === 1) {
    return [...registeredProjects.values()][0] ?? null;
  }
  return null;
}

export async function startLiveServer(options: StartLiveServerOptions): Promise<RunningLiveServer> {
  const host = options.host ?? "127.0.0.1";
  const subscriptions = new Map<WebSocket, Subscription[]>();
  const controlSockets = new Map<string, WebSocket>();
  const socketControlKeys = new Map<WebSocket, Set<string>>();
  const registeredProjects = new Map<string, RegisteredProject>();
  const server = createServer((req, res) => {
    void handleRequest(req, res, options, subscriptions, registeredProjects).catch(
      (error: unknown) => {
        writeJson(res, 500, { ok: false, error: (error as Error).message });
      },
    );
  });
  const wss = new WebSocketServer({ noServer: true });

  const broadcastEvent = (event: EventV1): void => {
    for (const [socket, socketSubscriptions] of subscriptions.entries()) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      if (socketSubscriptions.some((subscription) => matchesSubscription(subscription, event))) {
        sendSocketMessage(socket, { type: "event", event });
      }
    }
  };

  const ingestAndBroadcast = async (event: EventV1): Promise<EventV1[]> => {
    const accepted = await options.store.ingest(event);
    for (const acceptedEvent of accepted) {
      broadcastEvent(acceptedEvent);
    }
    return accepted;
  };

  const emitControlState = async (sessionKey: string, controlOnline: boolean): Promise<void> => {
    const summary = options.store.getSessionSummary(sessionKey);
    if (!summary) return;
    await ingestAndBroadcast(buildControlStateEvent(summary, controlOnline));
  };

  const registerControlSocket = async (sessionKey: string, socket: WebSocket): Promise<void> => {
    const previous = controlSockets.get(sessionKey);
    if (previous && previous !== socket) {
      socketControlKeys.get(previous)?.delete(sessionKey);
    }
    controlSockets.set(sessionKey, socket);
    const keys = socketControlKeys.get(socket) ?? new Set<string>();
    keys.add(sessionKey);
    socketControlKeys.set(socket, keys);
    await emitControlState(sessionKey, true);
  };

  const unregisterControlSocket = async (sessionKey: string, socket: WebSocket): Promise<void> => {
    if (controlSockets.get(sessionKey) !== socket) return;
    controlSockets.delete(sessionKey);
    const keys = socketControlKeys.get(socket);
    keys?.delete(sessionKey);
    if (keys && keys.size === 0) {
      socketControlKeys.delete(socket);
    }
    await emitControlState(sessionKey, false);
  };

  const unregisterSocketControls = async (socket: WebSocket): Promise<void> => {
    const keys = [...(socketControlKeys.get(socket) ?? [])];
    for (const sessionKey of keys) {
      await unregisterControlSocket(sessionKey, socket);
    }
  };

  wss.on("connection", (socket: WebSocket) => {
    subscriptions.set(socket, []);
    socket.on("message", (raw: RawData) => {
      void (async () => {
        let message: unknown;
        try {
          message = JSON.parse(decodeRawData(raw));
        } catch {
          sendSocketMessage(socket, {
            type: "error",
            code: "invalid_json",
            message: "Expected JSON message",
          });
          return;
        }

        const parsed = ClientMessageSchema.safeParse(message);
        if (!parsed.success) {
          sendSocketMessage(socket, {
            type: "error",
            code: "invalid_message",
            message: parsed.error.errors[0]?.message ?? "Invalid message",
          });
          return;
        }

        switch (parsed.data.type) {
          case "subscribe": {
            if (parsed.data.scope !== "all" && !parsed.data.key) {
              sendSocketMessage(socket, {
                type: "error",
                code: "missing_key",
                message: "Expected a key for session/project subscriptions",
              });
              return;
            }

            const subscription =
              parsed.data.key !== undefined
                ? { scope: parsed.data.scope, key: parsed.data.key }
                : { scope: parsed.data.scope };
            const next = subscriptions.get(socket) ?? [];
            next.push(subscription);
            subscriptions.set(socket, next);

            const backlog = getEventsForScope(
              options.store,
              subscription,
              parsed.data.since_seq ?? 0,
            );
            if (backlog.length > 0) {
              sendSocketMessage(socket, { type: "events_batch", events: backlog });
            }
            sendSocketMessage(socket, {
              type: "ack",
              for: parsed.data.scope === "all" ? "all" : (parsed.data.key ?? parsed.data.scope),
            });
            break;
          }
          case "register_control": {
            await registerControlSocket(parsed.data.session_key, socket);
            sendSocketMessage(socket, { type: "ack", for: parsed.data.session_key });
            break;
          }
          case "unsubscribe": {
            const key = parsed.data.key;
            const next = (subscriptions.get(socket) ?? []).filter(
              (subscription) => subscription.key !== key,
            );
            subscriptions.set(socket, next);
            sendSocketMessage(socket, { type: "ack", for: key });
            break;
          }
          case "publish_event": {
            const accepted = await options.store.ingest(parsed.data.event);
            for (const event of accepted) {
              broadcastEvent(event);
            }
            sendSocketMessage(socket, { type: "ack", for: parsed.data.event.id });
            break;
          }
          case "ping":
            sendSocketMessage(socket, { type: "pong" });
            break;
        }
      })();
    });

    socket.on("close", () => {
      subscriptions.delete(socket);
      void unregisterSocketControls(socket).catch(() => {});
    });
  });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", `http://${host}:${options.port}`);
    if (url.pathname !== "/v1/stream" || !authorizeWebSocket(req, options.token, options.port)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      wss.emit("connection", ws, req);
    });
  });

  await new Promise<void>((resolvePromise, reject) => {
    server.listen(options.port, host, resolvePromise);
    server.on("error", reject);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected TCP address");
  }
  const actualPort = address.port;

  const closed = new Promise<void>((resolvePromise, reject) => {
    server.on("close", () => resolvePromise());
    server.on("error", reject);
  });

  async function close(): Promise<void> {
    for (const socket of subscriptions.keys()) {
      socket.close();
    }
    await new Promise<void>((resolvePromise, reject) => {
      wss.close((err?: Error) => (err ? reject(err) : resolvePromise()));
    });
    await new Promise<void>((resolvePromise, reject) => {
      server.close((err) => (err ? reject(err) : resolvePromise()));
    });
  }

  async function handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    state: StartLiveServerOptions,
    _subscriptions: Map<WebSocket, Subscription[]>,
    registered: Map<string, RegisteredProject>,
  ): Promise<void> {
    const url = new URL(req.url ?? "/", `http://${host}:${actualPort}`);
    if (req.method === "GET" && url.pathname === "/health") {
      writeJson(res, 200, { ok: true, version: state.version, started_at: state.startedAt });
      return;
    }

    if (req.method === "GET" && url.pathname === "/__holdpoint/live-auth") {
      if (url.searchParams.get("token") !== state.token) {
        writeJson(res, 401, { ok: false, error: "Unauthorized" });
        return;
      }

      registerProjectFromAuthUrl(url, registered);

      const redirectPath = normalizeUiPath(url.searchParams.get("path"));
      const redirectUrl = new URL(`http://${host}:${actualPort}`);
      redirectUrl.pathname = redirectPath;
      for (const [key, value] of url.searchParams.entries()) {
        if (key !== "token" && key !== "path") {
          redirectUrl.searchParams.set(key, value);
        }
      }
      writeUiAuthCookie(res, state.token);
      res.writeHead(302, {
        location: redirectUrl.toString(),
        "cache-control": "no-store",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/__holdpoint/initial-yaml") {
      if (!authorizeRequest(req, res, state.token, actualPort)) {
        return;
      }
      const project = getProjectForRequest(url, registered);
      if (!project) {
        writeJson(res, 404, { ok: false, error: "Project not registered for this UI session" });
        return;
      }
      const checksPath = resolve(project.root, "checks.yaml");
      if (!isWithinRoot(checksPath, project.root) || !existsSync(checksPath)) {
        writeJson(res, 404, { ok: false, error: "checks.yaml not found for this project" });
        return;
      }
      res.writeHead(200, {
        "cache-control": "no-store",
        "content-type": "text/yaml; charset=utf-8",
      });
      createReadStream(checksPath).pipe(res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/__holdpoint/initial-reports") {
      if (!authorizeRequest(req, res, state.token, actualPort)) {
        return;
      }
      const project = getProjectForRequest(url, registered);
      if (!project) {
        writeJson(res, 404, { ok: false, error: "Project not registered for this UI session" });
        return;
      }
      const reportsPath = resolve(project.root, ".holdpoint", "check-reports.json");
      if (!isWithinRoot(reportsPath, project.root) || !existsSync(reportsPath)) {
        writeJson(res, 404, { ok: false, error: "No check reports found for this project" });
        return;
      }
      res.writeHead(200, {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      });
      createReadStream(reportsPath).pipe(res);
      return;
    }

    if (url.pathname.startsWith("/v1/") && !authorizeRequest(req, res, state.token, actualPort)) {
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/events") {
      const event = EventV1Schema.parse(await readJsonBody(req));
      const accepted = await ingestAndBroadcast(event);
      writeJson(res, 200, { ok: true, accepted: accepted.length });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/events/batch") {
      const events = EventsBatchSchema.parse(await readJsonBody(req));
      const accepted: EventV1[] = [];
      for (const event of events) {
        accepted.push(...(await ingestAndBroadcast(event)));
      }
      writeJson(res, 200, { ok: true, accepted: accepted.length });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/control") {
      const request = ControlRequestSchema.parse(await readJsonBody(req));
      const session = state.store.getSessionSummary(request.session_key);
      if (!session) {
        writeJson(res, 404, { ok: false, error: "Session not found" });
        return;
      }

      const controlSocket = controlSockets.get(request.session_key);
      if (!controlSocket || controlSocket.readyState !== WebSocket.OPEN) {
        writeJson(res, 409, { ok: false, error: "Control socket not connected" });
        return;
      }

      await ingestAndBroadcast({
        v: 1,
        id: randomUUID(),
        ts: Date.now(),
        engine: session.engine,
        session_id: session.session_id,
        project_hash: session.project_hash,
        cwd: session.cwd,
        type: "control",
        payload: request.command,
      });
      sendSocketMessage(controlSocket, {
        type: "control",
        session_key: request.session_key,
        command: request.command,
      });
      writeJson(res, 200, { ok: true, delivered: true });
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/projects") {
      writeJson(res, 200, { projects: state.store.listProjects() });
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/sessions") {
      const projectHash = url.searchParams.get("project_hash") ?? undefined;
      writeJson(res, 200, { sessions: state.store.listSessions(projectHash) });
      return;
    }

    if (
      req.method === "GET" &&
      url.pathname.startsWith("/v1/sessions/") &&
      url.pathname.endsWith("/events")
    ) {
      const sessionKey = decodeURIComponent(
        url.pathname.replace("/v1/sessions/", "").replace(/\/events$/, ""),
      );
      const sinceSeq = Number(
        url.searchParams.get("since_seq") ?? url.searchParams.get("since") ?? "0",
      );
      const limit = Number(url.searchParams.get("limit") ?? "500");
      writeJson(res, 200, {
        session_key: sessionKey,
        since_seq: Number.isFinite(sinceSeq) ? sinceSeq : 0,
        max_seq: state.store.getSessionLatestSeq(sessionKey),
        events: state.store.getSessionEvents(
          sessionKey,
          Number.isFinite(sinceSeq) ? sinceSeq : 0,
          Number.isFinite(limit) ? limit : 500,
        ),
      });
      return;
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/v1/sessions/")) {
      const sessionKey = decodeURIComponent(url.pathname.replace("/v1/sessions/", ""));
      const removed = await state.store.purgeSession(sessionKey);
      writeJson(
        res,
        removed ? 200 : 404,
        removed ? { ok: true } : { ok: false, error: "Session not found" },
      );
      return;
    }

    if (req.method === "GET") {
      if (url.pathname === "/") {
        res.writeHead(302, { location: "/live/", "cache-control": "no-store" });
        res.end();
        return;
      }

      if (url.pathname === "/live" || url.pathname === "/builder") {
        res.writeHead(302, { location: `${url.pathname}/`, "cache-control": "no-store" });
        res.end();
        return;
      }

      const uiRoute = url.pathname.startsWith("/builder/")
        ? {
            appName: "Holdpoint Builder",
            dir: BUILDER_UI_DIR,
            path: url.pathname.replace(/^\/builder\/?/, ""),
          }
        : url.pathname.startsWith("/live/")
          ? {
              appName: "Holdpoint Live",
              dir: LIVE_UI_DIR,
              path: url.pathname.replace(/^\/live\/?/, ""),
            }
          : null;

      if (!uiRoute) {
        res.writeHead(302, { location: "/live/", "cache-control": "no-store" });
        res.end();
        return;
      }

      const filePath = resolveUiFilePath(uiRoute.dir, uiRoute.path);
      if (!filePath) {
        servePlaceholder(res, uiRoute.appName);
        return;
      }
      serveUiAsset(res, filePath);
      return;
    }

    writeJson(res, 404, { ok: false, error: "Not found" });
  }

  return {
    host,
    port: actualPort,
    close,
    closed,
  };
}
