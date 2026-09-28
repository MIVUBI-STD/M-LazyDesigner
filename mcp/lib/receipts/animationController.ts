import { z } from "zod";

const identitySchema = z.object({
  uuid: z.string().min(1),
  name: z.string().min(1),
});

const animationLinkSchema = z.object({
  uuid: z.string().min(1),
  key: z.string(),
  animation_uuid: z.string().nullable(),
  blend_value: z.union([z.string(), z.number().finite()]),
});

const transitionSchema = z.object({
  uuid: z.string().min(1),
  target_uuid: z.string().min(1),
  condition: z.string(),
});

const soundSchema = z.object({
  uuid: z.string().min(1),
  effect: z.string(),
  file: z.string().optional(),
});

const particleSchema = z.object({
  uuid: z.string().min(1),
  effect: z.string(),
  locator: z.string().nullable(),
  bind_to_actor: z.boolean(),
  pre_effect_script: z.string().nullable(),
  file: z.string().optional(),
});

export const animationControllerStateReceiptSchema = z.object({
  uuid: z.string().min(1),
  name: z.string().min(1),
  on_entry: z.string().nullable(),
  on_exit: z.string().nullable(),
  blend_transition: z.number().finite(),
  blend_transition_curve: z.record(z.string(), z.number().finite()).nullable(),
  blend_via_shortest_path: z.boolean(),
  animations: z.array(animationLinkSchema),
  transitions: z.array(transitionSchema),
  sounds: z.array(soundSchema),
  particles: z.array(particleSchema),
});

const createdSchema = z.object({
  states: z.array(identitySchema),
  transitions: z.array(
    z.object({
      uuid: z.string().min(1),
      state_uuid: z.string().min(1),
      target_uuid: z.string().min(1),
    })
  ),
  animation_links: z.array(
    z.object({
      uuid: z.string().min(1),
      state_uuid: z.string().min(1),
      animation_key: z.string().min(1),
      animation_uuid: z.string().nullable(),
    })
  ),
  sounds: z.array(
    z.object({
      uuid: z.string().min(1),
      state_uuid: z.string().min(1),
      effect: z.string(),
    })
  ),
  particles: z.array(
    z.object({
      uuid: z.string().min(1),
      state_uuid: z.string().min(1),
      effect: z.string(),
    })
  ),
});

const removedSchema = z.object({
  states: z.array(identitySchema),
  transitions: z.array(z.string().min(1)),
  animation_links: z.array(z.string().min(1)),
  sounds: z.array(z.string().min(1)),
  particles: z.array(z.string().min(1)),
});

export const animationControllerReceiptSchema = z.object({
  execution: z.literal("applied"),
  action: z.enum(["created", "updated"]),
  operation_count: z.number().int().positive(),
  controller: z.object({
    uuid: z.string().min(1),
    name: z.string().min(1),
    initial_state: identitySchema.nullable(),
    state_count: z.number().int().nonnegative(),
  }),
  affected_states: z.array(animationControllerStateReceiptSchema),
  created: createdSchema,
  removed: removedSchema,
});

export type AnimationControllerReceipt = z.infer<
  typeof animationControllerReceiptSchema
>;

export function animationControllerReceipt<T extends Record<string, unknown>>(
  receipt: T
): T {
  animationControllerReceiptSchema.parse(receipt);
  return receipt;
}

export function isAnimationControllerReceipt(value: unknown): boolean {
  return animationControllerReceiptSchema.safeParse(value).success;
}
