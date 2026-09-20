import { describe, expect, test } from "bun:test";
import {
  ensureTextureDiagnosticInvocationContext,
  readTextureDiagnosticRegion,
  textureDiagnosticReadMetrics,
} from "@/lib/textureDiagnosticReadContext";

describe("request-local texture diagnostic read context", () => {
  test("subregions are served from a cached parent read", () => {
    let reads = 0;
    const data = new Uint8ClampedArray(
      Array.from({ length: 4 * 4 * 4 }, (_, index) => index)
    );
    const texture = {
      uuid: "atlas",
      ctx: {
        getImageData(x: number, y: number, width: number, height: number) {
          reads += 1;
          const out = new Uint8ClampedArray(width * height * 4);
          for (let row = 0; row < height; row += 1) {
            const sourceStart = ((y + row) * 4 + x) * 4;
            const sourceEnd = sourceStart + width * 4;
            out.set(data.subarray(sourceStart, sourceEnd), row * width * 4);
          }
          return { data: out };
        },
      },
    } as unknown as Texture;

    const context = ensureTextureDiagnosticInvocationContext(undefined);
    const parent = readTextureDiagnosticRegion(
      context,
      texture,
      0,
      0,
      4,
      4
    );
    const child = readTextureDiagnosticRegion(
      context,
      texture,
      1,
      1,
      1,
      1
    );

    expect(parent.cache_hit).toBe(false);
    expect(child.cache_hit).toBe(true);
    expect(reads).toBe(1);
    expect(Array.from(child.pixels)).toEqual([20, 21, 22, 23]);
    expect(textureDiagnosticReadMetrics(context)).toEqual({
      read_calls: 1,
      cache_hits: 1,
      pixels_read: 16,
      bytes_read: 64,
      cached_regions: 1,
    });
  });

  test("cache state is isolated by invocation context", () => {
    let reads = 0;
    const texture = {
      uuid: "atlas",
      ctx: {
        getImageData() {
          reads += 1;
          return { data: new Uint8ClampedArray([1, 2, 3, 4]) };
        },
      },
    } as unknown as Texture;

    const a = ensureTextureDiagnosticInvocationContext(undefined);
    const b = ensureTextureDiagnosticInvocationContext(undefined);

    readTextureDiagnosticRegion(a, texture, 0, 0, 1, 1);
    readTextureDiagnosticRegion(a, texture, 0, 0, 1, 1);
    readTextureDiagnosticRegion(b, texture, 0, 0, 1, 1);

    expect(reads).toBe(2);
    expect(textureDiagnosticReadMetrics(a)?.cache_hits).toBe(1);
    expect(textureDiagnosticReadMetrics(b)?.cache_hits).toBe(0);
  });
});
