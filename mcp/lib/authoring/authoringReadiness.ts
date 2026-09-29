import { z } from "zod";

export const userApprovedAnimationReadinessSchema = z
  .object({
    geometry_approved: z.literal(true),
    uv_layout: z.literal("PASS"),
    texture_approved: z.literal(true),
    checkpoint: z.string().min(1).describe(
      "Saved .bbmodel checkpoint path; records explicit user approval, never inferred by the caller."
    ),
    no_blockers: z.literal(true),
  })
  .strict();

export const autonomousVerifiedAnimationReadinessSchema = z
  .object({
    autonomous_authorized: z.literal(true).describe(
      "User explicitly authorized autonomous execution; never infer this from tool availability."
    ),
    geometry_verified: z.literal(true),
    uv_layout: z.literal("PASS"),
    texture_verified: z.literal(true),
    checkpoint: z.string().min(1),
    evidence: z.string().min(1).describe(
      "Current-revision geometry/texture evidence and readiness summary; not a user-approval claim."
    ),
    no_blockers: z.literal(true),
  })
  .strict();

export const animationHandoffReadinessSchema = z.union([
  userApprovedAnimationReadinessSchema,
  autonomousVerifiedAnimationReadinessSchema,
]);

export type AnimationHandoffReadiness = z.infer<
  typeof animationHandoffReadinessSchema
>;

export type AnimationReadinessMode =
  | "USER_APPROVED"
  | "AUTONOMOUS_VERIFIED";

export function classifyAnimationHandoffReadiness(
  readiness: AnimationHandoffReadiness
): AnimationReadinessMode {
  return "autonomous_authorized" in readiness
    ? "AUTONOMOUS_VERIFIED"
    : "USER_APPROVED";
}

export function summarizeAnimationHandoffReadiness(
  readiness: AnimationHandoffReadiness
) {
  const mode = classifyAnimationHandoffReadiness(readiness);
  return {
    mode,
    uv_layout: readiness.uv_layout,
    checkpoint: readiness.checkpoint,
    no_blockers: readiness.no_blockers,
    user_approval_claim: mode === "USER_APPROVED",
    evidence_present:
      mode === "AUTONOMOUS_VERIFIED" && "evidence" in readiness
        ? readiness.evidence.trim().length > 0
        : false,
  } as const;
}

export const ANIMATION_HANDOFF_READINESS_RULE =
  "Animation requires a saved checkpoint, UV Layout PASS, no blockers, and either explicit user Geometry+Texture approval or explicitly authorized autonomous verification with current-revision evidence. Internal diagnostic PASS never equals user approval.";
