import type { IncomingMessage, ServerResponse } from "node:http";

export const MAX_REQUEST_HEADER_BYTES = 32 * 1024;
export const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024;
export const SOCKET_IDLE_TIMEOUT_MS = 30_000;

export class RuntimePayloadTooLargeError extends Error {
  constructor () {
    super("Runtime request body exceeds the configured limit.");
    this.name = "RuntimePayloadTooLargeError";
  }
}

export function isAllowedLocalOrigin (origin: string): boolean {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}

export function isAllowedLocalHost (hostHeader: string): boolean {
  try {
    const parsed = new URL(`http://${hostHeader.trim()}`);
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

export function rawHeaderCount (
  request: IncomingMessage,
  name: string
): number {
  const target = name.toLowerCase();
  let count = 0;
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    if (request.rawHeaders[index]?.toLowerCase() === target) count += 1;
  }
  return count;
}

export function singleRequestHeader (
  request: IncomingMessage,
  name: string
): string | null {
  const value = request.headers[name.toLowerCase()];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export async function readNodeRequestBody (
  request: IncomingMessage
): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += bytes.byteLength;
    if (total > MAX_REQUEST_BODY_BYTES) {
      throw new RuntimePayloadTooLargeError();
    }
    chunks.push(bytes);
  }

  return Buffer.concat(chunks, total).toString("utf8");
}

export function sendNodeResponse (
  response: ServerResponse,
  status: number,
  headers: Record<string, string>,
  body: string,
  closeConnection: boolean = false
): void {
  if (response.headersSent || response.writableEnded) return;
  response.statusCode = status;
  for (const [key, value] of Object.entries(headers)) {
    response.setHeader(key, value);
  }
  if (closeConnection) response.setHeader("connection", "close");
  if (!response.hasHeader("content-length")) {
    response.setHeader("content-length", Buffer.byteLength(body));
  }
  response.end(body);
}

export function jsonErrorBody (
  message: string,
  id: string | number | null = null,
  code: number = -32000
): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    error: { code, message },
    id,
  });
}
