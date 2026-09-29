export type BedrockAnimationItemKind = "animation" | "controller";
export type BlockbenchTransformInterpolation =
  | "linear"
  | "catmullrom"
  | "step"
  | "bezier";

export type BedrockInterpolationDisposition =
  | "native_lerp_mode"
  | "pre_post_discontinuity"
  | "editor_only_bake_required";

const BEDROCK_ANIMATION_IDENTIFIER = /^[A-Za-z][A-Za-z0-9_.]*$/;

export function requireBedrockAnimationIdentifier(
  value: string,
  context: string
): string {
  if (!BEDROCK_ANIMATION_IDENTIFIER.test(value)) {
    throw new Error(
      `${context} must begin with a letter and contain only letters, numbers, underscores, and periods.`
    );
  }
  return value;
}

export function normalizeBedrockAnimationItemIdentifier(
  requested: string,
  kind: BedrockAnimationItemKind
): string {
  const trimmed = requested.trim();
  if (!trimmed) {
    throw new Error(`${kind} identifier must not be blank.`);
  }

  const prefix = kind === "animation" ? "animation." : "controller.animation.";
  const normalized = trimmed.startsWith(prefix) ? trimmed : `${prefix}${trimmed}`;
  return requireBedrockAnimationIdentifier(
    normalized,
    kind === "animation" ? "Animation identifier" : "Animation controller identifier"
  );
}

export function classifyBedrockTransformInterpolation(
  interpolation: BlockbenchTransformInterpolation
): BedrockInterpolationDisposition {
  switch (interpolation) {
    case "linear":
    case "catmullrom":
      return "native_lerp_mode";
    case "step":
      return "pre_post_discontinuity";
    case "bezier":
      return "editor_only_bake_required";
  }
}

/**
 * Bedrock animation JSON accepts linear/catmullrom lerp modes. Blockbench step
 * interpolation is exportable because its codec compiles the discontinuity as
 * pre/post values. Bezier is a Blockbench editor curve and must be baked before
 * direct Bedrock animation-file delivery.
 */
export function requireDirectBedrockExportableInterpolation(
  interpolation: BlockbenchTransformInterpolation,
  context: string
): BedrockInterpolationDisposition {
  const disposition = classifyBedrockTransformInterpolation(interpolation);
  if (disposition === "editor_only_bake_required") {
    throw new Error(
      `${context} uses Bezier interpolation, which is not a direct Bedrock transform lerp_mode. Bake the curve to export-safe keyframes before animation JSON delivery.`
    );
  }
  return disposition;
}
