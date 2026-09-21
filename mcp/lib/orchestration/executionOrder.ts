import type { AuthoringImpactPlan } from "@/lib/orchestration/authoringImpact";

export type AuthoringExecutionStage =
  | "GEOMETRY"
  | "UV"
  | "RIG"
  | "TEXTURE"
  | "ANIMATION"
  | "VERIFY";

export function compileAuthoringExecutionOrder(
  impact: AuthoringImpactPlan
): AuthoringExecutionStage[] {
  const order: AuthoringExecutionStage[] = [];
  const geometryChanged =
    impact.geometry.upsert_instance_ids.length > 0 ||
    impact.geometry.remove_instance_ids.length > 0;
  if (geometryChanged) order.push("GEOMETRY");
  if (impact.uv.stale) order.push("UV");
  if (impact.rig.stale) order.push("RIG");
  if (impact.texture.stale) order.push("TEXTURE");
  if (impact.animation.stale) order.push("ANIMATION");
  if (order.length > 0) order.push("VERIFY");
  return order;
}
