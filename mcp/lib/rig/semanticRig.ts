import type { CompiledAuthoringRecipe, CompiledCubePlacement, RecipeVec3 } from "@/lib/authoringRecipe/contracts";
import { solveFabrikChain } from "@/lib/rig/fabrik";

export type RigAnchor = "MIN" | "CENTER" | "MAX";
export type RigAxis = "X" | "Y" | "Z";

export type SemanticRigIntent =
  | {
      kind: "JOINT";
      id: string;
      name: string;
      instance_id: string;
      anchor: [RigAnchor, RigAnchor, RigAnchor];
      parent?: string;
    }
  | {
      kind: "CHAIN";
      id: string;
      name_prefix: string;
      instance_ids: readonly string[];
      parent?: string;
      target?: readonly [number, number, number];
      tolerance?: number;
      max_iterations?: number;
    };

export type RigBonePlan = {
  id: string;
  name: string;
  origin: RecipeVec3;
  rotation: RecipeVec3;
  parent: string;
  source_instance_ids: string[];
};

export type SemanticRigPlan = {
  bones: RigBonePlan[];
  diagnostics: {
    fabrik_solves: number;
    source_instances: string[];
  };
};

function placementById(compiled: CompiledAuthoringRecipe): Map<string, CompiledCubePlacement> {
  return new Map(compiled.placements.map((placement) => [placement.id, placement]));
}

function hasRotation(placement: CompiledCubePlacement): boolean {
  return placement.rotation.some((value) => Math.abs(value) > 1e-9);
}

function requireUnrotatedAnchorSource(placement: CompiledCubePlacement): void {
  if (hasRotation(placement)) {
    throw new Error(
      "Semantic rig geometry-derived pivots currently require unrotated source geometry. Instance " +
        placement.id +
        " is rotated; transformed-anchor semantics must be explicit before deriving a joint."
    );
  }
}

function anchorValue(min: number, max: number, anchor: RigAnchor): number {
  if (anchor === "MIN") return min;
  if (anchor === "MAX") return max;
  return (min + max) / 2;
}

export function placementAnchor(
  placement: CompiledCubePlacement,
  anchor: readonly [RigAnchor, RigAnchor, RigAnchor]
): RecipeVec3 {
  requireUnrotatedAnchorSource(placement);
  return [
    anchorValue(placement.from[0], placement.to[0], anchor[0]),
    anchorValue(placement.from[1], placement.to[1], anchor[1]),
    anchorValue(placement.from[2], placement.to[2], anchor[2]),
  ];
}

function placementCenter(placement: CompiledCubePlacement): RecipeVec3 {
  return placementAnchor(placement, ["CENTER", "CENTER", "CENTER"]);
}

function requireUniquePlanIds(bones: readonly RigBonePlan[]): void {
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const bone of bones) {
    if (!bone.id || ids.has(bone.id)) throw new Error("Semantic rig bone IDs must be non-empty and unique.");
    if (!bone.name || names.has(bone.name.toLowerCase())) throw new Error("Semantic rig bone names must be non-empty and case-insensitively unique.");
    ids.add(bone.id);
    names.add(bone.name.toLowerCase());
  }
}

export function compileSemanticRig(
  compiled: CompiledAuthoringRecipe,
  intents: readonly SemanticRigIntent[]
): SemanticRigPlan {
  const byId = placementById(compiled);
  const bones: RigBonePlan[] = [];
  const sourceInstances = new Set<string>();
  let fabrikSolves = 0;

  for (const intent of intents) {
    if (!intent.id) throw new Error("Semantic rig intent requires a non-empty id.");
    if (intent.kind === "JOINT") {
      const placement = byId.get(intent.instance_id);
      if (!placement) throw new Error("Semantic rig JOINT references missing instance " + intent.instance_id + ".");
      sourceInstances.add(intent.instance_id);
      bones.push({
        id: intent.id,
        name: intent.name,
        origin: placementAnchor(placement, intent.anchor),
        rotation: [0, 0, 0],
        parent: intent.parent ?? "root",
        source_instance_ids: [intent.instance_id],
      });
      continue;
    }

    if (intent.instance_ids.length < 2) throw new Error("Semantic rig CHAIN requires at least two source instances.");
    const placements = intent.instance_ids.map((id) => {
      const placement = byId.get(id);
      if (!placement) throw new Error("Semantic rig CHAIN references missing instance " + id + ".");
      sourceInstances.add(id);
      return placement;
    });
    let points = placements.map(placementCenter);
    if (intent.target) {
      const solved = solveFabrikChain(points, intent.target, {
        tolerance: intent.tolerance,
        max_iterations: intent.max_iterations,
      });
      points = solved.points.map((point) => [point[0], point[1], point[2]] as RecipeVec3);
      fabrikSolves += 1;
    }

    for (let index = 0; index < placements.length; index += 1) {
      const name = intent.name_prefix + "_" + (index + 1);
      bones.push({
        id: intent.id + ":" + index,
        name,
        origin: points[index],
        rotation: [0, 0, 0],
        parent: index === 0 ? (intent.parent ?? "root") : intent.name_prefix + "_" + index,
        source_instance_ids: [placements[index].id],
      });
    }
  }

  requireUniquePlanIds(bones);
  return {
    bones,
    diagnostics: {
      fabrik_solves: fabrikSolves,
      source_instances: [...sourceInstances].sort(),
    },
  };
}
