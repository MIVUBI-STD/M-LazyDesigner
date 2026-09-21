import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";
import { planIncrementalRecipeRebuild } from "@/lib/authoringRecipe/incremental";
import { expandAffectedUvIds } from "@/lib/uv/authoringRecipeUv";

export type AuthoringImpactPlan = {
  geometry: {
    upsert_instance_ids: string[];
    remove_instance_ids: string[];
    metadata_only_instance_ids: string[];
    preserved_instance_ids: string[];
  };
  uv: {
    stale: boolean;
    affected_island_ids: string[];
    scope: "AFFECTED_ONLY" | "FULL_SEMANTIC_REPLAN" | "UNCHANGED";
  };
  rig: {
    stale: boolean;
    affected_instance_ids: string[];
    scope: "AFFECTED_ONLY" | "FULL_SEMANTIC_REPLAN" | "UNCHANGED";
  };
  animation: {
    stale: boolean;
    affected_instance_ids: string[];
    scope: "AFFECTED_ONLY" | "FULL_SEMANTIC_REVIEW" | "UNCHANGED";
  };
  texture: {
    stale: boolean;
    reason: "UV_CHANGED" | "SEMANTIC_MATERIAL_CHANGED" | "SYMMETRY_POLICY_CHANGED" | "UNCHANGED";
    scope: "AFFECTED_SURFACES" | "SEMANTIC_REVIEW" | "UNCHANGED";
  };
  symmetry_changed_relation_ids: string[];
};

export function planAuthoringImpact(
  previousRecipe: AuthoringRecipe,
  nextRecipe: AuthoringRecipe
): AuthoringImpactPlan {
  const diff = planIncrementalRecipeRebuild(previousRecipe, nextRecipe);
  const next = compileAuthoringRecipe(nextRecipe);
  const nativeAffected = [
    ...diff.upserts.map((placement) => placement.id),
    ...diff.remove_instance_ids,
  ].sort();
  const semanticAffected = [
    ...new Set([
      ...nativeAffected,
      ...diff.metadata_only_instance_ids,
    ]),
  ].sort();

  const uvAffected = nativeAffected.length > 0
    ? expandAffectedUvIds(next, nativeAffected.filter((id) =>
        next.placements.some((placement) => placement.id === id)
      ))
    : [];

  const semanticGroupChanged = diff.metadata_fields_changed.some((entry) =>
    entry.fields.includes("semantic_group")
  );

  const uvScope =
    diff.semantic_invalidation.uv_mapping && uvAffected.length === 0
      ? "FULL_SEMANTIC_REPLAN" as const
      : uvAffected.length > 0
        ? "AFFECTED_ONLY" as const
        : "UNCHANGED" as const;

  const rigScope =
    diff.semantic_invalidation.animation_motion && semanticAffected.length === 0
      ? "FULL_SEMANTIC_REPLAN" as const
      : semanticAffected.length > 0
        ? "AFFECTED_ONLY" as const
        : "UNCHANGED" as const;

  const animationScope =
    diff.semantic_invalidation.animation_motion && semanticAffected.length === 0
      ? "FULL_SEMANTIC_REVIEW" as const
      : semanticAffected.length > 0
        ? "AFFECTED_ONLY" as const
        : "UNCHANGED" as const;

  const textureReason =
    semanticGroupChanged
      ? "SEMANTIC_MATERIAL_CHANGED" as const
      : diff.semantic_invalidation.texture_appearance && diff.symmetry_changed_relation_ids.length > 0
        ? "SYMMETRY_POLICY_CHANGED" as const
        : uvScope !== "UNCHANGED"
          ? "UV_CHANGED" as const
          : "UNCHANGED" as const;

  return {
    geometry: {
      upsert_instance_ids: diff.upserts.map((placement) => placement.id),
      remove_instance_ids: diff.remove_instance_ids,
      metadata_only_instance_ids: diff.metadata_only_instance_ids,
      preserved_instance_ids: diff.preserved_instance_ids,
    },
    uv: {
      stale: uvScope !== "UNCHANGED",
      affected_island_ids: uvAffected,
      scope: uvScope,
    },
    rig: {
      stale: rigScope !== "UNCHANGED",
      affected_instance_ids: semanticAffected,
      scope: rigScope,
    },
    animation: {
      stale: animationScope !== "UNCHANGED",
      affected_instance_ids: semanticAffected,
      scope: animationScope,
    },
    texture: {
      stale: textureReason !== "UNCHANGED",
      reason: textureReason,
      scope: textureReason === "UNCHANGED"
        ? "UNCHANGED"
        : textureReason === "UV_CHANGED"
          ? "AFFECTED_SURFACES"
          : "SEMANTIC_REVIEW",
    },
    symmetry_changed_relation_ids: diff.symmetry_changed_relation_ids,
  };
}
