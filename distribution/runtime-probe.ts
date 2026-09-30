import { createConnection, isIP } from "node:net";

// Update activation only: an open TCP listener is occupied even when HTTP is
// unhealthy. Native socket errors avoid fetch-specific error-code translation.
export function probeLoopbackPort(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  if (!(host === "localhost" || host === "::1" || isIP(host) === 4 && host.startsWith("127."))
      || !Number.isInteger(port) || port < 1 || port > 65535
      || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10000) {
    return Promise.reject(new Error("Invalid loopback availability probe."));
  }
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    let settled = false;
    const finish = (online?: boolean, error?: Error) => {
      if (settled) return;
      settled = true; socket.destroy();
      if (error) reject(error); else resolve(online === true);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ECONNREFUSED") finish(false);
      else finish(undefined, new Error(`Runtime availability is uncertain (${error.code ?? error.message}); no active files will be replaced.`));
    });
    socket.setTimeout(timeoutMs, () => finish(undefined, new Error("Runtime availability timed out; no active files will be replaced.")));
  });
}
