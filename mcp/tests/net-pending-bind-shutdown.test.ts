import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import createNetServer from "@/server/net";

describe("BlockIT pending listener shutdown", () => {
  test("closeAndWait cancels a listener even before the listening event", async () => {
    const server = createNetServer(
      { createServer: (options, callback) => createHttpServer(options, callback) },
      { port: 0, endpoint: "/bb-mcp", host: "127.0.0.1" }
    );

    await server.closeAndWait();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(server.listening).toBe(false);
    expect(server.address()).toBeNull();
  });
});
