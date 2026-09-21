import { describe, expect, test } from "bun:test";
import { buildUvLayoutSnapshot } from "@/lib/uv/islands";
import { planUvPacking } from "@/lib/uv/packing/planner";
import { packMaxRects } from "@/lib/uv/packing/maxRects";

describe("UV MaxRects packing", () => {
  test("packs deterministic rectangles with padding and optional 90-degree rotation", () => {
    const first = packMaxRects(
      [
        {
          id: "wide",
          width: 6,
          height: 3,
          padding_x: 1,
          padding_y: 1,
          allow_rotate_90: true,
          priority: 0,
        },
        {
          id: "square",
          width: 4,
          height: 4,
          padding_x: 1,
          padding_y: 1,
          allow_rotate_90: false,
          priority: 0,
        },
      ],
      16,
      16
    );
    const second = packMaxRects(
      [
        {
          id: "wide",
          width: 6,
          height: 3,
          padding_x: 1,
          padding_y: 1,
          allow_rotate_90: true,
          priority: 0,
        },
        {
          id: "square",
          width: 4,
          height: 4,
          padding_x: 1,
          padding_y: 1,
          allow_rotate_90: false,
          priority: 0,
        },
      ],
      16,
      16
    );
    expect(second).toEqual(first);
    expect(first.placements).toHaveLength(2);
  });

  test("respects fixed occupied rectangles and fails closed on overlap", () => {
    const result = packMaxRects(
      [{
        id: "new",
        width: 4,
        height: 4,
        padding_x: 0,
        padding_y: 0,
        allow_rotate_90: false,
        priority: 0,
      }],
      16,
      16,
      [{ x: 0, y: 0, width: 8, height: 8 }]
    );
    expect(result.placements[0].footprint.x >= 8 ||
      result.placements[0].footprint.y >= 8).toBe(true);

    expect(() =>
      packMaxRects(
        [],
        16,
        16,
        [
          { x: 0, y: 0, width: 8, height: 8 },
          { x: 4, y: 4, width: 8, height: 8 },
        ]
      )
    ).toThrow(/overlaps/);
  });

  test("planner preserves locked islands and converts physical padding to logical units", () => {
    const snapshot = buildUvLayoutSnapshot(
      [
        {
          uuid: "locked",
          name: "locked",
          from: [0, 0, 0],
          to: [4, 4, 4],
          box_uv: false,
          autouv: 0,
          mirror_uv: false,
          faces: [{ face: "north", uv: [0, 0, 4, 4] }],
        },
        {
          uuid: "movable",
          name: "movable",
          from: [0, 0, 0],
          to: [4, 4, 4],
          box_uv: false,
          autouv: 0,
          mirror_uv: false,
          faces: [{ face: "north", uv: [20, 20, 24, 24] }],
        },
      ],
      32,
      32,
      (island) =>
        island.source.cube_name === "locked"
          ? { locked: true, padding_pixels: 2 }
          : { padding_pixels: 2 }
    );

    const plan = planUvPacking(snapshot, {
      bitmap_width: 64,
      bitmap_height: 64,
    });

    expect(plan.backend).toBe("maxrects_v1");
    expect(plan.score.valid).toBe(true);
    expect(plan.proposed.islands[0].rect).toEqual(
      snapshot.islands[0].rect
    );
    expect(plan.moved_island_ids).toContain(
      "face:movable:north"
    );
    const movable = plan.proposed.islands.find(
      (island) => island.id === "face:movable:north"
    )!;
    expect(movable.rect.x >= 1).toBe(true);
    expect(movable.rect.y >= 1).toBe(true);
  });

  test("rotation constraint prevents planner from silently rotating identity islands", () => {
    expect(() =>
      packMaxRects(
        [{
          id: "identity",
          width: 9,
          height: 4,
          padding_x: 0,
          padding_y: 0,
          allow_rotate_90: false,
          priority: 0,
        }],
        5,
        10
      )
    ).toThrow(/could not fit/);

    const rotated = packMaxRects(
      [{
        id: "generic",
        width: 9,
        height: 4,
        padding_x: 0,
        padding_y: 0,
        allow_rotate_90: true,
        priority: 0,
      }],
      5,
      10
    );
    expect(rotated.placements[0].rotated_90).toBe(true);
  });
});
