import { describe, expect, test } from "bun:test";
import { packAtlasRects } from "@/lib/uv/maxRectsPlanner";

describe("UV MaxRects planner", () => {
  test("packs deterministically without overlap", () => {
    const input = [
      { id: "body", width: 8, height: 8 },
      { id: "arm", width: 4, height: 8 },
      { id: "leg", width: 4, height: 8 },
    ];
    const a = packAtlasRects(input, { width: 16, height: 16, padding: 1, allow_rotation: true });
    const b = packAtlasRects(input, { width: 16, height: 16, padding: 1, allow_rotation: true });
    expect(a).toEqual(b);
    expect(a.complete).toBe(true);
    for (let i = 0; i < a.placements.length; i += 1) for (let j = i + 1; j < a.placements.length; j += 1) {
      const x = a.placements[i], y = a.placements[j];
      expect(x.x + x.width <= y.x || y.x + y.width <= x.x || x.y + x.height <= y.y || y.y + y.height <= x.y).toBe(true);
    }
  });

  test("respects reserved regions for incremental planning", () => {
    const result = packAtlasRects(
      [{ id: "changed", width: 4, height: 4 }],
      { width: 16, height: 16, reserved_rects: [{ id: "locked", x: 0, y: 0, width: 8, height: 8 }] }
    );
    expect(result.complete).toBe(true);
    const changed = result.placements[0];
    expect(changed.x >= 8 || changed.y >= 8).toBe(true);
  });
});
