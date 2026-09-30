import { z } from "zod";
import { animationIdOptionalSchema } from "@/lib/schemas/ids";

export const inspectAnimationParameters = z.object({
  animation_id: animationIdOptionalSchema.describe(
    "Exact Animation/AnimationController UUID or unique name; omit to use the selected AnimationItem."
  ),
  bone: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional Group UUID or unique exact name. Use only for authored Animation bone/keyframe detail."
    ),
  state: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional controller state UUID or unique exact name for focused state-machine detail."
    ),
  include_effect_keyframes: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Include full particle/sound/timeline effect keyframes; keep false for summary."
    ),
});