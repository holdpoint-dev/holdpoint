import type { IncomingMessage, ServerResponse } from "node:http";

export const LIVE_UI_COOKIE = "holdpoint_live_token";

function parseCookies(raw: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!raw) {
    return cookies;
  }

  for (const part of raw.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (!name) continue;
    cookies.set(name, decodeURIComponent(valueParts.join("=")));
  }

  return cookies;
}

function getRequestToken(req: IncomingMessage): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length);
  }

  return parseCookies(req.headers.cookie).get(LIVE_UI_COOKIE) ?? null;
}

export function writeJson(
  res: ServerResponse,
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {},
): void {
  res.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    ...headers,
  });
  res.end(JSON.stringify(body));
}

export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  if (chunks.length === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/** Read a raw request body as UTF-8 text, capped to guard against runaways. */
export async function readTextBody(req: IncomingMessage, maxBytes = 512_000): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    total += buf.length;
    if (total > maxBytes) throw new Error("Request body too large");
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function authorizeRequest(
  req: IncomingMessage,
  res: ServerResponse,
  token: string,
  port: number,
): boolean {
  const origin = req.headers.origin;
  if (origin && origin !== `http://127.0.0.1:${port}`) {
    writeJson(res, 403, { ok: false, error: "Origin not allowed" });
    return false;
  }

  if (getRequestToken(req) !== token) {
    writeJson(res, 401, { ok: false, error: "Unauthorized" });
    return false;
  }

  return true;
}

export function authorizeWebSocket(req: IncomingMessage, token: string, port: number): boolean {
  const origin = req.headers.origin;
  if (origin && origin !== `http://127.0.0.1:${port}`) {
    return false;
  }

  if (getRequestToken(req) === token) {
    return true;
  }

  const raw = req.headers["sec-websocket-protocol"];
  const protocols = (typeof raw === "string" ? [raw] : [])
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);

  return protocols.includes(`holdpoint-${token}`);
}

export function writeUiAuthCookie(res: ServerResponse, token: string): void {
  res.setHeader(
    "set-cookie",
    `${LIVE_UI_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600`,
  );
}
