import { z } from "zod";
import { isAbsoluteFilesystemPath } from "@/lib/core/path";

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
    // Caller declarations are not independently authenticated user approval.
    assertion_provenance: "CALLER_DECLARATION_UNVERIFIED" as const,
    user_approval_claim: mode === "USER_APPROVED",
    evidence_present:
      mode === "AUTONOMOUS_VERIFIED" && "evidence" in readiness
        ? readiness.evidence.trim().length > 0
        : false,
  } as const;
}

/**
 * Check the active saved project and its checkpoint before Animation. There is
 * no extra state manager, model reload, or per-mutation filesystem request.
 * The user's approval remains a caller declaration, not filesystem evidence.
 */
export function assertAnimationCheckpointCurrent(
  readiness: AnimationHandoffReadiness,
  project: { save_path?: string | null; saved?: boolean } | null,
  formatId: string | null | undefined,
  stat: (path: string) => { isFile(): boolean; size: number }
): void {
  if (formatId !== "bedrock" || !project) {
    throw new Error("ANIMATION_CHECKPOINT_INVALID: open the intended Bedrock Entity project.");
  }
  if (project.saved !== true) {
    throw new Error("ANIMATION_CHECKPOINT_UNSAVED: save the current .bbmodel before Animation.");
  }
  // Drive and UNC filenames are case-insensitive; POSIX filenames are not.
  const normalize = (path: string) => {
    const forward = path.replace(/\\/g, "/");
    return /^[a-z]:\//i.test(forward) || forward.startsWith("//")
      ? forward.toLowerCase()
      : forward;
  };
  const requested = readiness.checkpoint;
  const active = project.save_path;
  if (
    !isAbsoluteFilesystemPath(requested) ||
    !/\.bbmodel$/i.test(requested) ||
    typeof active !== "string" ||
    !isAbsoluteFilesystemPath(active) ||
    normalize(active) !== normalize(requested)
  ) {
    throw new Error(
      "ANIMATION_CHECKPOINT_MISMATCH: checkpoint must match the active project's saved .bbmodel."
    );
  }

  let info: { isFile(): boolean; size: number };
  try {
    info = stat(requested);
  } catch {
    throw new Error("ANIMATION_CHECKPOINT_UNAVAILABLE: saved .bbmodel cannot be inspected.");
  }
  if (!info.isFile() || !Number.isFinite(info.size) || info.size <= 0) {
    throw new Error("ANIMATION_CHECKPOINT_INVALID: saved .bbmodel must be a nonempty regular file.");
  }
}

export const ANIMATION_HANDOFF_READINESS_RULE =
  "Animation requires a saved checkpoint, UV Layout PASS, no blockers, and either explicit user Geometry+Texture approval or explicitly authorized autonomous verification with current-revision evidence. Internal diagnostic PASS never equals user approval.";
