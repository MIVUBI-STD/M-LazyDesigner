import { describe, expect, test } from "bun:test";
import { morphBinaryMaskRound } from "@/lib/binaryMaskMorphology";

function brute(
  mask: Int8Array,
  width: number,
  height: number,
  radius: number,
  mode: "expand" | "contract"
): Int8Array {
  const out = new Int8Array(mask);
  const expected = mode === "expand" ? 1 : 0;
  const radiusSquared = radius * radius;

  const get = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return 0;
    return mask[y * width + x] ? 1 : 0;
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (mask[index] === expected) continue;
      let found = false;
      for (let dx = -radius; dx <= radius && !found; dx += 1) {
        for (let dy = -radius; dy <= radius; dy += 1) {
          if (dx * dx + dy * dy > radiusSquared) continue;
          if (get(x + dx, y + dy) === expected) {
            found = true;
            break;
          }
        }
      }
      if (found) out[index] = expected;
    }
  }
  return out;
}

function deterministicMask(width: number, height: number, seed: number) {
  const mask = new Int8Array(width * height);
  let state = seed >>> 0;
  for (let index = 0; index < mask.length; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    mask[index] = state & 1;
  }
  return mask;
}

describe("linear-time round selection morphology", () => {
  test("matches the legacy brute-force circular semantics", () => {
    for (let width = 1; width <= 7; width += 1) {
      for (let height = 1; height <= 6; height += 1) {
        for (let radius = 0; radius <= 4; radius += 1) {
          for (let seed = 1; seed <= 8; seed += 1) {
            const mask = deterministicMask(width, height, seed);
            for (const mode of ["expand", "contract"] as const) {
              expect(
                morphBinaryMaskRound(mask, width, height, radius, mode),
                `${width}x${height} r${radius} seed${seed} ${mode}`
              ).toEqual(brute(mask, width, height, radius, mode));
            }
          }
        }
      }
    }
  });

  test("preserves all-empty/all-full edge semantics", () => {
    const empty = new Int8Array(25);
    expect(morphBinaryMaskRound(empty, 5, 5, 3, "expand")).toEqual(empty);

    const full = new Int8Array(25);
    full.fill(1);
    expect(
      Array.from(morphBinaryMaskRound(full, 5, 5, 1, "contract"))
    ).toEqual([
      0,0,0,0,0,
      0,1,1,1,0,
      0,1,1,1,0,
      0,1,1,1,0,
      0,0,0,0,0,
    ]);
  });

  test("rejects invalid dimensions and radius", () => {
    expect(() =>
      morphBinaryMaskRound(new Int8Array(4), 2, 2, -1, "expand")
    ).toThrow("non-negative integer");
    expect(() =>
      morphBinaryMaskRound(new Int8Array(3), 2, 2, 1, "expand")
    ).toThrow("dimensions");
  });
});
