import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import type { EventV1, ServerMessage } from "@holdpoint/live-protocol";
import { ClientMessageSchema, EventV1Schema, EventsBatchSchema } from "@holdpoint/live-protocol";
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

function servePlaceholder(res: ServerResponse): void {
  res.writeHead(200, {
    "cache-control": "no-store",
    "content-security-policy": CONTENT_SECURITY_POLICY,
    "content-type": "text/html; charset=utf-8",
  });
  res.end(
    '<!doctype html><title>Holdpoint Live</title><body style="font-family:system-ui;background:#0b0f14;color:#f5f1e8;padding:32px"><h1>Holdpoint Live</h1><p>Live UI assets were not found in this build. Rebuild the monorepo with <code>pnpm turbo build</code>.</p></body>',
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

function resolveUiFilePath(pathname: string): string | null {
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const candidate = resolve(LIVE_UI_DIR, requested);
  if (!candidate.startsWith(LIVE_UI_DIR)) {
    return null;
  }
  if (existsSync(candidate)) {
    return candidate;
  }
  return existsSync(join(LIVE_UI_DIR, "index.html")) ? join(LIVE_UI_DIR, "index.html") : null;
}

export async function startLiveServer(options: StartLiveServerOptions): Promise<RunningLiveServer> {
  const host = options.host ?? "127.0.0.1";
  const subscriptions = new Map<WebSocket, Subscription[]>();
  const server = createServer((req, res) => {
    void handleRequest(req, res, options, subscriptions).catch((error: unknown) => {
      writeJson(res, 500, { ok: false, error: (error as Error).message });
    });
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

      const redirectUrl = new URL("/", `http://${host}:${actualPort}`);
      for (const [key, value] of url.searchParams.entries()) {
        if (key !== "token") {
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

    if (url.pathname.startsWith("/v1/") && !authorizeRequest(req, res, state.token, actualPort)) {
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/events") {
      const event = EventV1Schema.parse(await readJsonBody(req));
      const accepted = await state.store.ingest(event);
      for (const acceptedEvent of accepted) {
        broadcastEvent(acceptedEvent);
      }
      writeJson(res, 200, { ok: true, accepted: accepted.length });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/events/batch") {
      const events = EventsBatchSchema.parse(await readJsonBody(req));
      const accepted = await state.store.ingestMany(events);
      for (const acceptedEvent of accepted) {
        broadcastEvent(acceptedEvent);
      }
      writeJson(res, 200, { ok: true, accepted: accepted.length });
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
      const filePath = resolveUiFilePath(url.pathname);
      if (!filePath) {
        servePlaceholder(res);
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
