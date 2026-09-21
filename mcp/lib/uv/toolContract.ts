import { z } from "zod";

const faceEnum = z.enum([
  "north",
  "south",
  "east",
  "west",
  "up",
  "down",
]);

const selectorSchema = z
  .object({
    island_ids: z.array(z.string().min(1)).max(512).optional(),
    cube_uuids: z.array(z.string().min(1)).max(512).optional(),
    cube_names: z.array(z.string().min(1)).max(512).optional(),
    faces: z.array(faceEnum).max(6).optional(),
    box_uv: z.boolean().optional(),
  })
  .strict();

const rotationSchema = z
  .object({
    allowed: z.boolean().optional(),
    step: z.union([
      z.literal(90),
      z.literal(180),
      z.literal(360),
    ]).optional(),
  })
  .strict();

const densitySchema = z
  .object({
    policy: z
      .enum(["PRESERVE", "NORMALIZE", "CUSTOM"])
      .optional(),
    target_pixels_per_model_unit: z
      .number()
      .finite()
      .positive()
      .optional(),
    multiplier: z
      .number()
      .finite()
      .positive()
      .optional(),
  })
  .strict();

const constraintPatchSchema = z
  .object({
    locked: z.boolean().optional(),
    rotation: rotationSchema.optional(),
    density: densitySchema.optional(),
    stack_group: z.string().min(1).optional(),
    lock_group: z.string().min(1).optional(),
    semantic_group: z.string().min(1).optional(),
    mirror_policy: z
      .enum(["ALLOW", "FORBID", "REQUIRE"])
      .optional(),
    unique_detail: z.boolean().optional(),
    padding_pixels: z
      .number()
      .finite()
      .min(0)
      .max(64)
      .optional(),
    priority: z
      .number()
      .finite()
      .min(-1000)
      .max(1000)
      .optional(),
  })
  .strict();

export const uvConstraintRuleSchema = z
  .object({
    id: z.string().min(1).max(128),
    selector: selectorSchema,
    constraints: constraintPatchSchema,
  })
  .strict();

export const uvLayoutPlanRequestSchema = z
  .object({
    operation: z.literal("plan"),
    bitmap_width: z.number().int().min(1).max(4096),
    bitmap_height: z.number().int().min(1).max(4096),
    mode: z
      .enum([
        "REPACK_ALL",
        "ADD_ONLY",
        "AFFECTED_ONLY",
        "REPACK_SELECTED",
      ])
      .default("REPACK_ALL"),
    island_ids: z
      .array(z.string().min(1))
      .max(512)
      .optional(),
    default_target_pixels_per_model_unit: z
      .number()
      .finite()
      .positive()
      .default(1),
    constraints: z
      .array(uvConstraintRuleSchema)
      .max(256)
      .default([]),
    include_implicit_stack_candidates: z
      .boolean()
      .default(true),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.mode !== "REPACK_ALL" &&
      (!value.island_ids || value.island_ids.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["island_ids"],
        message:
          value.mode +
          " requires at least one explicit island ID.",
      });
    }
  });

export const uvLayoutApplyRequestSchema = z
  .object({
    operation: z.literal("apply"),
    plan_id: z
      .string()
      .regex(/^uvplan:[0-9a-f]{64}$/),
    expected_source_fingerprint: z
      .string()
      .regex(/^sha256:[0-9a-f]{64}$/),
  })
  .strict();

export const manageUvLayoutParameters = z.union([
  uvLayoutPlanRequestSchema,
  uvLayoutApplyRequestSchema,
]);

export type ManageUvLayoutRequest = z.infer<
  typeof manageUvLayoutParameters
>;
