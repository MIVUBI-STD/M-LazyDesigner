/** Shared by the native plugin and Bun clients; no native imports at load time. */
export const DEFAULT_RUNTIME_URL = "https://127.0.0.1:3000/bb-mcp";

export function runtimeTlsPaths(
  env: Record<string, string | undefined> = process.env,
  platform: string = process.platform
): { directory: string; cert: string; key: string } {
  const base = platform === "win32"
    ? env.APPDATA
    : env.XDG_CONFIG_HOME ?? (env.HOME ? `${env.HOME}/.config` : undefined);
  const directory = env.BLOCKIT_TLS_DIR ?? (base ? `${base}/LazyDesigner/tls` : undefined);
  if (!directory || !/^(?:[A-Za-z]:[\\/]|\/)/.test(directory)) {
    throw new Error("LazyDesigner TLS directory must be absolute; set BLOCKIT_TLS_DIR.");
  }
  return { directory, cert: `${directory}/cert.pem`, key: `${directory}/key.pem` };
}
