import type { AuthoringImpactPlan } from "@/lib/orchestration/authoringImpact";

export type OrchestrationFreshnessScope =
  | "GEOMETRY_STRUCTURE"
  | "UV_MAPPING"
  | "TEXTURE_APPEARANCE"
  | "ANIMATION_MOTION";

export function projectFreshnessInvalidation(
  impact: AuthoringImpactPlan
): OrchestrationFreshnessScope[] {
  const scopes = new Set<OrchestrationFreshnessScope>();
  if (
    impact.geometry.upsert_instance_ids.length > 0 ||
    impact.geometry.remove_instance_ids.length > 0
  ) {
    scopes.add("GEOMETRY_STRUCTURE");
  }
  if (impact.uv.stale) scopes.add("UV_MAPPING");
  if (impact.texture.stale) scopes.add("TEXTURE_APPEARANCE");
  if (impact.rig.stale || impact.animation.stale) scopes.add("ANIMATION_MOTION");
  return [...scopes];
}
