import { createServer as createHttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import createNetServer from "@/server/net";

const HOST = "127.0.0.1";
const PORT = Number(process.env.LAZYDESIGNER_CONFORMANCE_PORT ?? 3333);
const ENDPOINT = "/bb-mcp";

const server = createNetServer(
  {
    createServer: (options, callback) => createHttpServer(options, callback),
  },
  {
    host: HOST,
    port: PORT,
    endpoint: ENDPOINT,
  }
);

if (!server.listening) {
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
}

const address = server.address();
if (!address || typeof address === "string") {
  throw new Error("Expected an IPv4 conformance listener.");
}
const tcpAddress = address as AddressInfo;
console.log(`LAZYDESIGNER_CONFORMANCE_URL=http://${HOST}:${tcpAddress.port}${ENDPOINT}`);

let closing = false;
async function close(): Promise<void> {
  if (closing) return;
  closing = true;
  await server.closeAndWait();
}

process.once("SIGINT", () => void close().finally(() => process.exit(0)));
process.once("SIGTERM", () => void close().finally(() => process.exit(0)));

await new Promise<void>(() => {});
