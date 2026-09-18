/// <reference types="three" />
/// <reference types="blockbench-types" />
import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL, STATUS_STABLE } from "@/lib/constants";
import { resolveCoreAnimation } from "@/lib/coreIdentity";
import {animationEasingSchema,buildAnimationEasing} from "@/lib/animationEasing";
import {
  resolveAnimationRigGroup as resolveRigGroup,
  toArrayVector3,
} from "./animation-shared";
import {
  boneRiggingParameters,
  boneRiggingToolDoc,
  registerBoneRiggingTool,
} from "./animation-rigging";
export {
  boneRiggingParameters,
  deriveMirroredRigName,
  hasCaseInsensitiveRigNameCollision,
  wouldCreateRigHierarchyCycle,
} from "./animation-rigging";

import {
  vector3Schema,
  animationIdOptionalSchema,
  animationChannelEnum,
  interpolationEnum,
  axisEnum,
  axisWithAllEnum,
  timeRangeSchema,
  boneNameSchema,
  loopModeEnum,
} from "@/lib/zodObjects";

const bedrockParticleEffectSchema = z.object({
  effect: z
    .string()
    .min(1)
    .describe("Bedrock particle effect identifier."),
  locator: z
    .string()
    .min(1)
    .optional()
    .describe("Optional Locator name for the particle."),
  bind_to_actor: z
    .boolean()
    .optional()
    .describe(
      "Optional actor-binding flag."
    ),
  pre_effect_script: z
    .string()
    .optional()
    .describe("Optional pre-effect Molang script."),
});

const bedrockParticleEffectsSchema = z
  .record(
    z.union([
      bedrockParticleEffectSchema,
      z.array(bedrockParticleEffectSchema).min(1),
    ])
  )
  .superRefine((particleEffects, ctx) => {
    const effectiveTimes = new Map<number, string>();

    Object.keys(particleEffects).forEach((timestamp) => {
      const normalizedTimestamp = timestamp.trim();
      const numericTime = Number(normalizedTimestamp);
      const codecTime = Number.parseFloat(normalizedTimestamp);

      if (
        normalizedTimestamp.length === 0 ||
        !Number.isFinite(numericTime) ||
        !Number.isFinite(codecTime) ||
        numericTime !== codecTime
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [timestamp],
          message: `Particle timestamp "${timestamp}" must be a complete finite numeric value.`,
        });
        return;
      }

      if (numericTime < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [timestamp],
          message: `Particle timestamp "${timestamp}" must be greater than or equal to 0.`,
        });
        return;
      }

      const previousTimestamp = effectiveTimes.get(numericTime);
      if (previousTimestamp !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [timestamp],
          message: `Particle timestamps "${previousTimestamp}" and "${timestamp}" resolve to the same effective time ${numericTime}. Use one timestamp per effective time.`,
        });
        return;
      }

      effectiveTimes.set(numericTime, timestamp);
    });
  })
  .describe(
    "Particle effects keyed by non-negative timestamps."
  );

const bedrockSoundEffectSchema = z.object({
  effect: z.string().min(1).describe("Bedrock sound effect ID."),
  locator: z.string().min(1).optional().describe("Optional sound Locator name."),
});

const bedrockSoundEffectsSchema = z
  .record(z.union([bedrockSoundEffectSchema, z.array(bedrockSoundEffectSchema).min(1)]))
  .superRefine((soundEffects, ctx) => {
    const effectiveTimes = new Map<number, string>();
    Object.keys(soundEffects).forEach((timestamp) => {
      const normalizedTimestamp = timestamp.trim();
      const numericTime = Number(normalizedTimestamp);
      const codecTime = Number.parseFloat(normalizedTimestamp);
      if (
        normalizedTimestamp.length === 0 ||
        !Number.isFinite(numericTime) ||
        !Number.isFinite(codecTime) ||
        numericTime !== codecTime ||
        numericTime < 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [timestamp],
          message: `Sound timestamp "${timestamp}" must be a complete finite non-negative numeric value.`,
        });
        return;
      }
      const previousTimestamp = effectiveTimes.get(numericTime);
      if (previousTimestamp !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [timestamp],
          message: `Sound timestamps "${previousTimestamp}" and "${timestamp}" resolve to the same effective time ${numericTime}. Use one timestamp per effective time.`,
        });
        return;
      }
      effectiveTimes.set(numericTime, timestamp);
    });
  })
  .describe("Sound effects keyed by non-negative timestamps.");

const finiteCreateAnimationVector3Schema = z
  .array(z.number().finite())
  .length(3);

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

const bedrockBoneKeyframeSchema = z.object({
  time: z
    .number()
    .finite()
    .min(0)
    .describe("Finite keyframe time in seconds (>=0)."),
  position: finiteCreateAnimationVector3Schema
    .optional()
    .describe(
      "Authored Blockbench position [x,y,z]."
    ),
  rotation: finiteCreateAnimationVector3Schema
    .optional()
    .describe(
      "Authored Blockbench rotation [x,y,z]."
    ),
  scale: z
    .union([finiteCreateAnimationVector3Schema, z.number().finite()])
    .optional()
    .describe(
      "Scale [x,y,z] or uniform scalar."
    ),
});

const bedrockBoneKeyframesSchema = z
  .array(bedrockBoneKeyframeSchema)
  .superRefine((keyframes, ctx) => {
    const channelTimes = {
      position: new Map<number, number>(),
      rotation: new Map<number, number>(),
      scale: new Map<number, number>(),
    };
    const channels = ["position", "rotation", "scale"] as const;

    keyframes.forEach((keyframe, index) => {
      channels.forEach((channel) => {
        if (keyframe[channel] === undefined) return;

        const previousIndex = channelTimes[channel].get(keyframe.time);
        if (previousIndex !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, "time"],
            message: `Bone keyframe entries ${previousIndex} and ${index} both define ${channel} at time ${keyframe.time}. Use one ${channel} value per effective time.`,
          });
          return;
        }

        channelTimes[channel].set(keyframe.time, index);
      });
    });
  })
  .describe(
    "Transform keyframes at non-negative times."
  );

export const createAnimationParameters = z.object({
  name: z.string().min(1).describe("Animation name."),
  loop: z
    .boolean()
    .default(false)
    .describe("Loop the animation."),
  animation_length: z
    .number()
    .finite()
    .min(0)
    .max(10000)
    .optional()
    .describe(
      "Optional animation length in seconds (0..10000)."
    ),
  bones: z
    .record(bedrockBoneKeyframesSchema)
    .describe(
      "Bone keyframes keyed by Group UUID or case-insensitively unique name; values use authored space."
    ),
  particle_effects: bedrockParticleEffectsSchema.optional(),
  sound_effects: bedrockSoundEffectsSchema.optional(),
});

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
      left_time: finiteCreateAnimationVector3Schema.optional(),
      left_value: finiteCreateAnimationVector3Schema.optional(),
      right_time: finiteCreateAnimationVector3Schema.optional(),
      right_value: finiteCreateAnimationVector3Schema.optional(),
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
        offset_values: finiteCreateAnimationVector3Schema
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

