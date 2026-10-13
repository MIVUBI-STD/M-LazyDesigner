import { z } from "zod";

/**
 * Source-shaped result from create_animation's Bedrock AnimationCodec.
 * Authored name/UUID and requested counts establish a reported new native
 * clip, but never prove motion fidelity, playback, or persisted export.
 */
export const animationCreationReceiptSchema = z.object({
  animation: z.object({
    uuid: z.string().min(1),
    name: z.string().min(1),
  }),
  requested_name: z.string().min(1),
  requested_bone_count: z.number().int().nonnegative(),
  requested_particle_effect_count: z.number().int().nonnegative(),
  requested_sound_effect_count: z.number().int().nonnegative(),
});

export function isAnimationCreationReceipt(value: unknown): boolean {
  return animationCreationReceiptSchema.safeParse(value).success;
}
