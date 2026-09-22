import { describe, expect, test } from "bun:test";

describe("semantic compatibility cleanup", () => {
  test("legacy dependency policy alias is retired", async () => {
    const source = await Bun.file("gateway/development/semanticDependencies.ts").text();
    expect(source).not.toContain("SEMANTIC_DEPENDENCY_POLICY");
  });

  test("full semantic invalidation derives from the same surface matrix", async () => {
    const source = await Bun.file("gateway/development/semanticInvalidation.ts").text();
    expect(source).toContain("applyAffectedSurfaces");
    expect(source).toContain("semanticSurfacesAffectedByDimensions");
    expect(source).not.toContain('for (const family of [');
  });
});