export const animationToolDocs: ToolSpec[] = [
  {
    name: "create_animation",
    description:
      "Creates one new authored Bedrock Animation clip with explicit bone transforms and optional initial sound/particle effects. Use this for a new clip, not project creation.",
    annotations: {
      title: "Create Bedrock Animation Clip",
      destructiveHint: true,
    },
    parameters: createAnimationParameters,
    status: STATUS_STABLE,
  },
  {
    name: "manage_keyframes",
    description:
      "Creates, edits, deletes, or selects keyframes for one animation bone and channel. Numeric and authored Molang values are preserved.",
    annotations: {
      title: "Manage Keyframes",
      destructiveHint: true,
    },
    parameters: manageKeyframesParameters,
    status: STATUS_EXPERIMENTAL,
  },
  {
    name: "animation_graph_editor",
    description:
      "Applies a curve/interpolation edit to one animation bone channel.",
    annotations: {
      title: "Animation Graph Editor",
      destructiveHint: true,
    },
    parameters: animationGraphEditorParameters,
    status: STATUS_EXPERIMENTAL,
  },
  boneRiggingToolDoc,
  {
    name: "animation_timeline",
    description:
      "Controls the explicit animation_id (or current clip when omitted). select/playback/time actions select that clip; property edits target it without changing selection. Returns affected UUID.",
    annotations: {
      title: "Animation Timeline",
      destructiveHint: true,
    },
    parameters: animationTimelineParameters,
    status: STATUS_EXPERIMENTAL,
  },
  {
    name: "batch_keyframe_operations",
    description: "Applies one bounded batch operation to selected, ranged, patterned, or all keyframes.",
    annotations: {
      title: "Batch Keyframe Operations",
      destructiveHint: true,
    },
    parameters: batchKeyframeOperationsParameters,
    status: STATUS_EXPERIMENTAL,
  },
  {
    name: "animation_copy_paste",
    description:
      "Copies, pastes, or mirrors keyframes between animation bones. Copy/paste targets must be explicit; mirror_paste requires an axis.",
    annotations: {
      title: "Animation Copy/Paste",
      destructiveHint: true,
    },
    parameters: animationCopyPasteParameters,
    status: STATUS_EXPERIMENTAL,
  },
];

export function normalizeBedrockAnimationName(name: string): string {
  return name.startsWith("animation.") ? name : `animation.${name}`;
}
export function countAnimationClipboardKeyframes(
  channels: Record<string, readonly unknown[]>
): number {
  return Object.values(channels).reduce(
    (count, keyframes) => count + keyframes.length,
    0
  );
}
export function keyframeBelongsToAnimation(
  keyframe: { animator?: { animation?: unknown } | null },
  animation: unknown
): boolean {
  return keyframe.animator?.animation === animation;
}
export function normalizeAnimationMolangProperty(value: string | null): string {
  return value === null ? "" : value.trim().replace(/\n/g, "");
}
export function resolveUniqueKeyframeMatchIndexes(
  existingTimes: readonly number[],
  requestedTimes: readonly number[],
  tolerance = 0.001
): number[] {
  if (!Number.isFinite(tolerance) || tolerance <= 0) {
    throw new Error("Keyframe match tolerance must be finite and greater than 0.");
  }
  if (!existingTimes.every(Number.isFinite) || !requestedTimes.every(Number.isFinite)) {
    throw new Error("Keyframe matching requires finite existing and requested times.");
  }

  const claimedIndexes = new Set<number>();
  return requestedTimes.map((requestedTime) => {
    const matches: number[] = [];
    existingTimes.forEach((existingTime, index) => {
      if (Math.abs(existingTime - requestedTime) < tolerance) matches.push(index);
    });

    if (matches.length === 0) {
      throw new Error(`No existing keyframe matches requested time ${requestedTime}.`);
    }
    if (matches.length > 1) {
      throw new Error(
        `Requested time ${requestedTime} ambiguously matches ${matches.length} existing keyframes.`
      );
    }

    const matchedIndex = matches[0];
    if (claimedIndexes.has(matchedIndex)) {
      throw new Error(
        `Multiple requested times resolve to the same existing keyframe near ${requestedTime}.`
      );
    }
    claimedIndexes.add(matchedIndex);
    return matchedIndex;
  });
}
function keyframeContinuationState(keyframe: _Keyframe) {
  return {
    uuid: keyframe.uuid,
    time: keyframe.time,
    interpolation: keyframe.interpolation,
  };
}
export function requireValidPlannedKeyframeTimes(
  times: readonly number[],
  context: string,
  rejectExactDuplicates = false
): void {
  times.forEach((time, index) => {
    if (!Number.isFinite(time) || time < 0 || time > 10000) {
      throw new Error(
        `${context} would place keyframe ${index} at invalid time ${time}; Blockbench authored keyframe time must stay within 0..10000 seconds.`
      );
    }
  });

  if (rejectExactDuplicates && new Set(times).size !== times.length) {
    throw new Error(
      `${context} would collapse multiple selected keyframes onto the same effective time. Use a different scale factor/pivot or reduce the selection.`
    );
  }
}
export function requireValidPlannedPasteChannelTimes(
  channels: Readonly<Record<string, readonly number[]>>
): void {
  Object.entries(channels).forEach(([channel, times]) => {
    requireValidPlannedKeyframeTimes(
      times,
      `Animation paste ${channel} channel`,
      true
    );
  });
}
export function registerAnimationTools() {
createTool(
  animationToolDocs[0].name,
  {
    ...animationToolDocs[0],
    parameters: createAnimationParameters,
    async execute({ name, loop, animation_length, bones, particle_effects, sound_effects }) {
      if (!Project) {
        throw new Error(
          "No project is open. Open or create the intended Bedrock Entity project before creating an animation."
        );
      }

      type BedrockAnimationCodec = {
        id: string;
        loadFile?: (
          file: { content: string; path?: string },
          animationFilter?: string[]
        ) => _Animation[];
      };
      const animationCodecApi = (
        globalThis as typeof globalThis & {
          AnimationCodec?: {
            getCodec(animation?: _Animation): BedrockAnimationCodec | undefined;
          };
        }
      ).AnimationCodec;
      const codec = animationCodecApi?.getCodec();
      if (!codec || codec.id !== "bedrock" || typeof codec.loadFile !== "function") {
        throw new Error(
          "create_animation requires the current Bedrock AnimationCodec. Open a Bedrock Entity project before creating an animation."
        );
      }

      const seenGroupReferences = new Map<string, string>();
      const resolvedBoneEntries = Object.entries(bones).map(
        ([boneReference, keyframes]) => {
          const uuidMatch = Group.all.find(
            (group: Group) => group.uuid === boneReference
          );
          let group: Group;

          if (uuidMatch) {
            group = uuidMatch;
          } else {
            const normalizedReference = boneReference.toLowerCase();
            const nameMatches = Group.all.filter(
              (candidate: Group) =>
                candidate.name.toLowerCase() === normalizedReference
            );
            if (nameMatches.length === 1) {
              group = nameMatches[0];
            } else if (nameMatches.length > 1) {
              throw new Error(
                `Group name "${boneReference}" is ambiguous under Bedrock animation matching. Rename colliding Groups or target one after names are unique. Candidates: ${nameMatches
                  .map((candidate: Group) => `${candidate.name} (${candidate.uuid})`)
                  .join(", ")}`
              );
            } else {
              throw new Error(
                `Group "${boneReference}" not found. Every create_animation bone must target an existing Group UUID or unique Group name.`
              );
            }
          }

          const codecNameMatches = Group.all.filter(
            (candidate: Group) =>
              candidate.name.toLowerCase() === group.name.toLowerCase()
          );
          if (
            codecNameMatches.length !== 1 ||
            codecNameMatches[0].uuid !== group.uuid
          ) {
            throw new Error(
              `Group "${group.name}" (${group.uuid}) cannot be targeted deterministically by create_animation because Bedrock animation import matches bone names case-insensitively. Rename colliding Groups first. Candidates: ${codecNameMatches
                .map((candidate: Group) => `${candidate.name} (${candidate.uuid})`)
                .join(", ")}`
            );
          }

          const previousReference = seenGroupReferences.get(group.uuid);
          if (previousReference !== undefined) {
            throw new Error(
              `create_animation bones "${previousReference}" and "${boneReference}" resolve to the same Group "${group.name}" (${group.uuid}). Provide each Group only once.`
            );
          }
          seenGroupReferences.set(group.uuid, boneReference);

          return {
            requestedReference: boneReference,
            group,
            keyframes,
          };
        }
      );

      const animationData = {
        loop,
        ...(animation_length !== undefined && { animation_length }),
        bones: Object.fromEntries(
          resolvedBoneEntries.map(({ group, keyframes }) => {
            const boneData: Record<
              string,
              Record<string, number | number[]>
            > = keyframes.reduce((acc, keyframe) => {
              const timeKey = keyframe.time.toString();
              if (keyframe.position) {
                const [x, y, z] = keyframe.position;
                (acc.position ??= {})[timeKey] = [-x, y, z];
              }
              if (keyframe.rotation) {
                const [x, y, z] = keyframe.rotation;
                (acc.rotation ??= {})[timeKey] = [-x, -y, z];
              }
              if (keyframe.scale !== undefined) {
                (acc.scale ??= {})[timeKey] = keyframe.scale;
              }
              return acc;
            }, {} as Record<string, Record<string, number | number[]>>);

            return [group.name, boneData];
          })
        ),
        ...(particle_effects && { particle_effects }),
        ...(sound_effects && { sound_effects }),
      };

      const requestedAnimationName = normalizeBedrockAnimationName(name);
      const fileContent = JSON.stringify({
        format_version: "1.8.0",
        animations: {
          [requestedAnimationName]: animationData,
        },
      });
      const animationUuidsBefore = new Set(
        AnimationItem.all.map((animation) => animation.uuid)
      );
      let editStarted = false;

      try {
        Undo.initEdit({ animations: [] });
        editStarted = true;

        const codecCreatedAnimations = codec.loadFile(
          { content: fileContent },
          [requestedAnimationName]
        );
        const createdAnimations = codecCreatedAnimations.filter(
          (animation) =>
            !animationUuidsBefore.has(animation.uuid) &&
            AnimationItem.all.includes(animation)
        );
        if (createdAnimations.length !== 1) {
          throw new Error(
            `Bedrock AnimationCodec created ${createdAnimations.length} new animations; expected exactly 1.`
          );
        }

        const [createdAnimation] = createdAnimations;
        resolvedBoneEntries.forEach(({ requestedReference, group }) => {
          const animator = createdAnimation.animators[group.uuid];
          if (!(animator instanceof BoneAnimator)) {
            throw new Error(
              `Created animation "${createdAnimation.name}" did not bind requested bone "${requestedReference}" to Group "${group.name}" (${group.uuid}).`
            );
          }
        });

        createdAnimation.select();
        if (AnimationItem.selected !== createdAnimation) {
          throw new Error(
            `Created animation "${createdAnimation.name}" could not be selected for timeline operations.`
          );
        }

        Undo.finishEdit("Create animation", {
          animations: createdAnimations,
        });
        editStarted = false;

        const requestedParticleEffectCount = particle_effects
          ? Object.values(particle_effects).reduce(
              (count, particleOrParticles) =>
                count +
                (Array.isArray(particleOrParticles)
                  ? particleOrParticles.length
                  : 1),
              0
            )
          : 0;
        const requestedSoundEffectCount = sound_effects
          ? Object.values(sound_effects).reduce(
              (count, soundOrSounds) => count + (Array.isArray(soundOrSounds) ? soundOrSounds.length : 1),
              0
            )
          : 0;
        const result = {
          animation: {
            uuid: createdAnimation.uuid,
            name: createdAnimation.name,
            loop: createdAnimation.loop,
            length: createdAnimation.length,
            snapping: createdAnimation.snapping,
          },
          requested_name: requestedAnimationName,
          requested_bone_count: Object.keys(bones).length,
          requested_particle_effect_count: requestedParticleEffectCount,
          requested_sound_effect_count: requestedSoundEffectCount,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: `Created animation "${createdAnimation.name}" (${createdAnimation.uuid}) for ${result.requested_bone_count} bone(s); ${requestedParticleEffectCount} particle and ${requestedSoundEffectCount} sound effect keyframe(s) requested.`,
            },
          ],
          structuredContent: result,
        };
      } catch (error) {
        const createdDuringAttempt = AnimationItem.all.filter(
          (animation) => !animationUuidsBefore.has(animation.uuid)
        );
        createdDuringAttempt.forEach((animation) => {
          animation.remove(false, false);
        });
        if (editStarted) {
          Undo.cancelEdit(true);
        }
        throw error;
      }
    },
  },
  animationToolDocs[0].status
);

