import { describe, expect, test } from "bun:test";

const HOT_PATH_FILES = [
  "server/tools/texture-materials.ts",
  "server/tools/locators.ts",
  "server/tools/animation-effects.ts",
  "server/tools/animation-controller.ts",
  "server/tools/element-hierarchy.ts",
  "server/tools/element-mutation.ts",
  "server/tools/animation-rigging.ts",
  "server/tools/cubes.ts",
  "server/tools/paint-texture-transaction.ts",
  "server/tools/animation-create.ts",
  "server/tools/animation-keyframes.ts",
  "server/tools/animation-timeline.ts",
  "server/tools/animation-batch.ts",
  "server/tools/material-instances.ts",
  "server/tools/texture-assignment.ts",
  "server/tools/paint-brush.ts",
  "server/tools/paint-selection-layers.ts",
] as const;

describe("semantic Undo history coverage", () => {
  test("every hot-path Undo commit records bounded semantic effect metadata", async () => {
    for (const path of HOT_PATH_FILES) {
      const source = await Bun.file(path).text();
      const finishCount = source.match(/Undo\.finishEdit\(/g)?.length ?? 0;
      const semanticCount =
        source.match(/recordCurrentSemanticHistoryEffect\(/g)?.length ?? 0;

      expect(finishCount, path).toBeGreaterThan(0);
      expect(semanticCount, path).toBe(finishCount);
    }
  });

  test("semantic history remains ephemeral and fail-closed", async () => {
    const source = await Bun.file("lib/semanticHistory.ts").text();

    expect(source).toContain("new WeakMap<object, SemanticHistoryEffect>()");
    expect(source).not.toContain("writeFile");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("indexedDB");
    expect(source).toContain("return effects.get(entry) ?? null");
  });
});
