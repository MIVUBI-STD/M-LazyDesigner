import { describe, expect, test } from "bun:test";
import {
  extractPaletteMedianCut,
  generateShadeRamp,
  gradientMapRgba,
  nearestPaletteIndex,
  oklabToRgba,
  palettizeRgba,
  parseHexRgba,
  rgbaToHex,
  rgbaToOklab,
} from "@/lib/textureColorEngine";

function lightness(hex: string): number {
  return rgbaToOklab(parseHexRgba(hex)).L;
}

describe("texture color intelligence core", () => {
  test("Oklab conversion round-trips representative sRGB colors", () => {
    for (const color of [
      "#000000",
      "#FFFFFF",
      "#845442",
      "#27A5D8",
      "#E34B71",
      "#81B24C",
    ]) {
      const source = parseHexRgba(color);
      const roundTrip = oklabToRgba(rgbaToOklab(source), source[3]);
      for (let channel = 0; channel < 3; channel += 1) {
        expect(
          Math.abs(roundTrip[channel] - source[channel]),
          color
        ).toBeLessThanOrEqual(1);
      }
    }
  });

  test("shade ramps are deterministic and monotonic in perceived lightness", () => {
    const ramp = generateShadeRamp("#845442", { steps: 5 });
    expect(ramp).toHaveLength(5);
    expect(ramp[2]).toBe("#845442");

    const values = ramp.map(lightness);
    for (let index = 1; index < values.length; index += 1) {
      expect(values[index]).toBeGreaterThan(values[index - 1]);
    }

    expect(generateShadeRamp("#845442", { steps: 5 })).toEqual(ramp);
  });

  test("custom shade-ramp controls remain bounded and deterministic", () => {
    const ramp = generateShadeRamp("#557799", {
      steps: 7,
      shadowLightnessDelta: -0.3,
      highlightLightnessDelta: 0.18,
      shadowHueShift: -14,
      highlightHueShift: 10,
      shadowChromaScale: 1.1,
      highlightChromaScale: 0.8,
    });

    expect(ramp).toHaveLength(7);
    expect(new Set(ramp).size).toBeGreaterThanOrEqual(5);
    expect(ramp.every((color) => /^#[0-9A-F]{6}$/.test(color))).toBe(true);
  });

  test("nearest palette matching uses perceptual color distance", () => {
    const palette = ["#101010", "#808080", "#F0F0F0"];
    expect(nearestPaletteIndex(parseHexRgba("#777777"), palette)).toBe(1);
    expect(nearestPaletteIndex(parseHexRgba("#F9F9F9"), palette)).toBe(2);
  });

  test("nearest gradient map collapses grayscale into explicit shade steps", () => {
    const pixels = new Uint8ClampedArray([
      0, 0, 0, 255,
      128, 128, 128, 255,
      255, 255, 255, 255,
      0, 0, 0, 0,
    ]);
    const ramp = ["#220000", "#AA5500", "#FFF0C0"];
    const mapped = gradientMapRgba(pixels, 4, 1, ramp, {
      mode: "nearest",
    });

    expect(rgbaToHex(Array.from(mapped.slice(0, 4)) as [number,number,number,number])).toBe("#220000");
    expect(rgbaToHex(Array.from(mapped.slice(4, 8)) as [number,number,number,number])).toBe("#AA5500");
    expect(rgbaToHex(Array.from(mapped.slice(8, 12)) as [number,number,number,number])).toBe("#FFF0C0");
    expect(Array.from(mapped.slice(12, 16))).toEqual([0, 0, 0, 0]);
  });

  test("ordered gradient mapping is deterministic and uses only ramp colors", () => {
    const pixels = new Uint8ClampedArray(
      Array.from({ length: 8 * 8 }, () => [128, 128, 128, 255]).flat()
    );
    const ramp = ["#000000", "#FFFFFF"];
    const first = gradientMapRgba(pixels, 8, 8, ramp, {
      mode: "ordered",
      matrix: "bayer4",
    });
    const second = gradientMapRgba(pixels, 8, 8, ramp, {
      mode: "ordered",
      matrix: "bayer4",
    });

    expect(Array.from(second)).toEqual(Array.from(first));
    const colors = new Set<string>();
    for (let offset = 0; offset < first.length; offset += 4) {
      colors.add(
        rgbaToHex([
          first[offset],
          first[offset + 1],
          first[offset + 2],
          first[offset + 3],
        ])
      );
    }
    expect([...colors].sort()).toEqual(["#000000", "#FFFFFF"]);
  });

  test("palettize preserves exact palette colors and alpha", () => {
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 128,
      10, 10, 10, 0,
    ]);
    const result = palettizeRgba(
      pixels,
      3,
      1,
      ["#FF0000", "#00FF00", "#0000FF"],
      { dither: "none" }
    );

    expect(Array.from(result)).toEqual(Array.from(pixels));
  });

  test("ordered palettize is deterministic and remains palette-bound", () => {
    const pixels = new Uint8ClampedArray(
      Array.from({ length: 16 }, () => [120, 120, 120, 255]).flat()
    );
    const palette = ["#000000", "#FFFFFF"];
    const result = palettizeRgba(pixels, 4, 4, palette, {
      dither: "ordered",
      matrix: "bayer2",
    });

    const colors = new Set<string>();
    for (let offset = 0; offset < result.length; offset += 4) {
      colors.add(
        rgbaToHex([
          result[offset],
          result[offset + 1],
          result[offset + 2],
          result[offset + 3],
        ])
      );
    }
    expect(colors.size).toBe(2);
    expect([...colors].every((color) => palette.includes(color))).toBe(true);
  });

  test("median-cut extraction returns a deterministic lightness-sorted palette", () => {
    const pixels = new Uint8ClampedArray([
      ...Array.from({ length: 8 }, () => [10, 10, 10, 255]).flat(),
      ...Array.from({ length: 8 }, () => [230, 230, 230, 255]).flat(),
    ]);
    const palette = extractPaletteMedianCut(pixels, 16, 1, 2);

    expect(palette).toHaveLength(2);
    expect(lightness(palette[0])).toBeLessThan(lightness(palette[1]));
    expect(extractPaletteMedianCut(pixels, 16, 1, 2)).toEqual(palette);
  });

  test("color engine rejects unbounded requests before pixel work", () => {
    expect(() => generateShadeRamp("#845442", { steps: 17 })).toThrow(
      "2 to 16"
    );
    expect(() =>
      palettizeRgba(
        new Uint8ClampedArray(4),
        1,
        1,
        [],
        {}
      )
    ).toThrow("1 to 64");
    expect(() =>
      extractPaletteMedianCut(
        new Uint8ClampedArray(4),
        1,
        1,
        33
      )
    ).toThrow("1 to 32");
  });
});
