import { z } from "zod";
import {
  animationChannelEnum,
  axisEnum,
  timeRangeSchema,
} from "@/lib/zodObjects";
import { finiteAnimationVector3Schema } from "./shared";

export const batchKeyframeOperationsParameters = z
  .object({
    selection: z
      .enum(["all", "selected", "range", "pattern"])
      .default("selected")
      .describe("Which keyframes to operate on."),
    range: timeRangeSchema.optional().describe("Time range for keyframe selection."),
    pattern: z
      .object({
        interval: z
          .number()
          .finite()
          .positive()
          .describe("Finite positive time interval between keyframes."),
        offset: z
          .number()
          .finite()
          .optional()
          .default(0)
          .describe("Finite time offset for the pattern."),
      })
      .optional()
      .describe("Pattern-based selection."),
    operation: z
      .enum(["offset", "scale", "reverse", "mirror", "smooth", "bake"])
      .describe(
        "Operation to perform on keyframes. Bake samples each selected animator's full channel range, even with selection=range/pattern subsets."
      ),
    parameters: z
      .object({
        offset_time: z.number().finite().optional().describe("Finite time offset to apply."),
        offset_values: finiteAnimationVector3Schema
          .optional()
          .describe("Finite value offset [x,y,z] to apply."),
        scale_factor: z
          .number()
          .finite()
          .optional()
          .describe("Finite scale factor for keyframe time."),
        scale_pivot: z
          .number()
          .finite()
          .optional()
          .describe("Finite pivot point for scaling."),
        mirror_axis: axisEnum.optional().describe("Axis to mirror values across."),
        bake_interval: z
          .number()
          .finite()
          .positive()
          .optional()
          .describe("Strictly positive finite interval in seconds for baking keyframes."),
      })
      .optional()
      .describe("Operation-specific parameters."),
  })
  .superRefine((params, ctx) => {
    if (params.selection === "range" && params.range === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["range"],
        message: "range is required when selection=range."
      });
    }
    if (params.selection === "pattern" && params.pattern === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pattern"],
        message: "pattern is required when selection=pattern."
      });
    }

    const operationParameters = params.parameters;
    if (params.operation === "mirror" && operationParameters?.mirror_axis === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parameters", "mirror_axis"],
        message: "mirror_axis is required for the mirror operation."
      });
    }

    if (params.operation === "offset") {
      const timeDelta = operationParameters?.offset_time ?? 0;
      const valueDelta = operationParameters?.offset_values ?? [0, 0, 0];
      if (timeDelta === 0 && valueDelta.every((value) => value === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["parameters"],
          message: "offset requires a non-zero offset_time or offset_values change."
        });
      }
    }

    if (params.operation === "scale") {
      const factor = operationParameters?.scale_factor;
      if (factor === undefined || factor === 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["parameters", "scale_factor"],
          message: "scale requires an explicit scale_factor other than 1."
        });
      }
    }
  });

export const animationCopyPasteParameters = z.object({
  action: z
    .enum(["copy", "paste", "mirror_paste"])
    .describe("Copy or paste action."),
  source: z
    .object({
      animation: z
        .string()
        .optional()
        .describe("Source animation name or UUID."),
      bone: z.string().describe("Exact source Group UUID or exact unique Group name."),
      channels: z
        .array(animationChannelEnum)
        .min(1)
        .optional()
        .default(["rotation", "position", "scale"])
        .describe("One or more animation channels to copy."),
      time_range: timeRangeSchema
        .optional()
        .describe(
          "Time range to copy. If not provided, copies all keyframes."
        ),
    })
    .optional()
    .describe("Source data for copy operation."),
  target: z
    .object({
      animation: z
        .string()
        .optional()
        .describe("Target animation name or UUID."),
      bone: z.string().describe("Exact target Group UUID or exact unique Group name."),
      time_offset: z
        .number()
        .finite()
        .optional()
        .default(0)
        .describe("Finite time offset for pasted keyframes."),
      mirror_axis: axisEnum.optional().describe("Axis to mirror across for mirror_paste."),
    })
    .optional()
    .describe("Target data for paste operation."),
}).superRefine((params, ctx) => {
  if (params.action === "copy" && params.source === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["source"],
      message: "source is required for the copy action."
    });
  }

  if (
    (params.action === "paste" || params.action === "mirror_paste") &&
    params.target === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["target"],
      message: "target is required for paste and mirror_paste actions."
    });
  }

  if (
    params.action === "mirror_paste" &&
    params.target !== undefined &&
    params.target.mirror_axis === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["target", "mirror_axis"],
      message:
        "mirror_axis is required for mirror_paste; no implicit mirror axis is assumed."
    });
  }
});


