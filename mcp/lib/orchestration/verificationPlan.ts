import type { AuthoringImpactPlan } from "@/lib/orchestration/authoringImpact";

export type VerificationTask =
  | { domain: "GEOMETRY"; kind: "CUBE_SCOPE"; instance_ids: string[] }
  | { domain: "UV"; kind: "UV_ISLAND_SCOPE"; island_ids: string[]; full_replan: boolean }
  | { domain: "RIG"; kind: "RIG_SCOPE"; instance_ids: string[]; full_replan: boolean }
  | { domain: "ANIMATION"; kind: "MOTION_SCOPE"; instance_ids: string[]; full_review: boolean }
  | { domain: "TEXTURE"; kind: "TEXTURE_SCOPE"; mode: "AFFECTED_SURFACES" | "SEMANTIC_REVIEW" };

export function compileMinimalVerificationPlan(
  impact: AuthoringImpactPlan
): VerificationTask[] {
  const tasks: VerificationTask[] = [];
  const geometryIds = [
    ...impact.geometry.upsert_instance_ids,
    ...impact.geometry.remove_instance_ids,
  ].sort();
  if (geometryIds.length > 0) {
    tasks.push({ domain: "GEOMETRY", kind: "CUBE_SCOPE", instance_ids: geometryIds });
  }
  if (impact.uv.scope !== "UNCHANGED") {
    tasks.push({
      domain: "UV",
      kind: "UV_ISLAND_SCOPE",
      island_ids: impact.uv.affected_island_ids,
      full_replan: impact.uv.scope === "FULL_SEMANTIC_REPLAN",
    });
  }
  if (impact.rig.scope !== "UNCHANGED") {
    tasks.push({
      domain: "RIG",
      kind: "RIG_SCOPE",
      instance_ids: impact.rig.affected_instance_ids,
      full_replan: impact.rig.scope === "FULL_SEMANTIC_REPLAN",
    });
  }
  if (impact.animation.scope !== "UNCHANGED") {
    tasks.push({
      domain: "ANIMATION",
      kind: "MOTION_SCOPE",
      instance_ids: impact.animation.affected_instance_ids,
      full_review: impact.animation.scope === "FULL_SEMANTIC_REVIEW",
    });
  }
  if (impact.texture.scope !== "UNCHANGED") {
    tasks.push({
      domain: "TEXTURE",
      kind: "TEXTURE_SCOPE",
      mode: impact.texture.scope,
    });
  }
  return tasks;
}
