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

const singleRenameReceiptSchema = z.strictObject({
  execution: z.literal("applied"),
  element: elementIdentitySchema,
});

const batchRenameReceiptSchema = z.strictObject({
  execution: z.literal("applied"),
  changes: z.array(renameChangeSchema).min(1),
  affected_animations: z.number().int().nonnegative(),
  element: elementIdentitySchema.optional(),
});

const renamePlanReceiptSchema = z.strictObject({
  execution: z.enum(["planned", "unchanged"]),
  changes: z.array(renameChangeSchema),
  affected_animations: z.number().int().nonnegative(),
});

// A single Group rename can include BOTH final element identity and the
// batch changes/animation-impact receipt. Parse the more specific batch
// shape first so Zod's non-strict single-element schema cannot strip its
// authoritative affected_animations count.
export const renameElementReceiptSchema = z.union([
  batchRenameReceiptSchema,
  singleRenameReceiptSchema,
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