createTool(
  animationToolDocs[1].name,
  {
    ...animationToolDocs[1],
    parameters: manageKeyframesParameters,
    async execute({ animation_id, action, bone_name, channel, keyframes }) {
      const animation = resolveAnimation(animation_id);
      const group = resolveRigGroup(bone_name);
      const existingAnimator = animation.animators[group.uuid] as BoneAnimator | undefined;
      const buildResult = (
        affectedKeyframes: Array<ReturnType<typeof keyframeContinuationState>>,
        overwrittenKeyframeCount = 0
      ) => {
        const result = {
          action,
          animation: { uuid: animation.uuid, name: animation.name },
          bone: { uuid: group.uuid, name: group.name },
          channel,
          affected_count: affectedKeyframes.length,
          affected_keyframes: affectedKeyframes,
          ...(overwrittenKeyframeCount > 0
            ? { overwritten_keyframes: overwrittenKeyframeCount }
            : {}),
        };
        return {
          content: [
            {
              type: "text" as const,
              text:
                overwrittenKeyframeCount > 0
                  ? `${action} affected ${affectedKeyframes.length} keyframe(s) for ${group.name}.${channel}, replacing ${overwrittenKeyframeCount} coincident keyframe(s).`
                  : `${action} affected ${affectedKeyframes.length} keyframe(s) for ${group.name}.${channel}.`,
            },
          ],
          structuredContent: result,
        };
      };

      const applyValues = (
        keyframe: _Keyframe,
        values: number | string | Array<number | string> | undefined
      ) => {
        if (values === undefined) return;
        if (typeof values === "number" || typeof values === "string") {
          keyframe.uniform = true;
          keyframe.set("x", values);
        } else {
          keyframe.uniform = false;
          keyframe.set("x", values[0]);
          keyframe.set("y", values[1]);
          keyframe.set("z", values[2]);
        }
      };

      const resolveRequestedTargets = (): _Keyframe[] => {
        if (!existingAnimator || !existingAnimator[channel]?.length) {
          throw new Error(`No keyframes found for ${group.name}.${channel}`);
        }
        const channelKeyframes = existingAnimator[channel] as _Keyframe[];
        const matchedIndexes = resolveUniqueKeyframeMatchIndexes(
          channelKeyframes.map((keyframe) => keyframe.time),
          keyframes.map((keyframe) => keyframe.time)
        );
        return matchedIndexes.map((index) => channelKeyframes[index]);
      };

      if (action === "select") {
        if (animation !== AnimationItem.selected) {
          throw new Error(
            `Cannot select keyframes from animation "${animation.name}" because it is not the selected Blockbench animation.`
          );
        }
        const targetKeyframes = resolveRequestedTargets();

        Undo.initSelection({ timeline: true });
        try {
          Timeline.unselect();
          existingAnimator!.select();
          targetKeyframes.forEach((keyframe) => {
            keyframe.selected = true;
            if (!Timeline.selected.includes(keyframe)) {
              Timeline.selected.push(keyframe);
            }
          });
          updateKeyframeSelection();
          Undo.finishSelection("Select keyframes");
        } catch (error) {
          Undo.cancelSelection(true);
          updateKeyframeSelection();
          throw error;
        }

        Animator.preview();
        return buildResult(targetKeyframes.map(keyframeContinuationState));
      }

      const plannedCreateTimes =
        action === "create"
          ? keyframes.map((keyframe) => Timeline.snapTime(keyframe.time, animation))
          : [];
      if (action === "create") {
        requireValidPlannedKeyframeTimes(
          plannedCreateTimes,
          "manage_keyframes create",
          true
        );
      }
      const targetKeyframes = action === "create" ? [] : resolveRequestedTargets();
      let affectedKeyframes =
        action === "delete" ? targetKeyframes.map(keyframeContinuationState) : [];
      const createCasualties: _Keyframe[] = [];

      Undo.initEdit({
        animations: [animation],
      });

      try {
        let animator = existingAnimator;
        if (!animator) {
          const createdAnimator = animation.getBoneAnimator(group);
          if (!createdAnimator) {
            throw new Error(
              `Cannot create animation data for Group "${group.name}" in animation "${animation.name}".`
            );
          }
          animator = createdAnimator;
        }
        const createdKeyframes: _Keyframe[] = [];

        switch (action) {
          case "create":
            keyframes.forEach((kf, index) => {
              const keyframe = animator!.addKeyframe({
                channel,
                data_points: [{}],
                time: plannedCreateTimes[index],
                interpolation: kf.interpolation ?? "linear",
              });
              if (!keyframe) {
                throw new Error(`Channel "${channel}" is unavailable for ${group.name}.`);
              }
              applyValues(keyframe, kf.values);
              // Collect same-time casualties so the create receipt reports
              // what native replace semantics evicted.
              keyframe.replaceOthers(createCasualties);

              if (kf.interpolation === "bezier" && kf.bezier_handles) {
                // @ts-ignore
                if (kf.bezier_handles.left_time !== undefined)
                  keyframe.bezier_left_time = toArrayVector3(kf.bezier_handles.left_time);
                // @ts-ignore
                if (kf.bezier_handles.left_value)
                  keyframe.bezier_left_value = toArrayVector3(kf.bezier_handles.left_value);
                // @ts-ignore
                if (kf.bezier_handles.right_time !== undefined)
                  keyframe.bezier_right_time = toArrayVector3(kf.bezier_handles.right_time);
                // @ts-ignore
                if (kf.bezier_handles.right_value)
                  keyframe.bezier_right_value = toArrayVector3(kf.bezier_handles.right_value);
              }
              createdKeyframes.push(keyframe);
            });
            animation.setLength();
            affectedKeyframes = createdKeyframes.map(keyframeContinuationState);
            break;

          case "delete":
            targetKeyframes.forEach((keyframe) => keyframe.remove());
            break;

          case "edit":
            keyframes.forEach((kf, index) => {
              const keyframe = targetKeyframes[index];
              applyValues(keyframe, kf.values);
                if (kf.interpolation) {
                  keyframe.interpolation = kf.interpolation;
                }
                if (kf.interpolation === "bezier" && kf.bezier_handles) {
                  // @ts-ignore
                  if (kf.bezier_handles.left_time !== undefined)
                    keyframe.bezier_left_time = toArrayVector3(kf.bezier_handles.left_time);
                  // @ts-ignore
                  if (kf.bezier_handles.left_value)
                    keyframe.bezier_left_value = toArrayVector3(kf.bezier_handles.left_value);
                  // @ts-ignore
                  if (kf.bezier_handles.right_time !== undefined)
                    keyframe.bezier_right_time = toArrayVector3(kf.bezier_handles.right_time);
                  // @ts-ignore
                  if (kf.bezier_handles.right_value)
                    keyframe.bezier_right_value = toArrayVector3(kf.bezier_handles.right_value);
                }
            });
            affectedKeyframes = targetKeyframes.map(keyframeContinuationState);
            break;
        }

        Undo.finishEdit(`${action} keyframes`);
      } catch (error) {
        Undo.cancelEdit(true);
        Animator.preview();
        updateKeyframeSelection();
        throw error;
      }

      Animator.preview();
      return buildResult(affectedKeyframes, createCasualties.length);
    },
  },
  animationToolDocs[1].status
);

