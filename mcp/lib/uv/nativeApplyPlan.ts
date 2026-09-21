import type { SemanticUvPlacement } from "@/lib/uv/semanticPlanner";
import type { CubeFaceKey } from "@/lib/uv/authoringRecipeUv";

export type NativeUvTarget = {
  island_id: string;
  cube_uuid: string;
  face: CubeFaceKey;
  current_uv: readonly [number, number, number, number];
  current_rotation: number;
  expected_recipe_id?: string;
  expected_instance_id?: string;
};

export type NativeUvApplyOperation = {
  island_id: string;
  cube_uuid: string;
  face: CubeFaceKey;
  uv: [number, number, number, number];
  rotation: 0 | 90;
  shared_with?: string;
  expected_recipe_id?: string;
  expected_instance_id?: string;
};

function parseRotation(rotated: boolean): 0 | 90 {
  return rotated ? 90 : 0;
}

export function compileNativeUvApplyPlan(
  placements: readonly SemanticUvPlacement[],
  targets: readonly NativeUvTarget[]
) {
  const targetByIsland = new Map<string, NativeUvTarget>();
  for (const target of targets) {
    if (!target.island_id || targetByIsland.has(target.island_id)) {
      throw new Error("Native UV targets require unique non-empty island IDs.");
    }
    if (![0, 90, 180, 270].includes(target.current_rotation)) {
      throw new Error("Native UV target has unsupported current face rotation: " + target.island_id + ".");
    }
    if (
      (target.expected_recipe_id === undefined) !==
      (target.expected_instance_id === undefined)
    ) {
      throw new Error("Native UV target ownership must provide recipe and instance identity together.");
    }
    targetByIsland.set(target.island_id, target);
  }

  const operations: NativeUvApplyOperation[] = [];
  const unresolved: string[] = [];
  for (const placement of placements) {
    const target = targetByIsland.get(placement.id);
    if (!target) {
      unresolved.push(placement.id);
      continue;
    }
    operations.push({
      island_id: placement.id,
      cube_uuid: target.cube_uuid,
      face: target.face,
      uv: [placement.x, placement.y, placement.x + placement.width, placement.y + placement.height],
      rotation: parseRotation(placement.rotated),
      shared_with: placement.shared_with,
      expected_recipe_id: target.expected_recipe_id,
      expected_instance_id: target.expected_instance_id,
    });
  }

  return {
    operations: operations.sort((a, b) => a.island_id.localeCompare(b.island_id)),
    unresolved: unresolved.sort(),
    complete: unresolved.length === 0,
  };
}
