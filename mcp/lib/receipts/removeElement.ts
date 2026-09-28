import { z } from "zod";

export const removeElementReceiptSchema = z
  .object({
    removed_root: z.object({
      uuid: z.string().min(1),
      name: z.string().min(1),
      type: z.string().min(1),
      parent: z.string(),
    }),
    removed_counts: z.object({
      groups: z.number().int().nonnegative(),
      elements: z.number().int().nonnegative(),
      total_nodes: z.number().int().positive(),
    }),
    affected_animations: z.number().int().nonnegative(),
  })
  .superRefine((value, ctx) => {
    if (
      value.removed_counts.total_nodes !==
      value.removed_counts.groups + value.removed_counts.elements
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["removed_counts", "total_nodes"],
        message: "Removed node total must equal groups + elements.",
      });
    }
  });

export function removeElementReceipt<T extends Record<string, unknown>>(
  receipt: T
): T {
  removeElementReceiptSchema.parse(receipt);
  return receipt;
}

export function isRemoveElementReceipt(value: unknown): boolean {
  return removeElementReceiptSchema.safeParse(value).success;
}