createTool(
  animationToolDocs[2].name,
  {
    ...animationToolDocs[2],
    parameters: animationGraphEditorParameters,
    async execute({
      animation_id,
      bone_name,
      channel,
      axis,
      action,
      keyframe_range,
      custom_curve,
    }) {
      const animation = resolveAnimation(animation_id);
      const group = resolveRigGroup(bone_name);

      const animator = animation.animators[group.uuid];
      if (!animator || !animator[channel]?.length) {
        throw new Error(`No keyframes found for ${group.name}.${channel}`);
      }
      if (action === "custom") {
        if (!custom_curve) {
          throw new Error("custom_curve is required for 'custom' action.");
        }
        if (custom_curve.control_point_1[0] > 0) {
          throw new Error(
            "custom_curve.control_point_1 is the left Bezier handle and its time offset must be <= 0."
          );
        }
        if (custom_curve.control_point_2[0] < 0) {
          throw new Error(
            "custom_curve.control_point_2 is the right Bezier handle and its time offset must be >= 0."
          );
        }
      }

      const keyframes = (animator[channel] as _Keyframe[]).filter((kf: _Keyframe) => {
        if (!keyframe_range) return true;
        return kf.time >= keyframe_range.start && kf.time <= keyframe_range.end;
      });
      if (!keyframes.length) {
        throw new Error(`No keyframes found for ${group.name}.${channel} in the requested range.`);
      }

      const axisIndexes =
        axis === "all"
          ? [0, 1, 2]
          : [axis === "x" ? 0 : axis === "y" ? 1 : 2];
      const setBezierComponents = (
        keyframe: _Keyframe,
        property:
          | "bezier_left_time"
          | "bezier_left_value"
          | "bezier_right_time"
          | "bezier_right_value",
        value: number
      ) => {
        const handle = keyframe[property] as number[];
        axisIndexes.forEach((axisIndex) => {
          handle[axisIndex] = value;
        });
      };

      Undo.initEdit({
        animations: [animation],
      });

      try {
        keyframes.forEach((kf: _Keyframe, index: number) => {
          switch (action) {
            case "linear":
              kf.interpolation = "linear";
              break;

            case "stepped":
              kf.interpolation = "step";
              break;

            case "smooth":
              kf.interpolation = "catmullrom";
              break;

            case "ease_in":
            case "ease_out":
            case "ease_in_out": {
              kf.interpolation = "bezier";
              const next = keyframes[index + 1];
              if (!next) break;

              const duration = next.time - kf.time;
              setBezierComponents(kf, "bezier_left_time", 0);
              setBezierComponents(kf, "bezier_right_time", duration);

              if (action === "ease_in") {
                setBezierComponents(
                  kf,
                  "bezier_right_time",
                  duration * 0.6
                );
              } else if (action === "ease_out") {
                setBezierComponents(
                  kf,
                  "bezier_left_time",
                  -duration * 0.4
                );
              } else {
                setBezierComponents(
                  kf,
                  "bezier_left_time",
                  -duration * 0.3
                );
                setBezierComponents(
                  kf,
                  "bezier_right_time",
                  duration * 0.7
                );
              }
              break;
            }

            case "custom":
              kf.interpolation = "bezier";
              setBezierComponents(
                kf,
                "bezier_left_time",
                custom_curve!.control_point_1[0]
              );
              setBezierComponents(
                kf,
                "bezier_left_value",
                custom_curve!.control_point_1[1]
              );
              setBezierComponents(
                kf,
                "bezier_right_time",
                custom_curve!.control_point_2[0]
              );
              setBezierComponents(
                kf,
                "bezier_right_value",
                custom_curve!.control_point_2[1]
              );
              break;
          }
        });

        Undo.finishEdit("Modify animation curves");
      } catch (error) {
        Undo.cancelEdit(true);
        Animator.preview();
        updateKeyframeSelection();
        throw error;
      }

      Animator.preview();
      updateKeyframeSelection();

      return `Applied ${action} curve to ${keyframes.length} keyframes in ${bone_name}.${channel}`;
    },
  },
  animationToolDocs[2].status
);

