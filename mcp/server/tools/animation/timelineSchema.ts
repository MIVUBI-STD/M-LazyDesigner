import { z } from "zod";
import { animationEasingSchema } from "@/lib/animationEasing";
import {
  animationIdOptionalSchema,
  loopModeEnum,
} from "@/lib/zodObjects";

const animationTimelineRangeSchema = z
  .object({
    start: z
      .number()
      .finite()
      .min(0)
      .describe("Finite non-negative start time in seconds."),
    end: z
      .number()
      .finite()
      .min(0)
      .describe("Finite non-negative end time in seconds."),
  })
  .refine((range) => range.start <= range.end, {
    message: "Timeline selection range start must be less than or equal to end.",
    path: ["end"],
  })
  .describe(
    "Inclusive finite non-negative timeline selection range with start less than or equal to end."
  );

const animationMolangPropertySchema = z.union([
  z.string().refine(
    (value) => value.trim().replace(/\n/g, "").length > 0,
    {
      message:
        "Molang value must contain authored text; use null to clear the native property.",
    }
  ),
  z.null(),
]);

export const animationTimelineParameters = z
  .object({
    animation_id: animationIdOptionalSchema,
    action: z
      .enum([
        "select",
        "play",
        "pause",
        "stop",
        "set_time",
        "set_length",
        "set_fps",
        "loop",
        "select_range",
        "set_anim_time_update",
        "set_blend_weight",
        "expand_bones",
        "collapse_bones",
        "set_easing",
      ])
      .describe("Timeline or persistent authored-Animation property action."),
    time: z
      .number()
      .finite()
      .min(0)
      .max(1000)
      .optional()
      .describe(
        "Time in seconds for set_time; finite, within Timeline.setTime() range 0..1000, not clamped to animation.length."
      ),
    length: z
      .number()
      .finite()
      .min(0)
      .max(10000)
      .optional()
      .describe(
        "set_length length in seconds; finite, 0..10000. Native setLength() may extend to the keyframe floor."
      ),
    fps: z
      .number()
      .min(10)
      .max(500)
      .optional()
      .describe(
        "Animation snapping rate in frames per second for set_fps; Blockbench supports 10 to 500."
      ),
    loop_mode: loopModeEnum.optional().describe("Loop mode for the animation."),
    easing: animationEasingSchema.optional(),
    bone_ids: z.array(z.string().min(1)).min(1).max(128).optional()
      .describe("Explicit bone UUIDs or unique names for expand_bones/collapse_bones, including descendants. View only; expansion shows existing keyed animators."),
    range: animationTimelineRangeSchema
      .optional()
      .describe("Inclusive time range for select_range."),
    molang: animationMolangPropertySchema
      .optional()
      .describe(
        "Authored Molang for set_anim_time_update/set_blend_weight; null clears to native default. Text normalizes to one line, never evaluated."
      ),
  })
  .superRefine((params, ctx) => {
    const boneAction = params.action === "expand_bones" || params.action === "collapse_bones";
    if ((params.action === "set_easing") !== (params.easing !== undefined)) {
      ctx.addIssue({code:z.ZodIssueCode.custom,path:["easing"],message:"easing is required only for set_easing."});
    }
    if (boneAction !== (params.bone_ids !== undefined)) {
      ctx.addIssue({code:z.ZodIssueCode.custom,path:["bone_ids"],message:"bone_ids is required only for expand_bones/collapse_bones."});
    }
    const usesMolang =
      params.action === "set_anim_time_update" ||
      params.action === "set_blend_weight";

    const required = { set_time: "time", set_length: "length", set_fps: "fps", select_range: "range" } as const;
    const field = required[params.action as keyof typeof required];
    if (field && params[field] === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} is required for ${params.action}.` });
    }

    if (params.action === "loop" && params.loop_mode === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["loop_mode"],
        message: "loop_mode is required for the loop action.",
      });
    }
    if (usesMolang && params.molang === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["molang"],
        message: `${params.action} requires molang; use null to clear.`,
      });
    }
    if (!usesMolang && params.molang !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["molang"],
        message: "molang is used only by set_anim_time_update or set_blend_weight.",
      });
    }
  });


