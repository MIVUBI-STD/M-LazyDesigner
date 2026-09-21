import type { CompiledAuthoringRecipe, RecipeVec3 } from "@/lib/authoringRecipe/contracts";
import { placementAnchor, type RigAnchor, type RigAxis, type RigBonePlan } from "@/lib/rig/semanticRig";

export type MechanicalRigIntent =
  | {
      kind: "HINGE";
      id: string;
      name: string;
      instance_id: string;
      hinge_axis: RigAxis;
      hinge_side: "MIN" | "MAX";
      parent?: string;
    }
  | {
      kind: "ROTATOR";
      id: string;
      name: string;
      instance_id: string;
      axis: RigAxis;
      parent?: string;
    }
  | {
      kind: "SLIDER";
      id: string;
      name: string;
      instance_id: string;
      axis: RigAxis;
      parent?: string;
    };

const AXIS_INDEX = { X: 0, Y: 1, Z: 2 } as const;

function findPlacement(compiled: CompiledAuthoringRecipe, id: string) {
  const placement = compiled.placements.find((entry) => entry.id === id);
  if (!placement) throw new Error("Mechanical rig intent references missing instance " + id + ".");
  return placement;
}

function hingeAnchor(axis: RigAxis, side: "MIN" | "MAX"): [RigAnchor,RigAnchor,RigAnchor] {
  const anchor: [RigAnchor,RigAnchor,RigAnchor] = ["CENTER","CENTER","CENTER"];
  anchor[AXIS_INDEX[axis]] = side;
  return anchor;
}

export function compileMechanicalRigIntent(
  compiled: CompiledAuthoringRecipe,
  intent: MechanicalRigIntent
): RigBonePlan {
  const placement = findPlacement(compiled, intent.instance_id);
  let origin: RecipeVec3;
  if (intent.kind === "HINGE") {
    origin = placementAnchor(placement, hingeAnchor(intent.hinge_axis, intent.hinge_side));
  } else {
    origin = placementAnchor(placement, ["CENTER","CENTER","CENTER"]);
  }
  return {
    id: intent.id,
    name: intent.name,
    origin,
    rotation: [0,0,0],
    parent: intent.parent ?? "root",
    source_instance_ids: [intent.instance_id],
  };
}
