import { describe, expect, test } from "bun:test";

describe("semantic dependency matrix ownership", () => {
  test("invalidation planner delegates dimension ownership to central matrix", async () => {
    const source = await Bun.file("gateway/development/semanticInvalidation.ts").text();
    expect(source).toContain("semanticSurfacesAffectedByDimensions");
    expect(source).toContain("affectedSurfaces");
    expect(source).toContain('affectedSurfaces.includes("CAPABILITY_SEARCH")');
    expect(source).toContain('affectedSurfaces.includes("DESCRIBE_SCHEMA")');
  });

  test("artifact freshness delegates dependency scope to central matrix", async () => {
    const source = await Bun.file("gateway/development/semanticArtifact.ts").text();
    expect(source).toContain("semanticDependenciesForSurface");
  });
});
