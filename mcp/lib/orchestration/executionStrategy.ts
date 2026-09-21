import type { AuthoringImpactPlan } from "@/lib/orchestration/authoringImpact";

export type AuthoringExecutionStrategy =
  | "DIRECT"
  | "BATCH"
  | "RECIPE"
  | "PROCEDURAL";

export type ExecutionStrategySignals = {
  total_scene_instances: number;
  has_recipe_source: boolean;
  repeated_structure_ratio?: number;
  structured_texture_operation?: boolean;
  exact_texture_coordinate_count?: number;
};

export type ExecutionStrategyDecision = {
  strategy: AuthoringExecutionStrategy;
  affected_native_instances: number;
  affected_ratio: number;
  reason:
    | "SMALL_DIRECT_EDIT"
    | "BOUNDED_BATCH"
    | "RECIPE_OWNED_INCREMENTAL"
    | "LARGE_REPEATED_STRUCTURE"
    | "STRUCTURED_TEXTURE_ESCALATION";
};

const DIRECT_LIMIT = 8;
const BATCH_LIMIT = 32;
const EXACT_TEXTURE_COORDINATE_LIMIT = 256;

function affectedNativeCount(impact: AuthoringImpactPlan): number {
  return (
    impact.geometry.upsert_instance_ids.length +
    impact.geometry.remove_instance_ids.length
  );
}

export function selectAuthoringExecutionStrategy(
  impact: AuthoringImpactPlan,
  signals: ExecutionStrategySignals
): ExecutionStrategyDecision {
  if (!Number.isInteger(signals.total_scene_instances) || signals.total_scene_instances < 0) {
    throw new Error("total_scene_instances must be a non-negative integer.");
  }

  const affected = affectedNativeCount(impact);
  const ratio =
    signals.total_scene_instances === 0 ? 0 : affected / signals.total_scene_instances;
  const repeatedRatio = signals.repeated_structure_ratio ?? 0;

  if (
    signals.structured_texture_operation === true &&
    (signals.exact_texture_coordinate_count ?? 0) > EXACT_TEXTURE_COORDINATE_LIMIT
  ) {
    return {
      strategy: "PROCEDURAL",
      affected_native_instances: affected,
      affected_ratio: ratio,
      reason: "STRUCTURED_TEXTURE_ESCALATION",
    };
  }

  if (signals.has_recipe_source && affected > 0 && affected <= BATCH_LIMIT) {
    return {
      strategy: "RECIPE",
      affected_native_instances: affected,
      affected_ratio: ratio,
      reason: "RECIPE_OWNED_INCREMENTAL",
    };
  }

  if (affected > BATCH_LIMIT && repeatedRatio >= 0.5) {
    return {
      strategy: "RECIPE",
      affected_native_instances: affected,
      affected_ratio: ratio,
      reason: "LARGE_REPEATED_STRUCTURE",
    };
  }

  if (affected <= DIRECT_LIMIT) {
    return {
      strategy: "DIRECT",
      affected_native_instances: affected,
      affected_ratio: ratio,
      reason: "SMALL_DIRECT_EDIT",
    };
  }

  return {
    strategy: "BATCH",
    affected_native_instances: affected,
    affected_ratio: ratio,
    reason: "BOUNDED_BATCH",
  };
}
