import type {
  CompiledAuthoringRecipe,
  CompiledCubePlacement,
} from "@/lib/authoringRecipe/contracts";
import {
  compileSemanticGeometryEdit,
  type SemanticGeometryEditPlan,
} from "@/lib/authoringRecipe/semanticEdit";
import {
  validateCompactAuthoringIntent,
  type CompactAuthoringIntent,
  type AuthoringPreserveRequest,
} from "@/lib/authoringIntent/contracts";

export type DesiredGeometryState = {
  upserts: CompiledCubePlacement[];
  affected_instance_ids: string[];
  preserved_instance_ids: string[];
  preserve_requests: AuthoringPreserveRequest[];
  preservation_boundary: "DEFER_TO_DOMAIN_OWNERS";
  application_boundary: SemanticGeometryEditPlan["application_boundary"];
};

function applyUpserts(
  compiled: CompiledAuthoringRecipe,
  upserts: readonly CompiledCubePlacement[]
): CompiledAuthoringRecipe {
  const replacements = new Map(upserts.map((placement) => [placement.id, placement]));
  return {
    ...compiled,
    placements: compiled.placements.map(
      (placement) => replacements.get(placement.id) ?? placement
    ),
  };
}

export function compileDesiredGeometryState(
  compiled: CompiledAuthoringRecipe,
  intent: CompactAuthoringIntent
): DesiredGeometryState {
  validateCompactAuthoringIntent(intent);

  let working = compiled;
  const affected = new Set<string>();

  for (const operation of intent.geometry_operations) {
    const plan = compileSemanticGeometryEdit(working, {
      target: intent.target,
      operation,
    });
    plan.affected_instance_ids.forEach((id) => affected.add(id));
    working = applyUpserts(working, plan.upserts);
  }

  const affectedIds = [...affected].sort();
  const affectedSet = new Set(affectedIds);

  return {
    upserts: working.placements
      .filter((placement) => affectedSet.has(placement.id))
      .sort((a, b) => a.id.localeCompare(b.id)),
    affected_instance_ids: affectedIds,
    preserved_instance_ids: compiled.placements
      .filter((placement) => !affectedSet.has(placement.id))
      .map((placement) => placement.id)
      .sort(),
    preserve_requests: [...new Set(intent.preserve ?? [])].sort(),
    preservation_boundary: "DEFER_TO_DOMAIN_OWNERS",
    application_boundary: "RECIPE_REWRITE_REQUIRED",
  };
}