registerBoneRiggingTool();

createTool(
  animationToolDocs[4].name,
  {
    ...animationToolDocs[4],
    parameters: animationTimelineParameters,
    async execute({ animation_id, action, time, length, fps, loop_mode, range, molang, bone_ids, easing }) {
      const animation = resolveAnimation(animation_id);
      const timelineGroups = bone_ids?.map(resolveRigGroup);
      // Timeline is native global state. Resolve explicit identity before changing
      // selection; never let a different selected clip absorb the request.
      const timelineAction = ["select", "play", "pause", "stop", "set_time", "select_range", "expand_bones", "collapse_bones"].includes(action);
      if (timelineAction && AnimationItem.selected !== animation) {
        Timeline.pause();
        animation.select();
        if (AnimationItem.selected !== animation) {
          throw new Error(`Could not select animation "${animation.name}".`);
        }
      }
      const animationMolang = animation as _Animation & {
        anim_time_update?: string;
        blend_weight?: string;
      };

      const runPersistentAnimationEdit = (
        label: string,
        mutate: () => void
      ) => {
        Undo.initEdit({ animations: [animation] });
        try {
          mutate();
          Undo.finishEdit(label);
        } catch (error) {
          Undo.cancelEdit(true);
          Animator.preview();
          throw error;
        }
      };

      let result = "";

      switch (action) {
        case "set_easing": {
          if (typeof Format === "undefined" || Format.id !== "bedrock") {
            throw new Error("Easings supports only Minecraft Bedrock Entity (bedrock) projects.");
          }
          const previous = animationMolang.anim_time_update || "";
          if (previous && !easing!.replace_existing) {
            throw new Error("Animation already has anim_time_update; set replace_existing=true to replace it.");
          }
          const expression=buildAnimationEasing(animation.uuid,animation.length,animation.loop,easing!);
          if(expression===previous)throw new Error("Easing would not change this animation.");
          runPersistentAnimationEdit("Set whole-clip easing",()=>animation.extend({anim_time_update:expression}));
          Animator.preview();
          return {
            content:[{type:"text" as const,text:"Applied whole-clip easing. Reapply after changing length or loop mode."}],
            structuredContent:{action,animation_id:animation.uuid,anim_time_update:expression,previous_anim_time_update:previous||null,scope:"whole_clip_time"},
          };
        }
        case "expand_bones":
        case "collapse_bones": {
          const ids = new Set<string>();
          const visit = (group: Group) => {
            if (ids.has(group.uuid)) return;
            ids.add(group.uuid);
            group.children.forEach(child => { if (child instanceof Group) visit(child); });
          };
          timelineGroups!.forEach(visit);
          if (action === "expand_bones") {
            Object.values(animation.animators).forEach(animator => {
              if (ids.has(animator.uuid) && animator.keyframes.length) animator.addToTimeline();
            });
          } else {
            for (let i = Timeline.animators.length - 1; i >= 0; i--) {
              if (ids.has(Timeline.animators[i].uuid)) Timeline.animators.splice(i, 1);
            }
          }
          updateKeyframeSelection();
          return {
            content:[{type:"text" as const,text:`${action}: updated timeline visibility for ${ids.size} bone(s).`}],
            structuredContent:{action,bone_ids:[...ids],visible_animator_ids:Timeline.animators.map(a=>a.uuid),scope:"timeline_view_only"},
          };
        }
        case "select":
          result = `Selected animation "${animation.name}"`;
          break;
        case "play":
          Timeline.start();
          result = "Started animation playback";
          break;

        case "pause":
          Timeline.pause();
          result = "Paused animation playback";
          break;

        case "stop":
          Timeline.setTime(0);
          Timeline.pause();
          result = "Stopped animation playback";
          break;

        case "set_time":
          if (time === undefined) {
            throw new Error("Time parameter required for set_time action.");
          }
          Timeline.setTime(time);
          result = `Set timeline to ${time} seconds`;
          break;

        case "set_length":
          if (length === undefined) {
            throw new Error("Length parameter required for set_length action.");
          }
          runPersistentAnimationEdit("Change animation length", () => {
            animation.setLength(length);
          });
          result = `Set animation length to ${animation.length} seconds`;
          break;

        case "set_fps":
          if (fps === undefined) {
            throw new Error("FPS parameter required for set_fps action.");
          }
          runPersistentAnimationEdit("Change animation snapping", () => {
            animation.extend({ snapping: fps });
          });
          Timeline.setTimecode(Timeline.time);
          result = `Set animation FPS to ${animation.snapping}`;
          break;

        case "loop":
          if (loop_mode === undefined) {
            throw new Error("Loop mode parameter required for loop action.");
          }
          if (loop_mode !== animation.loop) {
            runPersistentAnimationEdit("Change animation loop mode", () => {
              animation.setLoop(loop_mode, false);
            });
          }
          result = `Set loop mode to ${animation.loop}`;
          break;

        case "set_anim_time_update":
        case "set_blend_weight": {
          if (molang === undefined) {
            throw new Error(`${action} requires molang; use null to clear.`);
          }
          const property =
            action === "set_anim_time_update"
              ? "anim_time_update"
              : "blend_weight";
          const nextValue = normalizeAnimationMolangProperty(molang);
          const currentValue = normalizeAnimationMolangProperty(
            animationMolang[property]
              ? String(animationMolang[property])
              : null
          );
          if (nextValue === currentValue) {
            throw new Error(
              `${action} would not change animation "${animation.name}".`
            );
          }
          runPersistentAnimationEdit(`Change animation ${property}`, () => {
            animation.extend({ [property]: nextValue });
          });
          const propertyResult = {
            action,
            animation: {
              uuid: animation.uuid,
              name: animation.name,
              anim_time_update: animationMolang.anim_time_update || null,
              blend_weight: animationMolang.blend_weight || null,
            },
          };
          Animator.preview();
          return {
            content: [
              {
                type: "text" as const,
                text: `Updated ${property} for animation "${animation.name}".`,
              },
            ],
            structuredContent: propertyResult,
          };
        }

        case "select_range":
          if (!range) {
            throw new Error(
              "Range parameter required for select_range action."
            );
          }
          (Timeline.keyframes as _Keyframe[])
            .filter((kf) => keyframeBelongsToAnimation(kf, animation))
            .forEach((kf) => {
              if (kf.time >= range.start && kf.time <= range.end) {
                kf.select();
              } else {
                kf.selected = false;
              }
            });
          result = `Selected keyframes between ${range.start} and ${range.end} seconds`;
          break;
      }

      Animator.preview();

      return {
        content: [{ type: "text" as const, text: result }],
        structuredContent: {
          action,
          animation: { uuid: animation.uuid, name: animation.name },
          timeline_time: Timeline.time,
        },
      };
    },
  },
  animationToolDocs[4].status
);

