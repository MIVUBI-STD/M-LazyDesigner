/** Shared by the native plugin and Bun clients; no native imports at load time. */
export const DEFAULT_RUNTIME_URL = "https://127.0.0.1:3000/bb-mcp";

export function normalizeRuntimeUrl(
  value: string = DEFAULT_RUNTIME_URL
): string {
  const parsed = new URL(value);
  if (
    parsed.protocol !== "http:" &&
    parsed.protocol !== "https:"
  ) {
    throw new Error(
      "LazyDesigner Runtime URL must use http or https."
    );
  }
  if (parsed.username || parsed.password) {
    throw new Error(
      "LazyDesigner Runtime URL must not contain credentials."
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname !== "127.0.0.1" &&
    hostname !== "localhost" &&
    hostname !== "::1" &&
    hostname !== "[::1]"
  ) {
    throw new Error(
      "LazyDesigner Gateway only connects to a loopback Runtime."
    );
  }

  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/+$/, "");
}


export function normalizeRuntimeEndpoint(value: unknown): string {
  const raw = typeof value === "string" && value.trim() ? value.trim() : "/bb-mcp";
  if (!raw.startsWith("/") || raw.includes("?") || raw.includes("#") || /[\r\n\t]/.test(raw)) {
    throw new Error("LazyDesigner connection path must be a local absolute URL path without query or fragment.");
  }

  const parsed = new URL(raw, "https://127.0.0.1");
  if (
    parsed.origin !== "https://127.0.0.1"
    || parsed.search
    || parsed.hash
    || parsed.pathname !== raw
  ) {
    throw new Error("LazyDesigner connection path is not canonical.");
  }

  return raw.length > 1 ? raw.replace(/\/+$/, "") : raw;
}

export function runtimeTlsPaths(
  env: Record<string, string | undefined> = process.env,
  platform: string = process.platform
): { directory: string; cert: string; key: string } {
  const base = platform === "win32"
    ? env.APPDATA
    : env.XDG_CONFIG_HOME ?? (env.HOME ? `${env.HOME}/.config` : undefined);
  const directory = env.LAZYDESIGNER_TLS_DIR ?? (base ? `${base}/LazyDesigner/tls` : undefined);
  if (!directory || !/^(?:[A-Za-z]:[\\/]|\/)/.test(directory)) {
    throw new Error("LazyDesigner TLS directory must be absolute; set LAZYDESIGNER_TLS_DIR.");
  }
  return { directory, cert: `${directory}/cert.pem`, key: `${directory}/key.pem` };
}
