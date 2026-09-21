import { describe, expect, test } from "bun:test";
import { planSemanticUv } from "@/lib/uv/semanticPlanner";

describe("semantic UV efficiency contract", () => {
  test("one changed island retains unaffected placements", () => {
    const islands = Array.from({ length: 24 }, (_, index) => ({
      id: "i" + index,
      world_size: [3, 3] as const,
      cohort: "base",
    }));
    const before = planSemanticUv(islands, {
      atlas_width: 96,
      atlas_height: 96,
      default_texel_density: 1,
      padding: 1,
    });
    const after = planSemanticUv(
      islands.map((island, index) =>
        index === 8 ? { ...island, world_size: [5, 3] as const } : island
      ),
      {
        atlas_width: 96,
        atlas_height: 96,
        default_texel_density: 1,
        padding: 1,
        previous_placements: before.owner_placements,
        affected_ids: ["i8"],
      }
    );
    expect(after.complete).toBe(true);
    expect(after.retained_ids).toHaveLength(23);
    for (const retained of after.retained_ids) {
      const a = before.placements.find((placement) => placement.id === retained)!;
      const b = after.placements.find((placement) => placement.id === retained)!;
      expect([b.x,b.y,b.width,b.height,b.rotated]).toEqual([a.x,a.y,a.width,a.height,a.rotated]);
    }
  });
});
