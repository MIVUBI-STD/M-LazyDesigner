import { z } from "zod";

const elementIdentitySchema = z.object({
  uuid: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["cube", "group", "locator", "null_object", "element"]),
  parent: z.string(),
});

const renameChangeSchema = z.object({
  id: z.string().min(1),
  old_name: z.string().min(1),
  new_name: z.string().min(1),
});

const singleRenameReceiptSchema = z.object({
  execution: z.literal("applied"),
  element: elementIdentitySchema,
});

const batchRenameReceiptSchema = z.object({
  execution: z.literal("applied"),
  changes: z.array(renameChangeSchema).min(1),
  affected_animations: z.number().int().nonnegative(),
  element: elementIdentitySchema.optional(),
});

const renamePlanReceiptSchema = z.object({
  execution: z.enum(["planned", "unchanged"]),
  changes: z.array(renameChangeSchema),
  affected_animations: z.number().int().nonnegative(),
});

export const renameElementReceiptSchema = z.union([
  singleRenameReceiptSchema,
  batchRenameReceiptSchema,
  renamePlanReceiptSchema,
]);

export function renameElementReceipt<T extends Record<string, unknown>>(
  receipt: T
): T {
  renameElementReceiptSchema.parse(receipt);
  return receipt;
}

export function isAppliedRenameElementReceipt(value: unknown): boolean {
  const parsed = renameElementReceiptSchema.safeParse(value);
  return parsed.success && parsed.data.execution === "applied";
}