createTool(
  animationToolDocs[5].name,
  {
    ...animationToolDocs[5],
    parameters: batchKeyframeOperationsParameters,
    async execute({ selection, range, pattern, operation, parameters = {} }) {
      const animation = resolveAnimation();
      const targetTimelineKeyframes = Object.values(animation.animators).flatMap(animator => animator.keyframes).filter(
        (kf) => keyframeBelongsToAnimation(kf, animation)
      );
      const targetSelectedKeyframes = (Timeline.selected as _Keyframe[]).filter(
        (kf) => keyframeBelongsToAnimation(kf, animation)
      );

      let keyframes: _Keyframe[] = [];

      switch (selection) {
        case "all":
          keyframes = targetTimelineKeyframes;
          break;

        case "selected":
          keyframes = targetSelectedKeyframes;
          break;

        case "range":
          if (!range) {
            throw new Error("Range required for range selection.");
          }
          keyframes = targetTimelineKeyframes.filter(
            (kf) => kf.time >= range.start && kf.time <= range.end
          );
          break;

        case "pattern":
          if (!pattern) {
            throw new Error("Pattern required for pattern selection.");
          }
          keyframes = targetTimelineKeyframes.filter((kf) => {
            const relativeTime = kf.time - pattern.offset;
            return Math.abs(relativeTime % pattern.interval) < 0.001;
          });
          break;
      }

      if (keyframes.length === 0) {
        throw new Error("No keyframes found matching selection criteria.");
      }

      if (operation === "mirror" && !parameters.mirror_axis) {
        throw new Error("Mirror axis required for mirror operation.");
      }

      if (operation === "offset" || operation === "mirror") {
        const movesTime =
          operation === "offset" && (parameters.offset_time ?? 0) !== 0;
        const replacedKeyframes: _Keyframe[] = [];
        const mirrorKeyframes =
          operation === "mirror"
            ? keyframes.filter(
                (kf: _Keyframe) => kf.transform && kf.channel !== "scale"
              )
            : [];
        if (operation === "mirror" && mirrorKeyframes.length === 0) {
          throw new Error(
            "No position or rotation transform keyframes found matching selection criteria for mirror."
          );
        }
        if (operation === "offset" && parameters.offset_time !== undefined) {
          requireValidPlannedKeyframeTimes(
            keyframes.map(
              (keyframe: _Keyframe) => keyframe.time + parameters.offset_time!
            ),
            "Batch keyframe offset"
          );
        }

        Undo.initEdit({
          keyframes: operation === "mirror" ? mirrorKeyframes : keyframes,
        });

        try {
          if (operation === "offset") {
            keyframes.forEach((kf: _Keyframe) => {
              if (parameters.offset_time !== undefined) {
                kf.time += parameters.offset_time;
              }

              if (parameters.offset_values && kf.transform) {
                const [offsetX, offsetY, offsetZ] = parameters.offset_values;
                const offsetsMatch = offsetX === offsetY && offsetX === offsetZ;

                if (kf.uniform && !offsetsMatch) {
                  kf.uniform = false;
                }

                if (kf.uniform) {
                  kf.offset("x", offsetX);
                } else {
                  kf.offset("x", offsetX);
                  kf.offset("y", offsetY);
                  kf.offset("z", offsetZ);
                }
              }
            });

            if (movesTime) {
              keyframes.forEach((kf: _Keyframe) => {
                kf.replaceOthers(replacedKeyframes);
              });
              Undo.addKeyframeCasualties(replacedKeyframes);
              animation.setLength();
            }
          } else {
            const mirrorAxis = parameters.mirror_axis!;
            const mirrorAxisIndex =
              mirrorAxis === "x" ? 0 : mirrorAxis === "y" ? 1 : 2;
            mirrorKeyframes.forEach((kf: _Keyframe) => {
              // blockbench-types@5.1.0 declares axisLetter, while the runtime Keyframe.flip contract uses numeric indexes.
              // @ts-expect-error Runtime Blockbench expects 0|1|2 here.
              kf.flip(mirrorAxisIndex);
            });
          }

          Undo.finishEdit(`Batch keyframe operation: ${operation}`);
        } catch (error) {
          Undo.cancelEdit(true);
          Animator.preview();
          updateKeyframeSelection();
          throw error;
        }

        Animator.preview();
        if (operation === "offset") {
          const result = {
            operation,
            source_keyframes: keyframes.length,
            overwritten_keyframes: replacedKeyframes.length,
          };
          return {
            content: [
              {
                type: "text" as const,
                text: `Offset updated ${keyframes.length} keyframe(s) and overwrote ${replacedKeyframes.length} existing keyframe(s).`,
              },
            ],
            structuredContent: result,
          };
        }
        return `Mirrored ${mirrorKeyframes.length} transform keyframe(s) across ${parameters.mirror_axis} axis`;
      }

      if (operation === "bake") {
        const interval =
          parameters.bake_interval ?? 1 / animation.snapping;
        if (!Number.isFinite(interval) || interval <= 0) {
          throw new Error(
            "Bake interval must be a finite number greater than 0."
          );
        }

        const originalTimelineTime = Timeline.time;
        const animators = new Set(keyframes.map((kf) => kf.animator));
        const bakeSamples: Array<{
          animator: any;
          channel: string;
          time: number;
          values: any[];
        }> = [];
        let editStarted = false;

        try {
          animators.forEach((animator: any) => {
            const channels = ["rotation", "position", "scale"];
            channels.forEach((channel) => {
              const channelKfs = animator[channel];
              const selectedKfs = keyframes.filter((kf) => kf.animator === animator && kf.channel === channel);
              if (!channelKfs || selectedKfs.length < 2) return;

              const startTime = Math.min(...selectedKfs.map((kf: _Keyframe) => kf.time));
              const endTime = Math.max(...selectedKfs.map((kf: _Keyframe) => kf.time));

              for (let time = startTime; time <= endTime; time += interval) {
                const targetTime = Timeline.snapTime(time, animation);
                if (targetTime < startTime || targetTime > endTime) continue;
                const alreadyExists = channelKfs.some(
                  (kf: _Keyframe) => Math.abs(kf.time - targetTime) < 0.001
                );
                const alreadyPlanned = bakeSamples.some(
                  (sample) =>
                    sample.animator === animator &&
                    sample.channel === channel &&
                    Math.abs(sample.time - targetTime) < 0.001
                );
                if (alreadyExists || alreadyPlanned) continue;

                Timeline.time = targetTime;
                const values = animator.interpolate(channel, true);
                if (!Array.isArray(values) || values.length < 3 ||
                    !values.slice(0, 3).every((value: unknown) => typeof value === "number" && Number.isFinite(value))) {
                  throw new Error(
                    `Could not sample ${channel} values while baking animation.`
                  );
                }
                bakeSamples.push({
                  animator,
                  channel,
                  time: targetTime,
                  values: [...values],
                });
              }
            });
          });

          Timeline.time = originalTimelineTime;

          if (bakeSamples.length) {
            Undo.initEdit({
              animations: [animation],
            });
            editStarted = true;

            bakeSamples.forEach((sample) => {
              const keyframe = sample.animator.addKeyframe({
                channel: sample.channel,
                time: sample.time,
                interpolation: "linear",
                data_points: [
                  {
                    x: sample.values[0],
                    y: sample.values[1],
                    z: sample.values[2],
                  },
                ],
              });
              if (!keyframe) {
                throw new Error(
                  `Channel "${sample.channel}" is unavailable while baking animation.`
                );
              }
            });

            animation.setLength();
            Undo.finishEdit("Batch keyframe operation: bake");
            editStarted = false;
          }
        } catch (error) {
          if (editStarted) {
            Undo.cancelEdit(true);
          }
          throw error;
        } finally {
          Timeline.time = originalTimelineTime;
          Animator.preview();
          updateKeyframeSelection();
        }

        const result = {
          operation,
          source_keyframes: keyframes.length,
          created_keyframes: bakeSamples.length,
        };
        return {
          content: [
            {
              type: "text" as const,
              text: `Bake used ${keyframes.length} source keyframe(s) and created ${bakeSamples.length} new keyframe(s).`,
            },
          ],
          structuredContent: result,
        };
      }

      if (operation === "scale") {
        const pivot = parameters.scale_pivot ?? 0;
        const factor = parameters.scale_factor ?? 1;
        if (!Number.isFinite(pivot)) {
          throw new Error("Scale pivot must be a finite number.");
        }
        if (!Number.isFinite(factor)) {
          throw new Error("Scale factor must be a finite number.");
        }

        const stretchStates = keyframes.map((keyframe: _Keyframe) => ({
          keyframe,
          time: keyframe.time,
          bezierLeftTime:
            keyframe.interpolation === "bezier"
              ? [...keyframe.bezier_left_time]
              : undefined,
          bezierRightTime:
            keyframe.interpolation === "bezier"
              ? [...keyframe.bezier_right_time]
              : undefined,
        }));
        const plannedTimes = stretchStates.map(({ time }) =>
          Timeline.snapTime(pivot + (time - pivot) * factor, animation)
        );
        requireValidPlannedKeyframeTimes(
          plannedTimes,
          "Batch keyframe scale",
          true
        );
        const replacedKeyframes: _Keyframe[] = [];

        Undo.initEdit({
          animations: [animation],
        });

        try {
          stretchStates.forEach(
            ({ keyframe, bezierLeftTime, bezierRightTime }, index) => {
              keyframe.time = plannedTimes[index];

              if (bezierLeftTime && bezierRightTime) {
                for (let axisIndex = 0; axisIndex < 3; axisIndex++) {
                  keyframe.bezier_left_time[axisIndex] =
                    bezierLeftTime[axisIndex] * factor;
                  keyframe.bezier_right_time[axisIndex] =
                    bezierRightTime[axisIndex] * factor;
                }
              }
            }
          );

          stretchStates.forEach(({ keyframe }) => {
            keyframe.replaceOthers(replacedKeyframes);
          });

          animation.setLength();
          Undo.finishEdit("Batch keyframe operation: scale");
        } catch (error) {
          Undo.cancelEdit(true);
          Animator.preview();
          updateKeyframeSelection();
          throw error;
        }

        Animator.preview();
        updateKeyframeSelection();
        const result = {
          operation,
          source_keyframes: keyframes.length,
          overwritten_keyframes: replacedKeyframes.length,
        };
        return {
          content: [
            {
              type: "text" as const,
              text: `Scale moved ${keyframes.length} keyframe(s) and overwrote ${replacedKeyframes.length} existing keyframe(s).`,
            },
          ],
          structuredContent: result,
        };
      }

      if (operation === "reverse") {
        const times = keyframes.map((kf: _Keyframe) => kf.time);
        const startTime = Math.min(...times);
        const endTime = Math.max(...times);

        Undo.initEdit({
          keyframes,
        });

        try {
          keyframes.forEach((kf: _Keyframe) => {
            kf.time = endTime + startTime - kf.time;

            if (kf.transform && kf.data_points.length > 1) {
              kf.data_points.reverse();
            }

            if (kf.interpolation === "bezier") {
              const rightTime = [...kf.bezier_right_time];
              const rightValue = [...kf.bezier_right_value];
              const leftTime = [...kf.bezier_left_time];
              const leftValue = [...kf.bezier_left_value];

              for (let axisIndex = 0; axisIndex < 3; axisIndex++) {
                kf.bezier_right_time[axisIndex] = -leftTime[axisIndex];
                kf.bezier_right_value[axisIndex] = leftValue[axisIndex];
                kf.bezier_left_time[axisIndex] = -rightTime[axisIndex];
                kf.bezier_left_value[axisIndex] = rightValue[axisIndex];
              }
            }
          });

          Undo.finishEdit("Batch keyframe operation: reverse");
        } catch (error) {
          Undo.cancelEdit(true);
          Animator.preview();
          updateKeyframeSelection();
          throw error;
        }

        Animator.preview();
        updateKeyframeSelection();
        return `Performed ${operation} on ${keyframes.length} keyframes`;
      }

      if (operation === "smooth") {
        const transformKeyframes = keyframes.filter(
          (kf: _Keyframe) => kf.transform
        );
        if (!transformKeyframes.length) {
          throw new Error(
            "No transform keyframes found matching selection criteria for smooth."
          );
        }

        Undo.initEdit({
          keyframes: transformKeyframes,
        });

        try {
          transformKeyframes.forEach((kf: _Keyframe) => {
            kf.interpolation = "catmullrom";
          });
          Undo.finishEdit("Batch keyframe operation: smooth");
        } catch (error) {
          Undo.cancelEdit(true);
          Animator.preview();
          updateKeyframeSelection();
          throw error;
        }

        Animator.preview();
        updateKeyframeSelection();
        return `Performed ${operation} on ${transformKeyframes.length} transform keyframes`;
      }

      throw new Error(`Unsupported batch keyframe operation: ${operation}`);
    },
  },
  animationToolDocs[5].status
);

