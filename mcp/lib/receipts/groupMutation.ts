import { z } from "zod";

const vector3Schema = z.array(z.number().finite()).length(3);

export const groupContinuationStateSchema = z.object({
  uuid: z.string().min(1),
  name: z.string().min(1),
  origin: vector3Schema,
  rotation: vector3Schema,
  visibility: z.boolean(),
  parent: z.string(),
});

export const addGroupReceiptSchema = z.object({
  execution: z.literal("applied"),
  groups: z.array(groupContinuationStateSchema).min(1),
  group: groupContinuationStateSchema.optional(),
}).superRefine((value, ctx) => {
  if (
    value.group &&
    !value.groups.some((group) => group.uuid === value.group?.uuid)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["group"],
      message: "Single-group continuation must refer to one created group.",
    });
  }
});

export const modifyGroupReceiptSchema = z.object({
  execution: z.literal("applied"),
  id: z.string().min(1),
  name: z.string().min(1),
  changed_fields: z.array(
    z.enum(["origin", "rotation", "visibility"])
  ).min(1),
  group: groupContinuationStateSchema,
}).superRefine((value, ctx) => {
  if (
    value.id !== value.group.uuid ||
    value.name !== value.group.name
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["group"],
      message: "Modified group summary identity must match final state.",
    });
  }
});

export const reparentElementReceiptSchema = z.object({
  execution: z.literal("applied"),
  id: z.string().min(1),
  name: z.string().min(1),
  previous_parent: z.string(),
  parent: z.string(),
  transform_policy: z.literal("preserve_local"),
});

export function addGroupReceipt<T extends Record<string, unknown>>(
  receipt: T
): T {
  addGroupReceiptSchema.parse(receipt);
  return receipt;
}

export function modifyGroupReceipt<T extends Record<string, unknown>>(
  receipt: T
): T {
  modifyGroupReceiptSchema.parse(receipt);
  return receipt;
}

export function reparentElementReceipt<T extends Record<string, unknown>>(
  receipt: T
): T {
  reparentElementReceiptSchema.parse(receipt);
  return receipt;
}

export function isGroupMutationReceipt(
  capability: string,
  value: unknown
): boolean {
  if (capability === "add_group") {
    return addGroupReceiptSchema.safeParse(value).success;
  }
  if (capability === "modify_group") {
    return modifyGroupReceiptSchema.safeParse(value).success;
  }
  if (capability === "reparent_element") {
    return reparentElementReceiptSchema.safeParse(value).success;
  }
  return false;
}
