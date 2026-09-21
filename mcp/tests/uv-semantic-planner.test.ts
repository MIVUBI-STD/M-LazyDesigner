import { describe, expect, test } from "bun:test";
import { planSemanticUv } from "@/lib/uv/semanticPlanner";
import { diffSemanticUv } from "@/lib/uv/semanticDiff";

describe("semantic UV planner", () => {
  test("applies cohort density and symmetry sharing", () => {
    const result = planSemanticUv([
      { id: "body", world_size: [4, 6], cohort: "cloth" },
      { id: "arm_left", world_size: [2, 6], cohort: "cloth" },
      { id: "arm_right", world_size: [2, 6], cohort: "cloth", share_with: "arm_left" },
      { id: "logo", world_size: [2, 2], cohort: "detail", texel_density: 2 },
    ], {
      atlas_width: 32,
      atlas_height: 32,
      default_texel_density: 1,
      cohort_texel_density: { cloth: 2 },
      padding: 1,
    });
    expect(result.complete).toBe(true);
    const left = result.placements.find((p) => p.id === "arm_left")!;
    const right = result.placements.find((p) => p.id === "arm_right")!;
    expect([left.width, left.height].sort()).toEqual([4, 12].sort());
    expect([right.x, right.y, right.width, right.height]).toEqual([left.x, left.y, left.width, left.height]);
    expect(right.shared_with).toBe("arm_left");
  });

  test("retains unaffected islands during affected-only replanning", () => {
    const full = planSemanticUv([
      { id: "a", world_size: [4, 4], cohort: "base" },
      { id: "b", world_size: [4, 4], cohort: "base" },
    ], { atlas_width: 16, atlas_height: 16, default_texel_density: 1 });

    const next = planSemanticUv([
      { id: "a", world_size: [6, 4], cohort: "base" },
      { id: "b", world_size: [4, 4], cohort: "base" },
    ], {
      atlas_width: 16,
      atlas_height: 16,
      default_texel_density: 1,
      previous_placements: full.owner_placements,
      affected_ids: ["a"],
    });
    const beforeB = full.placements.find((p) => p.id === "b")!;
    const afterB = next.placements.find((p) => p.id === "b")!;
    expect([afterB.x, afterB.y, afterB.width, afterB.height]).toEqual([beforeB.x, beforeB.y, beforeB.width, beforeB.height]);

    const diff = diffSemanticUv(full.placements, next.placements);
    expect(diff.unchanged).toContain("b");
    expect(diff.upserts.map((p) => p.id)).toContain("a");
  });

  test("keeps explicit locked regions fixed", () => {
    const result = planSemanticUv([
      { id: "logo", world_size: [2,2], cohort: "detail", locked: { x: 0, y: 0, width: 4, height: 4 } },
      { id: "body", world_size: [8,8], cohort: "base" },
    ], { atlas_width: 16, atlas_height: 16, default_texel_density: 1 });
    const logo = result.placements.find((p) => p.id === "logo")!;
    expect([logo.x, logo.y, logo.width, logo.height, logo.locked]).toEqual([0,0,4,4,true]);
  });
});
