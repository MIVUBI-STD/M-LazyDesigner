import { z } from "zod";

const vector3Schema = z.array(z.number().finite()).length(3);

const boneStateSchema = z.object({
  uuid: z.string().min(1),
  name: z.string().min(1),
  parent: z.string(),
  origin: vector3Schema,
  rotation: vector3Schema,
  ik_enabled: z.boolean(),
  ik_target: z.string().nullable(),
});

const boneStateReceiptSchema = z.object({
  action: z.enum([
    "create",
    "parent",
    "unparent",
    "rename",
    "set_pivot",
    "set_ik",
    "mirror",
  ]),
  bone: boneStateSchema,
});

const boneDeleteReceiptSchema = z
  .object({
    action: z.literal("delete"),
    removed_root: z.object({
      uuid: z.string().min(1),
      name: z.string().min(1),
      parent: z.string(),
    }),
    removed_counts: z.object({
      groups: z.number().int().positive(),
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
        message: "Bone delete total must equal groups + elements.",
      });
    }
  });

const nativeIkControllerReceiptSchema = z.object({
  action: z.literal("set_ik_controller"),
  controller: z.object({
    uuid: z.string().min(1),
    name: z.string().min(1),
    ik_target: z.string().nullable(),
    ik_source: z.string().nullable(),
    ik_pole: z.string().nullable(),
    lock_ik_target_rotation: z.boolean(),
  }),
});

export const boneRiggingReceiptSchema = z.union([
  boneStateReceiptSchema,
  boneDeleteReceiptSchema,
  nativeIkControllerReceiptSchema,
]);

export function boneRiggingReceipt<T extends Record<string, unknown>>(
  receipt: T
): T {
  boneRiggingReceiptSchema.parse(receipt);
  return receipt;
}

export function isBoneRiggingStateReceipt(value: unknown): boolean {
  return boneStateReceiptSchema.safeParse(value).success;
}

export function isBoneRiggingDeletionReceipt(value: unknown): boolean {
  return boneDeleteReceiptSchema.safeParse(value).success;
}

export function isNativeIkControllerReceipt(value: unknown): boolean {
  return nativeIkControllerReceiptSchema.safeParse(value).success;
}
