import { z } from "zod";

const animationIdentitySchema = z.object({
  uuid: z.string().min(1),
  name: z.string(),
});

const pointIndexSchema = z.number().int().nonnegative();

const retainedEffectSchema = z.object({
  effect: z.string(),
  script: z.string(),
});

const timelineRemovalSchema = z.object({
  channel: z.literal("timeline"),
  removed: z.object({
    keyframe_uuid: z.string().min(1),
    data_point_index: z.null(),
  }),
});

const pointRemovalSchema = z.object({
  channel: z.enum(["particle", "sound"]),
  removed: z.object({
    keyframe_uuid: z.string().min(1),
    data_point_index: pointIndexSchema,
    remaining: z.array(retainedEffectSchema),
  }),
});

const timelineStateSchema = z.object({
  channel: z.literal("timeline"),
  keyframe_uuid: z.string().min(1),
  time: z.number().finite(),
  data_point_index: z.null(),
  script: z.string(),
});

const soundStateSchema = z.object({
  channel: z.literal("sound"),
  keyframe_uuid: z.string().min(1),
  time: z.number().finite(),
  data_point_index: pointIndexSchema,
  effect: z.string(),
  locator: z.string().nullable(),
});

const particleStateSchema = z.object({
  channel: z.literal("particle"),
  keyframe_uuid: z.string().min(1),
  time: z.number().finite(),
  data_point_index: pointIndexSchema,
  effect: z.string(),
  locator: z.string().nullable(),
  bind_to_actor: z.boolean().nullable(),
  pre_effect_script: z.string().nullable(),
});

export const animationEffectMutationResultSchema = z.union([
  timelineRemovalSchema,
  pointRemovalSchema,
  timelineStateSchema,
  soundStateSchema,
  particleStateSchema,
]);

export const animationEffectsReceiptSchema = z
  .object({
    animation: animationIdentitySchema,
    operation_count: z.number().int().positive(),
    results: z.array(animationEffectMutationResultSchema),
  })
  .superRefine((value, ctx) => {
    if (value.results.length !== value.operation_count) {
      ctx.addIssue({
        code: "custom",
        path: ["results"],
        message: "Animation effect receipt result count must equal operation_count.",
      });
    }
  });

export type AnimationEffectsReceipt = z.infer<
  typeof animationEffectsReceiptSchema
>;

export function animationEffectsReceipt(
  receipt: AnimationEffectsReceipt
): AnimationEffectsReceipt {
  return animationEffectsReceiptSchema.parse(receipt);
}

export function isAnimationEffectsReceipt(value: unknown): boolean {
  return animationEffectsReceiptSchema.safeParse(value).success;
}
