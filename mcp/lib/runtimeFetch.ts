import { readFileSync } from "node:fs";
import { runtimeTlsPaths } from "./runtimeConnection";

/** Bun-owned clients trust only this machine's Runtime certificate for HTTPS. */
export async function runtimeFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
    throw new Error("LazyDesigner only connects to a loopback Runtime.");
  }
  if (url.protocol === "http:") {
    // Explicit HTTP URLs remain usable by isolated protocol test harnesses.
    return fetch(input, { ...init, redirect: "error" });
  }
  if (url.protocol !== "https:") throw new Error("Unsupported Runtime protocol.");
  const { cert } = runtimeTlsPaths();
  let ca: string;
  try {
    ca = readFileSync(cert, "utf8");
  } catch {
    throw new Error(`Missing Runtime TLS certificate: ${cert}. Run bun run setup:tls.`);
  }
  return fetch(input, {
    ...init,
    redirect: "error",
    tls: { ca, rejectUnauthorized: true },
  });
}
