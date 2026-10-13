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

const ROTATION_EPSILON_DEGREES = 1e-9;

/**
 * Authoring Recipes describe an unparented Cube's own from/to/origin/rotation,
 * not a native Blockbench parent Group matrix. Single-axis Cube rotation has
 * the same geometric meaning regardless of the format's Euler order; a mixed-
 * axis rotation needs a format-bound Euler contract and remains unsupported.
 */
function finitePlacementVec3(
  value: readonly number[],
  label: string
): asserts value is RecipeVec3 {
  if (!Array.isArray(value) || value.length !== 3 ||
      value.some((entry) => !Number.isFinite(entry))) {
    throw new Error("Semantic rig " + label + " requires three finite coordinates.");
  }
}

function anchorValue(min: number, max: number, anchor: RigAnchor): number {
  if (anchor === "MIN") return min;
  if (anchor === "MAX") return max;
  if (anchor === "CENTER") return min + (max - min) / 2;
  throw new Error("Semantic rig anchor must be MIN, CENTER or MAX.");
}

export function placementAnchor(
  placement: CompiledCubePlacement,
  anchor: readonly [RigAnchor, RigAnchor, RigAnchor]
): RecipeVec3 {
  finitePlacementVec3(placement.from, "from");
  finitePlacementVec3(placement.to, "to");
  finitePlacementVec3(placement.origin, "origin");
  finitePlacementVec3(placement.rotation, "rotation");
  if (anchor.length !== 3) {
    throw new Error("Semantic rig anchor requires exactly three axes.");
  }
  const source: RecipeVec3 = [
    anchorValue(placement.from[0], placement.to[0], anchor[0]),
    anchorValue(placement.from[1], placement.to[1], anchor[1]),
    anchorValue(placement.from[2], placement.to[2], anchor[2]),
  ];
  const rotatedAxes = placement.rotation
    .map((degrees, axis) => ({ degrees, axis }))
    .filter(({ degrees }) => Math.abs(degrees) > ROTATION_EPSILON_DEGREES);
  if (rotatedAxes.length === 0) return source;
  if (rotatedAxes.length !== 1) {
    throw new Error(
      "Semantic rig transformed-anchor semantics require a single-axis " +
      "Cube rotation; multi-axis Euler order needs explicit native format proof."
    );
  }
  const { degrees, axis } = rotatedAxes[0]!;
  const radians = degrees * Math.PI / 180;
  if (!Number.isFinite(radians) || Math.abs(degrees) > 360) {
    throw new Error("Semantic rig rotation angle is outside finite transform range.");
  }
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const [ox, oy, oz] = placement.origin;
  const dx = source[0] - ox, dy = source[1] - oy, dz = source[2] - oz;
  const transformed: RecipeVec3 = axis === 0
    ? [source[0], oy + cosine * dy - sine * dz, oz + sine * dy + cosine * dz]
    : axis === 1
      ? [ox + cosine * dx + sine * dz, source[1], oz - sine * dx + cosine * dz]
      : [ox + cosine * dx - sine * dy, oy + sine * dx + cosine * dy, source[2]];
  if (transformed.some((entry) => !Number.isFinite(entry))) {
    throw new Error("Semantic rig transformed anchor is not finite.");
  }
  return transformed;
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
