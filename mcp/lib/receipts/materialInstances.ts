import { z } from "zod";

const cubeIdentitySchema = z.object({
  uuid: z.string().min(1),
  name: z.string(),
});

const faceChangeSchema = z.object({
  cube_uuid: z.string().min(1),
  cube_name: z.string(),
  face: z.string().min(1),
  material_name: z.string(),
});

export const materialInstanceMutationReceiptSchema = z
  .object({
    operation: z.enum(["set", "bulk_set", "clear"]),
    cube_count: z.number().int().positive(),
    face_count: z.number().int().positive(),
    cubes: z.array(cubeIdentitySchema),
    changes: z.array(faceChangeSchema),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (value.cubes.length !== value.cube_count) {
      ctx.addIssue({
        code: "custom",
        path: ["cubes"],
        message: "Material-instance cube_count must equal cubes.length.",
      });
    }
    if (value.changes.length !== value.face_count) {
      ctx.addIssue({
        code: "custom",
        path: ["changes"],
        message: "Material-instance face_count must equal changes.length.",
      });
    }
  });

export type MaterialInstanceMutationReceipt = z.infer<
  typeof materialInstanceMutationReceiptSchema
>;

export function materialInstanceMutationReceipt<T extends Record<string, unknown>>(
  receipt: T
): T {
  materialInstanceMutationReceiptSchema.parse(receipt);
  return receipt;
}

export function isMaterialInstanceMutationReceipt(value: unknown): boolean {
  return materialInstanceMutationReceiptSchema.safeParse(value).success;
}
