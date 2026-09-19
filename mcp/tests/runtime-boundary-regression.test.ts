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

  test("Runtime prefers modern SDK handling and keeps only a bounded SDK legacy JSON shim", async () => {
    const source = await repoFile("server/net.ts");

    expect(source).toContain("createMcpHandler");
    expect(source).toContain("legacy: 'reject'");
    expect(source).toContain("responseMode: 'auto'");
    expect(source).toContain("isLegacyRequest");
    expect(source).toContain("WebStandardStreamableHTTPServerTransport");
    expect(source).toContain("enableJsonResponse: true");
    expect(source).toContain("SDK v2.0.0 currently ignores");
    expect(source).not.toContain("custom legacy parser");
  });

  test("retired Runtime generations cannot publish late operation results", async () => {
    const source = await repoFile("lib/runtimeLifecycle.ts");
    const operationIndex = source.indexOf("const result = await operation();");
    const postCheckIndex = source.indexOf(
      "coordinator.ownerGeneration !== generation",
      operationIndex
    );
    const returnIndex = source.indexOf("return result;", operationIndex);

    expect(operationIndex).toBeGreaterThan(-1);
    expect(postCheckIndex).toBeGreaterThan(operationIndex);
    expect(returnIndex).toBeGreaterThan(postCheckIndex);
    expect(source.slice(postCheckIndex, returnIndex)).toContain(
      "throw new RuntimeGenerationRetiredError(generation)"
    );
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
