import { z } from "zod";

export const materialTextureReferenceSchema = z.object({
  name: z.string(),
  uuid: z.string().min(1),
});

export const materialContinuationStateSchema = z.object({
  name: z.string().min(1),
  uuid: z.string().min(1),
  is_material: z.boolean(),
  channels: z.object({
    color: materialTextureReferenceSchema.nullable(),
    normal: materialTextureReferenceSchema.nullable(),
    height: materialTextureReferenceSchema.nullable(),
    mer: materialTextureReferenceSchema.nullable(),
  }),
  config: z.object({
    color_value: z.array(z.number().finite()).length(4),
    mer_value: z.array(z.number().finite()).length(3),
    subsurface_value: z.number().finite(),
    saved: z.boolean(),
  }),
});

export const materialMutationReceiptSchema = z.object({
  operation: z.enum([
    "create",
    "configure",
    "assign_channel",
    "import_texture_set",
  ]),
  source_path: z.string().optional(),
  material: materialContinuationStateSchema,
});

export type MaterialMutationReceipt = z.infer<
  typeof materialMutationReceiptSchema
>;

export function materialMutationReceipt(
  receipt: MaterialMutationReceipt
): MaterialMutationReceipt {
  return materialMutationReceiptSchema.parse(receipt);
}

export function isMaterialMutationReceipt(value: unknown): boolean {
  return materialMutationReceiptSchema.safeParse(value).success;
}
