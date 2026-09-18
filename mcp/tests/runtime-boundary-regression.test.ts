import { describe, expect, test } from "bun:test";

const repoFile = (relative: string) =>
  Bun.file(new URL(`../${relative}`, import.meta.url)).text();

describe("Runtime boundary regressions", () => {
  test("tool-surface invalidation does not flush unrelated registration caches", async () => {
    const source = await repoFile("lib/factories.ts");
    const match = source.match(
      /export function invalidateToolRegistrationRuntimeCaches\(\): void \{([\s\S]*?)\n\}/
    );

    expect(match).not.toBeNull();
    const body = match?.[1] ?? "";
    expect(body).toContain("enabledToolDefinitionsCache = null");
    expect(body).toContain("enabledToolRegistrationCache = null");
    expect(body).not.toContain("resourceRegistrationCache = null");
    expect(body).not.toContain("promptRegistrationCache = null");
    expect(body).not.toContain("toolInvocationCache.clear()");
  });

  test("Runtime protocol ownership converges on one SDK handler for modern and legacy stateless traffic", async () => {
    const source = await repoFile("server/net.ts");

    expect(source).toContain("createMcpHandler");
    expect(source).toContain("legacy: 'stateless'");
    expect(source).toContain("responseMode: 'json'");
    expect(source).not.toContain("isLegacyRequest");
    expect(source).not.toContain("WebStandardStreamableHTTPServerTransport");
    expect(source).not.toContain("handleLegacyJsonMcpRequest");
  });

  test("Runtime transport consumes canonical capability effects", async () => {
    const source = await repoFile("server/net.ts");

    expect(source).toContain("getCapabilityMetadata");
    expect(source).toContain("capabilityEffects?.projectAffinity");
    expect(source).toContain("capabilityEffects?.phaseAffinity");
    expect(source).not.toContain("capability === 'create_project'");
    expect(source).not.toContain("envelope.capability === 'create_project'");
    expect(source).not.toContain("capability === 'switch_authoring_phase'");
    expect(source).not.toContain("envelope.capability === 'switch_authoring_phase'");
  });
});
