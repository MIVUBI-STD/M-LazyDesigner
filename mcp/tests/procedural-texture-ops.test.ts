import { describe, expect, test } from "bun:test";
import { renderProceduralTexture } from "@/lib/texture/proceduralOps";

describe("procedural texture primitives", () => {
  test("are deterministic and palette constrained", () => {
    const recipe = { width: 8, height: 8, base: [20,40,60,255] as const, noise: { seed: 7, amount: 24 }, palette: [[0,0,0],[64,64,64],[128,128,128]] as const, dither: "bayer4" as const };
    const a = renderProceduralTexture(recipe);
    const b = renderProceduralTexture(recipe);
    expect([...a]).toEqual([...b]);
    for (let i = 0; i < a.length; i += 4) expect([0,64,128]).toContain(a[i]);
  });
});
