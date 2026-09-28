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

export function materialMutationReceipt<T extends Record<string, unknown>>(
  receipt: T
): T {
  materialMutationReceiptSchema.parse(receipt);
  return receipt;
}

export function isMaterialMutationReceipt(value: unknown): boolean {
  return materialMutationReceiptSchema.safeParse(value).success;
}

export const materialPersistenceReceiptSchema = z.object({
  operation: z.literal("save"),
  scope: z.literal("material_persistence_only"),
  material: z.object({
    uuid: z.string().min(1),
    name: z.string().min(1),
  }),
  file_path: z.string().min(1),
  saved: z.literal(true),
  file_exists: z.literal(true),
});

export function materialPersistenceReceipt<T extends Record<string, unknown>>(
  receipt: T
): T {
  materialPersistenceReceiptSchema.parse(receipt);
  return receipt;
}

export function isMaterialPersistenceReceipt(value: unknown): boolean {
  return materialPersistenceReceiptSchema.safeParse(value).success;
}
