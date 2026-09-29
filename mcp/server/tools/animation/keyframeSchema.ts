import { z } from "zod";
import {
  animationChannelEnum,
  animationIdOptionalSchema,
  axisWithAllEnum,
  boneNameSchema,
  interpolationEnum,
  timeRangeSchema,
} from "@/lib/zodObjects";
import { finiteAnimationVector3Schema } from "./shared";

const molangTransformStringSchema = z
  .string()
  .refine((value) => value.trim().length > 0, {
    message: "Molang transform strings must contain a non-whitespace authored value.",
  })
  .describe("Authored non-empty Molang transform text.");

const manageTransformValueSchema = z.union([
  z.number().finite(),
  molangTransformStringSchema,
]);

const manageTransformVector3Schema = z
  .array(manageTransformValueSchema)
  .length(3);

const manageKeyframeDataSchema = z.object({
  time: z
    .number()
    .finite()
    .min(0)
    .describe("Finite non-negative keyframe time in seconds."),
  values: z
    .union([manageTransformVector3Schema, manageTransformValueSchema])
    .optional()
    .describe("Authored [x,y,z] or uniform transform value. Each axis may be a finite number or explicit non-empty Molang string; strings are preserved, never evaluated by BlockIT."),
  interpolation: interpolationEnum
    .optional()
    .describe("Optional interpolation change. Omit on edit to preserve the existing interpolation."),
  bezier_handles: z
    .object({
      left_time: finiteAnimationVector3Schema.optional(),
      left_value: finiteAnimationVector3Schema.optional(),
      right_time: finiteAnimationVector3Schema.optional(),
      right_value: finiteAnimationVector3Schema.optional(),
    })
    .optional()
    .describe(
      "Finite per-axis Bezier handle offsets [x,y,z]; set interpolation=bezier when authoring handles."
    ),
});

export const manageKeyframesParameters = z
  .object({
    animation_id: animationIdOptionalSchema,
    action: z
      .enum(["create", "delete", "edit", "select"])
      .describe("Action to perform on keyframes."),
    bone_name: boneNameSchema.describe("Group UUID or unique Group name."),
    channel: animationChannelEnum.describe("Animation channel to modify."),
    keyframes: z
      .array(manageKeyframeDataSchema)
      .min(1)
      .describe("One or more keyframes."),
  })
  .superRefine((params, ctx) => {
    params.keyframes.forEach((keyframe, index) => {
      if (
        params.action === "edit" &&
        keyframe.values === undefined &&
        keyframe.interpolation === undefined &&
        keyframe.bezier_handles === undefined
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["keyframes", index],
          message:
            "edit requires values, interpolation, and/or Bezier handles in addition to the target time."
        });
      }

      if (
        (params.action === "create" || params.action === "edit") &&
        keyframe.bezier_handles !== undefined &&
        keyframe.interpolation !== "bezier"
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["keyframes", index, "interpolation"],
          message:
            "Bezier handles require interpolation=bezier so the authored handle change is effective."
        });
      }
    });
  });

export const animationGraphEditorParameters = z.object({
  animation_id: animationIdOptionalSchema,
  bone_name: boneNameSchema.describe("Group UUID or unique Group name."),
  channel: animationChannelEnum.describe("Animation channel to modify."),
  axis: axisWithAllEnum
    .default("all")
    .describe(
      "Bezier-handle axis; 'all' applies the same change to x/y/z. Interpolation stays keyframe-level."
    ),
  action: z
    .enum([
      "smooth",
      "linear",
      "ease_in",
      "ease_out",
      "ease_in_out",
      "stepped",
      "custom",
    ])
    .describe("Type of curve modification to apply."),
  keyframe_range: timeRangeSchema
    .optional()
    .describe(
      "Time range to apply the curve modification. If not provided, applies to all keyframes."
    ),
  custom_curve: z
    .object({
      control_point_1: z
        .array(z.number())
        .length(2)
        .describe("Left Bezier handle offset [time, value]; time must be <= 0."),
      control_point_2: z
        .array(z.number())
        .length(2)
        .describe("Right Bezier handle offset [time, value]; time must be >= 0."),
    })
    .optional()
    .describe(
      "Bezier left/right handle offsets for the axis or all axes ('custom' action only)."
    ),
});


