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
});
