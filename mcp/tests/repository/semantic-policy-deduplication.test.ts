import { describe, expect, test } from "bun:test";

describe("semantic policy deduplication", () => {
  test("freshness refresh routing delegates to dependency matrix policy", async () => {
    const source = await Bun.file("gateway/development/semanticFreshness.ts").text();
    expect(source).toContain("semanticRefreshSurfacesForDimensions");
    expect(source).not.toContain('refresh.add("CAPABILITY_SEARCH")');
    expect(source).not.toContain('refresh.add("DESCRIBE_SCHEMA")');
  });

  test("authoring producers derive non-empty semantic history scopes from the capability manifest", async () => {
    const producers = [
      "server/tools/cubes.ts",
      "server/tools/element-hierarchy.ts",
      "server/tools/element-mutation.ts",
      "server/tools/locators.ts",
      "server/tools/texture-create.ts",
      "server/tools/texture-assignment.ts",
      "server/tools/texture-materials.ts",
      "server/tools/material-instances.ts",
      "server/tools/paint-brush.ts",
      "server/tools/paint-selection-layers.ts",
      "server/tools/paint-texture-transaction.ts",
      "server/tools/animation-create.ts",
      "server/tools/animation-keyframes.ts",
      "server/tools/animation-timeline.ts",
      "server/tools/animation-batch.ts",
      "server/tools/animation-effects.ts",
      "server/tools/animation-controller.ts",
      "server/tools/animation-rigging.ts",
    ];

    for (const path of producers) {
      const source = await Bun.file(path).text();
      expect(source, path).not.toMatch(
        /recordCurrentSemanticHistoryEffect\(\[\s*["']/
      );
    }
  });

  test("invalidation verification mapping delegates to dependency matrix policy", async () => {
    const source = await Bun.file("gateway/development/semanticInvalidation.ts").text();
    expect(source).toContain("semanticVerificationChecksForSurfaces");
    expect(source).not.toContain('checks.add("CAPABILITY_INTELLIGENCE")');
    expect(source).not.toContain('checks.add("DESCRIBE_PAYLOADS")');
  });
});
