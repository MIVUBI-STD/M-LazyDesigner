import { describe, expect, test } from "bun:test";

const WRAPPERS: Readonly<Record<string, string>> = {
  "gateway/capabilityManifest.ts":
    'export * from "./capabilities/manifest";\n',
  "gateway/capabilityIntelligence.ts":
    'export * from "./capabilities/intelligence";\n',
  "gateway/capabilityGraph.ts":
    'export * from "./capabilities/graph";\n',
  "gateway/schemaProjection.ts":
    'export * from "./capabilities/schemaProjection";\n',
  "gateway/capabilityEffects.ts":
    'export * from "./capabilities/effects";\n',
  "gateway/connectionManager.ts":
    'export * from "./runtime/connectionManager";\n',
  "gateway/reconnectPolicy.ts":
    'export * from "./runtime/reconnectPolicy";\n',
  "gateway/recovery.ts":
    'export * from "./runtime/recovery";\n',
  "gateway/runtimeSession.ts":
    'export * from "./runtime/runtimeSession";\n',
  "gateway/projectAffinity.ts":
    'export * from "./runtime/projectAffinity";\n',
  "gateway/localCapabilities.ts":
    'export * from "./providers/registry";\n',
  "gateway/vanillaEntityReference.ts":
    'export * from "./providers/vanillaEntityReference";\n',
  "gateway/control/delta.ts":
    'export * from "./delta/engine";\nexport * from "./delta/projection";\n',
  "gateway/control/capabilityManifest.ts":
    'export * from "./capabilityProjection";\n',
  "gateway/control/registry.ts":
    'export { contextForAuthoringDomain } from "./contexts";\nexport { authoringDomainForCapability, sourceOwnerForCapability } from "./sourceOwners";\n',
};

describe("Gateway structural ownership", () => {
  test("migrated root modules remain compatibility-only wrappers", async () => {
    for (const [path, expected] of Object.entries(WRAPPERS)) {
      expect(await Bun.file(path).text()).toBe(expected);
    }
  });

  test("production composition imports canonical owner paths", async () => {
    const index = await Bun.file("gateway/index.ts").text();
    const backend = await Bun.file("gateway/backend.ts").text();
    const contract = await Bun.file("gateway/contract.ts").text();

    expect(index).toContain('"./capabilities/schemaProjection"');
    expect(index).toContain('"./capabilities/graph"');
    expect(index).toContain('"./providers/registry"');
    expect(index).toContain('"./runtime/recovery"');

    expect(backend).toContain('"./runtime/projectAffinity"');
    expect(backend).toContain('"./runtime/connectionManager"');
    expect(backend).toContain('"./capabilities/effects"');
    expect(backend).toContain('"./runtime/backendContract"');

    expect(contract).toContain('"./capabilities/intelligence"');
    expect(contract).toContain('"./capabilities/graph"');

    const controlIndex = await Bun.file("gateway/control/index.ts").text();
    expect(controlIndex).toContain('"./delta/engine"');
    expect(controlIndex).toContain('"./delta/projection"');
  });

  test("core named phase ownership is manifest-backed", async () => {
    const authoringPhase = await Bun.file("lib/authoringPhase.ts").text();
    const metadata = await Bun.file("lib/capabilityMetadata.ts").text();

    expect(authoringPhase).toContain(
      'from "@/lib/capabilities/manifest"'
    );
    expect(authoringPhase).not.toContain("CORE_NAMED_CAPABILITIES");
    expect(authoringPhase).not.toContain("TEXTURING_NAMED_CAPABILITIES");
    expect(metadata).toContain('from "./capabilities/manifest"');
    expect(metadata).not.toContain("PRIMARY_CAPABILITIES");
  });
  test("Control delta engine stays assembly-only", async () => {
    const engine = await Bun.file("gateway/control/delta/engine.ts").text();
    expect(engine).toContain('from "./freshness"');
    expect(engine).toContain('from "./verification"');
    expect(engine).toContain('from "./receipts"');
    expect(engine).not.toContain("function locatorReceiptComplete");
    expect(engine).not.toContain("function mutationFreshness");
    expect(engine).not.toContain("function verificationClassForResult");
    expect(engine.split("\n").length).toBeLessThan(140);
  });

  test("Control capability metadata is projection-owned, not a second manifest", async () => {
    const registry = await Bun.file("gateway/control/registry.ts").text();
    const projection = await Bun.file("gateway/control/capabilityProjection.ts").text();
    expect(registry).toContain('from "./capabilityProjection"');
    expect(projection).toContain("getCapabilityMetadata");
    expect(projection).not.toContain("PRIMARY_CAPABILITIES");
  });

  test("Control registry stays a facade over context and source ownership", async () => {
    const registry = await Bun.file("gateway/control/registry.ts").text();
    const packet = await Bun.file("gateway/control/packet.ts").text();
    const capabilities = await Bun.file("gateway/control/capabilities.ts").text();
    const deltaEngine = await Bun.file("gateway/control/delta/engine.ts").text();

    expect(registry.split("\n").length).toBeLessThan(5);
    expect(packet).toContain('from "./contexts"');
    expect(capabilities).toContain('from "./sourceOwners"');
    expect(deltaEngine).toContain('from "../sourceOwners"');
  });

  test("Control source-owner composition stays modular", async () => {
    const sourceOwners = await Bun.file("gateway/control/sourceOwners.ts").text();
    expect(sourceOwners).toContain('from "./sourceOwners/geometry"');
    expect(sourceOwners).toContain('from "./sourceOwners/texturing"');
    expect(sourceOwners).toContain('from "./sourceOwners/animation"');
    expect(sourceOwners).toContain('from "./sourceOwners/core"');
    expect(sourceOwners.split("\n").length).toBeLessThan(90);
  });

});