createTool(
  animationToolDocs[6].name,
  {
    ...animationToolDocs[6],
    parameters: animationCopyPasteParameters,
    async execute({ action, source, target }) {
      // @ts-ignore
      if (!global.animationClipboard) {
        // @ts-ignore
        global.animationClipboard = null;
      }

      switch (action) {
        case "copy": {
          if (!source) {
            throw new Error("Source data required for copy operation.");
          }

          const srcAnimation = resolveAnimation(source.animation);
          const srcBone = resolveRigGroup(source.bone);

          const animator = srcAnimation.animators[srcBone.uuid];
          if (!animator) {
            throw new Error(`No animation data for bone "${source.bone}".`);
          }

          const copiedData: any = {
            bone_name: source.bone,
            channels: {},
          };

          source.channels.forEach((channel) => {
            if (!animator[channel]) return;

            let keyframes = animator[channel] as _Keyframe[];
            const timeRange = source.time_range;
            if (timeRange) {
              keyframes = keyframes.filter(
                (kf: _Keyframe) =>
                  kf.time >= timeRange.start &&
                  kf.time <= timeRange.end
              );
            }

            copiedData.channels[channel] = keyframes.map((kf: _Keyframe) => ({
              time: kf.time,
              data_points: kf.data_points.map((_, dataPointIndex) => {
                const [x, y, z] = kf.getArray(dataPointIndex);
                return { x, y, z };
              }),
              interpolation: kf.interpolation,
              ...(channel === "scale" ? { uniform: kf.uniform === true } : {}),
              ...(kf.interpolation === "bezier"
                ? { bezier_linked: kf.bezier_linked === true }
                : {}),
              // @ts-ignore
              bezier_left_time: toArrayVector3(kf.bezier_left_time),
              // @ts-ignore
              bezier_left_value: toArrayVector3(kf.bezier_left_value),
              // @ts-ignore
              bezier_right_time: toArrayVector3(kf.bezier_right_time),
              // @ts-ignore
              bezier_right_value: toArrayVector3(kf.bezier_right_value),
            }));
          });

          const copiedKeyframeCount = countAnimationClipboardKeyframes(
            copiedData.channels
          );
          if (copiedKeyframeCount === 0) {
            throw new Error(
              `No keyframes matched the requested channels/time range for "${source.bone}". Clipboard was not changed.`
            );
          }

          // @ts-ignore
          global.animationClipboard = copiedData;

          return `Copied animation data from "${source.bone}" (${Object.keys(
            copiedData.channels
          ).join(", ")})`;
        }

        case "paste":
        case "mirror_paste": {
          if (!target) {
            throw new Error("Target data required for paste operation.");
          }

          // @ts-ignore
          if (!global.animationClipboard) {
            throw new Error("No animation data in clipboard. Copy first.");
          }

          const tgtAnimation = resolveAnimation(target.animation);
          const tgtBone = resolveRigGroup(target.bone);
          const existingAnimator = tgtAnimation.animators[tgtBone.uuid] as BoneAnimator | undefined;

          // @ts-ignore
          const clipboardData = global.animationClipboard;
          const pastedKeyframeCount = countAnimationClipboardKeyframes(
            clipboardData.channels
          );
          if (pastedKeyframeCount === 0) {
            throw new Error(
              "Animation clipboard contains no keyframe data. Copy a non-empty animation range first."
            );
          }
          const mirrorAxis =
            action === "mirror_paste" ? target.mirror_axis! : null;
          const mirrorAxisIndex = mirrorAxis === "x" ? 0 : mirrorAxis === "y" ? 1 : mirrorAxis === "z" ? 2 : null;
          const timeOffset = target.time_offset ?? 0;
          const plannedPasteTimesByChannel = Object.fromEntries(
            Object.entries(
              clipboardData.channels as Record<string, Array<{ time: number }>>
            ).map(([channel, channelKeyframes]) => [
              channel,
              channelKeyframes.map((keyframe) =>
                Timeline.snapTime(keyframe.time + timeOffset, tgtAnimation)
              ),
            ])
          ) as Record<string, number[]>;
          requireValidPlannedPasteChannelTimes(plannedPasteTimesByChannel);
          const replacedKeyframes: _Keyframe[] = [];

          Undo.initEdit({
            animations: [tgtAnimation],
          });

          try {
            let animator = existingAnimator;
            if (!animator) {
              const createdAnimator = tgtAnimation.getBoneAnimator(tgtBone);
              if (!createdAnimator) {
                throw new Error(
                  `Cannot paste animation data into Group "${tgtBone.name}" in animation "${tgtAnimation.name}".`
                );
              }
              animator = createdAnimator;
            }

            Object.entries(clipboardData.channels as Record<string, any[]>).forEach(
              ([channel, keyframes]: [string, any[]]) => {
                keyframes.forEach((kfData, index) => {
                  const dataPoints = kfData.data_points.map(
                    (point: { x: number | string; y: number | string; z: number | string }) => ({
                      x: point.x,
                      y: point.y,
                      z: point.z,
                    })
                  );
                  const targetTime = plannedPasteTimesByChannel[channel][index];

                  const keyframe = animator!.addKeyframe({
                    channel,
                    data_points: dataPoints,
                    time: targetTime,
                    interpolation: kfData.interpolation,
                    ...(channel === "scale" &&
                    typeof kfData.uniform === "boolean"
                      ? { uniform: kfData.uniform }
                      : {}),
                    ...(kfData.interpolation === "bezier" &&
                    typeof kfData.bezier_linked === "boolean"
                      ? { bezier_linked: kfData.bezier_linked }
                      : {}),
                  });
                  if (!keyframe) {
                    throw new Error(
                      `Channel "${channel}" is unavailable for ${tgtBone.name}.`
                    );
                  }
                  keyframe.replaceOthers(replacedKeyframes);

                  if (kfData.interpolation === "bezier") {
                    // @ts-ignore
                    if (kfData.bezier_left_time !== undefined)
                      keyframe.bezier_left_time = [...kfData.bezier_left_time] as ArrayVector3;
                    // @ts-ignore
                    if (kfData.bezier_left_value)
                      keyframe.bezier_left_value = [...kfData.bezier_left_value] as ArrayVector3;
                    // @ts-ignore
                    if (kfData.bezier_right_time !== undefined)
                      keyframe.bezier_right_time = [...kfData.bezier_right_time] as ArrayVector3;
                    // @ts-ignore
                    if (kfData.bezier_right_value)
                      keyframe.bezier_right_value = [...kfData.bezier_right_value] as ArrayVector3;
                  }

                  if (mirrorAxisIndex !== null) {
                    // blockbench-types@5.1.0 declares axisLetter, while the runtime Keyframe.flip contract uses numeric indexes.
                    // @ts-expect-error Runtime Blockbench expects 0|1|2 here.
                    keyframe.flip(mirrorAxisIndex);
                  }
                });
              }
            );

            tgtAnimation.setLength();
            Undo.finishEdit(`${action} animation data`);
          } catch (error) {
            Undo.cancelEdit(true);
            Animator.preview();
            updateKeyframeSelection();
            throw error;
          }

          Animator.preview();

          const result = {
            action,
            pasted_keyframes: pastedKeyframeCount,
            overwritten_keyframes: replacedKeyframes.length,
          };
          return {
            content: [
              {
                type: "text" as const,
                text: `${action === "mirror_paste" ? "Mirrored paste" : "Paste"} wrote ${pastedKeyframeCount} keyframe(s) to "${tgtBone.name}" and overwrote ${replacedKeyframes.length} existing keyframe(s).`,
              },
            ],
            structuredContent: result,
          };
        }
      }
    },
  },
  animationToolDocs[6].status
);
}
