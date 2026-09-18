import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { GATEWAY_TOOLS } from "@/gateway/contract";

describe("LazyDesigner Gateway modern stdio protocol", () => {
  test("2026-07-28 negotiation exposes only the four stable Gateway tools", async () => {
    const client = new Client(
      { name: "gateway-modern-stdio-fixture", version: "1.0.0" },
      { versionNegotiation: { mode: { pin: "2026-07-28" } } }
    );
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["run", "./gateway/index.ts"],
      cwd: process.cwd(),
    });

    try {
      await client.connect(transport);
      expect(client.getProtocolEra()).toBe("modern");

      const listed = await client.listTools();
      expect(listed.tools.map((tool) => tool.name).sort()).toEqual(
        Object.values(GATEWAY_TOOLS).sort()
      );
    } finally {
      await client.close();
    }
  }, 15_000);
});
