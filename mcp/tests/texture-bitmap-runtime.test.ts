import { describe, expect, test } from "bun:test";
import { fullTextureRgba } from "@/lib/textureBitmapRuntime";

describe("texture bitmap runtime memory contract", () => {
  test("fullTextureRgba reuses the invocation-owned ImageData buffer", () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4);
    const texture = {
      name: "atlas",
      canvas: { width: 4, height: 4 },
      ctx: {
        getImageData() {
          return { data: pixels };
        },
      },
    } as unknown as Texture;

    const snapshot = fullTextureRgba(texture);

    expect(snapshot.pixels).toBe(pixels);
    expect(snapshot.width).toBe(4);
    expect(snapshot.height).toBe(4);
  });
});
