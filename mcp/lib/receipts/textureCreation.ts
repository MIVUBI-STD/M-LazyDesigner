import { z } from "zod";
import { textureVariantPlanReceiptSchema } from "../texture/variantPlan";

/**
 * create_texture has TWO real Runtime result shapes:
 * - blank/template: native textureInventoryEntry with nested bitmap;
 * - variant: the Runtime extension's compact texture identity and validated
 *   source/target plan. It is not an unsupported or retired capability.
 *
 * None of these receipts proves image appearance or UV acceptance.
 */
const bitmapDimension = z.number().int().positive();

export const textureInventoryCreationReceiptSchema = z.object({
  texture: z.object({
    uuid: z.string().min(1),
    name: z.string().min(1),
    bitmap: z.object({
      width: bitmapDimension,
      height: bitmapDimension,
    }),
  }),
}).passthrough().refine((receipt) => !Object.hasOwn(receipt, "variant_creation"), {
  message: "A texture variant must be validated against its source-owned plan.",
});

export const textureVariantCreationReceiptSchema = z.object({
  texture: z.object({
    uuid: z.string().min(1),
    name: z.string().min(1),
    width: bitmapDimension,
    height: bitmapDimension,
    group: z.string().min(1),
    pbr_channel: z.literal("color"),
  }),
  variant_creation: textureVariantPlanReceiptSchema,
}).superRefine((value, ctx) => {
  const texture = value.texture;
  const plan = value.variant_creation;
  if (texture.uuid === plan.source_texture_uuid) {
    ctx.addIssue({
      code: "custom", path: ["texture", "uuid"],
      message: "Variant UUID must differ from its source atlas UUID.",
    });
  }
  if (texture.name !== plan.requested_name) {
    ctx.addIssue({
      code: "custom", path: ["texture", "name"],
      message: "Created variant name must match the planned variant.",
    });
  }
  if (texture.group !== plan.target_group_uuid) {
    ctx.addIssue({
      code: "custom", path: ["texture", "group"],
      message: "Created variant must belong to the planned non-material group.",
    });
  }
  if (texture.width !== plan.bitmap.width || texture.height !== plan.bitmap.height) {
    ctx.addIssue({
      code: "custom", path: ["texture"],
      message: "Created variant must retain its source atlas bitmap dimensions.",
    });
  }
});

export const textureCreationReceiptSchema = z.union([
  textureInventoryCreationReceiptSchema,
  textureVariantCreationReceiptSchema,
]);

/** Verify the actual branch, not just any response resembling a texture. */
export function isTextureCreationReceipt(value: unknown, requestedType = "blank"): boolean {
  if (requestedType === "variant") {
    return textureVariantCreationReceiptSchema.safeParse(value).success;
  }
  if (requestedType === "blank" || requestedType === "template") {
    return textureInventoryCreationReceiptSchema.safeParse(value).success;
  }
  return false;
}
