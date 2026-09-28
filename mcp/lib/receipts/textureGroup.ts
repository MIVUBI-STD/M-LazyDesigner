import { z } from "zod";

export const textureGroupReceiptSchema = z.object({
  operation: z.literal("create_group"),
  texture_group: z.object({
    uuid: z.string().min(1),
    name: z.string().min(1),
    is_material: z.boolean(),
  }),
  textures: z.array(
    z.object({
      uuid: z.string().min(1),
      id: z.string(),
      name: z.string(),
      group: z.string().min(1),
      pbr_channel: z.string().nullable(),
    })
  ),
}).superRefine((value, ctx) => {
  if (
    value.textures.some(
      (texture) => texture.group !== value.texture_group.uuid
    )
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["textures"],
      message: "Every created texture-group receipt texture must point to the created group.",
    });
  }
});

export function textureGroupReceipt<T extends Record<string, unknown>>(
  receipt: T
): T {
  textureGroupReceiptSchema.parse(receipt);
  return receipt;
}

export function isTextureGroupReceipt(value: unknown): boolean {
  return textureGroupReceiptSchema.safeParse(value).success;
}
