import type { IncomingMessage, ServerResponse } from "node:http";

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

  const auth = req.headers.authorization;
  if (auth !== `Bearer ${token}`) {
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
  const raw = req.headers["sec-websocket-protocol"];
  const protocols = (typeof raw === "string" ? [raw] : [])
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);

  return protocols.includes(`holdpoint-${token}`);
}
