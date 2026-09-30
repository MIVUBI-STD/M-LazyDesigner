import { describe, expect, test } from "bun:test";

describe("semantic dependency matrix ownership", () => {
  test("invalidation planner delegates dimension ownership to central matrix", async () => {
    const source = await Bun.file("gateway/development/semanticInvalidation.ts").text();
    expect(source).toContain("semanticSurfacesAffectedByDimensions");
    expect(source).toContain("applyAffectedSurfaces");
    expect(source).toContain("semanticVerificationChecksForSurfaces");
    expect(source).not.toContain('checks.add("CAPABILITY_INTELLIGENCE")');
    expect(source).not.toContain('checks.add("DESCRIBE_PAYLOADS")');
  });

  test("artifact freshness delegates dependency scope to central matrix", async () => {
    const source = await Bun.file("gateway/development/semanticArtifact.ts").text();
    expect(source).toContain("semanticDependenciesForSurface");
  });

  test("legacy semantic dependency alias remains retired", async () => {
    const source = await Bun.file("gateway/development/semanticDependencies.ts").text();
    expect(source).not.toContain("SEMANTIC_DEPENDENCY_POLICY");
  });

  test("invalidation does not duplicate a hard-coded family loop", async () => {
    const source = await Bun.file("gateway/development/semanticInvalidation.ts").text();
    expect(source).not.toContain('for (const family of [');
  });
});
