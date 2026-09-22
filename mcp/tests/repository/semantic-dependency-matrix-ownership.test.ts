import { describe, expect, test } from "bun:test";

describe("semantic dependency matrix ownership", () => {
  test("invalidation planner delegates dimension ownership to central matrix", async () => {
    const source = await Bun.file("gateway/development/semanticInvalidation.ts").text();
    expect(source).toContain("semanticSurfacesAffectedByDimensions");
    expect(source).not.toContain('dimension === "ROUTING"');
    expect(source).not.toContain('dimension === "GRAPH"');
    expect(source).not.toContain('dimension === "SCHEMA_PROJECTION"');
  });

  test("artifact freshness delegates dependency scope to central matrix", async () => {
    const source = await Bun.file("gateway/development/semanticArtifact.ts").text();
    expect(source).toContain("semanticDependenciesForSurface");
  });
});
