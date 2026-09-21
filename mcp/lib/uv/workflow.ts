import type { CompiledAuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import type { AtlasPlacement } from "@/lib/uv/maxRectsPlanner";
import {
  deriveAuthoringRecipeUvIslands,
  expandAffectedUvIds,
  type AuthoringRecipeUvOptions,
} from "@/lib/uv/authoringRecipeUv";
import { compileNativeUvApplyPlan, type NativeUvTarget } from "@/lib/uv/nativeApplyPlan";
import { nativeUvSnapshotFingerprint, type NativeUvCubeSnapshot } from "@/lib/uv/nativeState";
import { planSemanticUv, type SemanticUvPlanOptions } from "@/lib/uv/semanticPlanner";
import { diffSemanticUv } from "@/lib/uv/semanticDiff";
import type { NativeUvTransactionPlan } from "@/lib/uv/nativeTransaction";

export type CompileSemanticUvWorkflowOptions = AuthoringRecipeUvOptions &
  Omit<SemanticUvPlanOptions, "affected_ids" | "previous_placements"> & {
    previous_placements?: readonly AtlasPlacement[];
    previous_semantic_placements?: ReturnType<typeof planSemanticUv>["placements"];
    affected_instance_ids?: readonly string[];
  };

export function compileAuthoringRecipeSemanticUvWorkflow(
  compiled: CompiledAuthoringRecipe,
  nativeSnapshots: readonly NativeUvCubeSnapshot[],
  nativeTargets: readonly NativeUvTarget[],
  options: CompileSemanticUvWorkflowOptions
) {
  const islands = deriveAuthoringRecipeUvIslands(compiled, options);
  const affectedIds = options.affected_instance_ids
    ? expandAffectedUvIds(compiled, options.affected_instance_ids)
    : undefined;

  const semantic = planSemanticUv(islands, {
    atlas_width: options.atlas_width,
    atlas_height: options.atlas_height,
    default_texel_density: options.default_texel_density,
    padding: options.padding,
    allow_rotation: options.allow_rotation,
    cohort_texel_density: options.cohort_texel_density,
    previous_placements: options.previous_placements,
    affected_ids: affectedIds,
  });

  const nativePlan = compileNativeUvApplyPlan(semantic.placements, nativeTargets);
  const transaction: NativeUvTransactionPlan = {
    expected_fingerprint: nativeUvSnapshotFingerprint(nativeSnapshots),
    operations: nativePlan.operations,
  };

  return {
    islands,
    semantic,
    diff: options.previous_semantic_placements
      ? diffSemanticUv(options.previous_semantic_placements, semantic.placements)
      : null,
    native_plan: nativePlan,
    transaction,
  };
}
