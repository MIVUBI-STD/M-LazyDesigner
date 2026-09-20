import { describe, expect, test } from "bun:test";
import { cropRgbaRect } from "@/lib/textureBitmapRuntime";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("texture transaction dirty-region path", () => {
  test("cropRgbaRect returns the exact bounded RGBA window", () => {
    const pixels = new Uint8ClampedArray(
      Array.from({ length: 4 * 3 * 4 }, (_, index) => index)
    );
    const crop = cropRgbaRect(pixels, 4, 3, [1, 1, 3, 3]);

    expect(crop).toMatchObject({
      width: 2,
      height: 2,
      left: 1,
      top: 1,
    });
    expect(Array.from(crop.pixels)).toEqual([
      20, 21, 22, 23, 24, 25, 26, 27,
      36, 37, 38, 39, 40, 41, 42, 43,
    ]);
  });

  test("transaction applies only the dirty canvas region but keeps full postcondition proof", async () => {
    const src = await source("server/tools/paint-texture-transaction.ts");

    expect(src).toContain("const dirtyRegion = cropRgbaRect(");
    expect(src).toContain("env.ctx.createImageData(");
    expect(src).toContain("dirtyRegion.width");
    expect(src).toContain("dirtyRegion.height");
    expect(src).toContain("env.ctx.putImageData(imageData, localX, localY)");
    expect(src).toContain("const actualAfter = fullTextureRgba(texture)");
    expect(src).toContain("actualAfterRevision");
    expect(src).toContain("rgbaToPngDataUrl(");
    expect(src).toContain("dirtyRegion.pixels");
    expect(src).not.toContain("rgbaRectToPngDataUrl(");
  });

  test("deterministic transaction remains selection-neutral", async () => {
    const src = await source("server/tools/paint-texture-transaction.ts");

    expect(src).toContain("resolvePaintTexture(texture_id)");
    expect(src).not.toContain("getAndActivateTexture(texture_id)");
    expect(src).not.toContain("selected_texture: true");
  });
});
