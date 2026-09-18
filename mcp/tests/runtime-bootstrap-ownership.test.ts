import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("Runtime bootstrap ownership", () => {
  test("server.ts delegates intelligence wiring to one bootstrap", async () => {
    const text = await source("server/server.ts");

    expect(text).toContain("initializeRuntimeCapabilityWiring();");
    expect(text).not.toContain("wireAuthoringQualityIntelligence();");
    expect(text).not.toContain("wireTextureQualityRuntime();");
    expect(text).not.toContain("wireAnimationNativeIntelligence();");
    expect(text).not.toContain("describeMcpSurfaceToolNames(profile, phase)");
  });

  test("runtime bootstrap is explicitly idempotent and does not own extension order", async () => {
    const [bootstrap, registration, extensions] = await Promise.all([
      source("server/runtime/bootstrap.ts"),
      source("server/runtime/registration.ts"),
      source("server/runtime/extensions.ts"),
    ]);

    expect(bootstrap).toContain("let initialized = false");
    expect(bootstrap).toContain("if (initialized) return");
    expect(bootstrap).toContain("initialized = true");
    expect(bootstrap).not.toContain("wireTextureQualityRuntime");
    expect(bootstrap).not.toContain("wireAnimationNativeIntelligence");

    expect(registration).toContain("applyRuntimeExtensionPipeline();");
    expect(extensions).toContain("RUNTIME_EXTENSION_PIPELINE");
    expect(extensions).toContain('id: "texture-contracts"');
    expect(extensions).toContain('id: "animation-contracts"');
  });
});
