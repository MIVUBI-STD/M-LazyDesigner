import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("Control context ownership", () => {
  test("content-addressed context reuse is owned by registry + packet only", async () => {
    expect(await Bun.file("gateway/control/contextCache.ts").exists()).toBe(false);

    const [barrel, registry, packet] = await Promise.all([
      source("gateway/control/index.ts"),
      source("gateway/control/registry.ts"),
      source("gateway/control/packet.ts"),
    ]);

    expect(barrel).not.toContain("contextCache");
    expect(barrel).not.toContain("contextSetChanged");
    expect(registry).toContain("contextHandleCache");
    expect(registry).toContain("sha256");
    expect(packet).toContain("knownContextIds");
    expect(packet).toContain("cached_ids");
    expect(packet).toContain("invalidated_ids");
  });

  test("fallback source ownership points to the canonical Runtime surface owner", async () => {
    const registry = await source("gateway/control/registry.ts");

    expect(registry).toContain('source: "mcp/server/runtime/registration.ts"');
    expect(registry).not.toContain('source: "mcp/server/tools.ts"');
  });

  test("Control does not add a second persistent context state store", async () => {
    const packet = await source("gateway/control/packet.ts");
    const registry = await source("gateway/control/registry.ts");

    expect(packet).not.toContain("writeFile");
    expect(packet).not.toContain("mkdir");
    expect(registry).not.toContain("writeFile");
    expect(registry).not.toContain("mkdir");
  });
});
