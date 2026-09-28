import { z } from "zod";

const parentSchema = z
  .object({
    uuid: z.string().min(1),
    name: z.string(),
  })
  .nullable();

const vector3Schema = z
  .array(z.number().finite())
  .length(3);

const locatorStateSchema = z
  .object({
    uuid: z.string().min(1),
    name: z.string(),
    type: z.literal("locator"),
    parent: parentSchema,
    position: vector3Schema,
    rotation: vector3Schema,
    ignore_inherited_scale: z.boolean(),
    visibility: z.boolean(),
  })
  .passthrough();

const nullObjectStateSchema = z
  .object({
    uuid: z.string().min(1),
    name: z.string(),
    type: z.literal("null_object"),
    parent: parentSchema,
    position: vector3Schema,
    ik_target: z.string().nullable(),
    ik_source: z.string().nullable(),
    ik_pole: z.string().nullable(),
    lock_ik_target_rotation: z.boolean(),
    visibility: z.boolean(),
  })
  .passthrough();

export const locatorMutationReceiptSchema = z.object({
  execution: z.literal("applied"),
  action: z.enum(["create", "update"]),
  id: z.string().min(1),
  name: z.string(),
  type: z.enum(["locator", "null_object"]),
  parent: parentSchema,
  changed_fields: z.array(z.string()),
  state: z.union([locatorStateSchema, nullObjectStateSchema]),
}).superRefine((value, ctx) => {
  if (
    value.id !== value.state.uuid ||
    value.name !== value.state.name ||
    value.type !== value.state.type
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["state"],
      message: "Locator receipt summary identity must match final state.",
    });
  }
});

export function locatorMutationReceipt<T extends Record<string, unknown>>(
  receipt: T
): T {
  locatorMutationReceiptSchema.parse(receipt);
  return receipt;
}

export function isLocatorMutationReceipt(value: unknown): boolean {
  return locatorMutationReceiptSchema.safeParse(value).success;
}
