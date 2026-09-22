import { describe, expect, test } from "bun:test";

describe("Painter runtime callback typing", () => {
  test("direct Texture.edit callbacks use the runtime augmentation contract explicitly", async () => {
    for (const file of [
      "server/tools/paint-brush.ts",
      "server/tools/paint-texture-transaction.ts",
    ]) {
      const source = await Bun.file(file).text();
      expect(source, file).toContain("BlockbenchRuntimeTextureEditEnvironment");
      expect(source, file).toContain("HTMLCanvasElement");
    }
  });
});
