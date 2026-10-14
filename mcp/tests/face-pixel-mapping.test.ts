import { describe, expect, test } from "bun:test";
import {
  faceLocalPixelSize,
  mapFaceLocalPixelToAtlasPixel,
  mapFaceUvToTexturePixels,
  requireExactFacePixelGrid,
  requireFiniteFaceUv,
  requirePositiveTextureMetric,
  requireSupportedFaceRotation,
} from "@/lib/uv/facePixelMapping";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("face pixel mapping ownership", () => {
  test("maps logical UV coordinates directly at 1x pixel density", () => {
    expect(
      mapFaceUvToTexturePixels(
        [1, 2, 5, 6],
        { width: 128, displayHeight: 128, uvWidth: 128, uvHeight: 128 },
        "fixture"
      )
    ).toEqual({
      corners: [1, 2, 5, 6],
      rect: [1, 2, 5, 6],
      size: [4, 4],
      flip_u: false,
      flip_v: false,
    });
  });

  test("preserves U and V direction while normalizing only the returned bounds", () => {
    const uFlipped = mapFaceUvToTexturePixels(
      [5, 2, 1, 6],
      { width: 128, displayHeight: 128, uvWidth: 128, uvHeight: 128 },
      "fixture"
    );
    expect(uFlipped.rect).toEqual([1, 2, 5, 6]);
    expect(uFlipped.size).toEqual([4, 4]);
    expect(uFlipped.flip_u).toBe(true);
    expect(uFlipped.flip_v).toBe(false);

    const vFlipped = mapFaceUvToTexturePixels(
      [1, 6, 5, 2],
      { width: 128, displayHeight: 128, uvWidth: 128, uvHeight: 128 },
      "fixture"
    );
    expect(vFlipped.rect).toEqual([1, 2, 5, 6]);
    expect(vFlipped.flip_u).toBe(false);
    expect(vFlipped.flip_v).toBe(true);
  });

  test("scales logical UV into higher-density physical texture pixels", () => {
    expect(
      mapFaceUvToTexturePixels(
        [2, 3, 4, 5],
        { width: 256, displayHeight: 256, uvWidth: 128, uvHeight: 128 },
        "fixture"
      )
    ).toEqual({
      corners: [4, 6, 8, 10],
      rect: [4, 6, 8, 10],
      size: [4, 4],
      flip_u: false,
      flip_v: false,
    });
  });

  test("maps face-local pixels through Blockbench 0/90/180/270 rotation semantics", () => {
    const mapping = mapFaceUvToTexturePixels(
      [10, 20, 14, 23],
      { width: 128, displayHeight: 128, uvWidth: 128, uvHeight: 128 },
      "fixture"
    );

    expect(faceLocalPixelSize(mapping, 0, "fixture")).toEqual([4, 3]);
    expect(mapFaceLocalPixelToAtlasPixel(mapping, 0, 0, 0, "fixture")).toEqual({ x: 10, y: 20 });
    expect(mapFaceLocalPixelToAtlasPixel(mapping, 0, 3, 2, "fixture")).toEqual({ x: 13, y: 22 });

    expect(faceLocalPixelSize(mapping, 90, "fixture")).toEqual([3, 4]);
    expect(mapFaceLocalPixelToAtlasPixel(mapping, 90, 0, 0, "fixture")).toEqual({ x: 10, y: 22 });
    expect(mapFaceLocalPixelToAtlasPixel(mapping, 90, 2, 3, "fixture")).toEqual({ x: 13, y: 20 });

    expect(faceLocalPixelSize(mapping, 180, "fixture")).toEqual([4, 3]);
    expect(mapFaceLocalPixelToAtlasPixel(mapping, 180, 0, 0, "fixture")).toEqual({ x: 13, y: 22 });
    expect(mapFaceLocalPixelToAtlasPixel(mapping, 180, 3, 2, "fixture")).toEqual({ x: 10, y: 20 });

    expect(faceLocalPixelSize(mapping, 270, "fixture")).toEqual([3, 4]);
    expect(mapFaceLocalPixelToAtlasPixel(mapping, 270, 0, 0, "fixture")).toEqual({ x: 13, y: 20 });
    expect(mapFaceLocalPixelToAtlasPixel(mapping, 270, 2, 3, "fixture")).toEqual({ x: 10, y: 22 });
  });

  test("applies authored U/V direction after local rotation mapping", () => {
    const mapping = mapFaceUvToTexturePixels(
      [14, 23, 10, 20],
      { width: 128, displayHeight: 128, uvWidth: 128, uvHeight: 128 },
      "fixture"
    );
    expect(mapping.flip_u).toBe(true);
    expect(mapping.flip_v).toBe(true);
    expect(mapFaceLocalPixelToAtlasPixel(mapping, 0, 0, 0, "fixture")).toEqual({ x: 13, y: 22 });
    expect(mapFaceLocalPixelToAtlasPixel(mapping, 90, 0, 0, "fixture")).toEqual({ x: 13, y: 20 });
  });

  test("exact face-local mapping rejects fractional grids, bad rotations, and out-of-range pixels", () => {
    const fractional = mapFaceUvToTexturePixels(
      [0.25, 0, 1.25, 1],
      { width: 128, displayHeight: 128, uvWidth: 128, uvHeight: 128 },
      "fixture"
    );
    expect(() => requireExactFacePixelGrid(fractional, "fixture")).toThrow();
    expect(() => requireSupportedFaceRotation(45, "fixture")).toThrow();

    const exact = mapFaceUvToTexturePixels(
      [0, 0, 4, 3],
      { width: 128, displayHeight: 128, uvWidth: 128, uvHeight: 128 },
      "fixture"
    );
    expect(() => mapFaceLocalPixelToAtlasPixel(exact, 0, 4, 0, "fixture")).toThrow();
    expect(() => mapFaceLocalPixelToAtlasPixel(exact, 90, 3, 0, "fixture")).toThrow();
    expect(() => mapFaceLocalPixelToAtlasPixel(exact, 0, 0.5, 0, "fixture")).toThrow();
  });

  test("rejects non-finite UVs and non-positive texture metrics", () => {
    expect(() => requireFiniteFaceUv([0, Number.NaN, 1, 1], "fixture")).toThrow();
    expect(() => requireFiniteFaceUv([0, 0, 1], "fixture")).toThrow();
    expect(() => requirePositiveTextureMetric(0, "fixture")).toThrow();
    expect(() => requirePositiveTextureMetric(Number.POSITIVE_INFINITY, "fixture")).toThrow();
  });

  test("inspect_element consumes the shared mapping owner instead of carrying a second implementation", async () => {
    const inspection = await source("server/tools/element/inspection.ts");
    expect(inspection).toContain('from "@/lib/uv/facePixelMapping"');
    expect(inspection).toContain("mapFaceUvToTexturePixels(");
    expect(inspection).not.toContain("function roundNativePainterCoordinate");
    expect(inspection).not.toContain("function requirePositiveTextureMetric");
  });
});
