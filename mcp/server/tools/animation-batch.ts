/// <reference types="three" />
/// <reference types="blockbench-types" />

import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL } from "@/lib/constants";
import {
  animationChannelEnum,
  axisEnum,
  timeRangeSchema,
} from "@/lib/zodObjects";
import {
  finiteAnimationVector3Schema,
  resolveAnimationClip as resolveAnimation,
  resolveAnimationRigGroup as resolveRigGroup,
  toArrayVector3,
} from "./animation-shared";

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


export const batchKeyframeOperationsToolDoc: ToolSpec = {
  name: "batch_keyframe_operations",
  description:
    "Applies one bounded batch operation to selected, ranged, patterned, or all keyframes.",
  annotations: {
    title: "Batch Keyframe Operations",
    destructiveHint: true,
  },
  parameters: batchKeyframeOperationsParameters,
  status: STATUS_EXPERIMENTAL,
};

export const animationCopyPasteToolDoc: ToolSpec = {
  name: "animation_copy_paste",
  description:
    "Copies, pastes, or mirrors keyframes between animation bones. Copy/paste targets must be explicit; mirror_paste requires an axis.",
  annotations: {
    title: "Animation Copy/Paste",
    destructiveHint: true,
  },
  parameters: animationCopyPasteParameters,
  status: STATUS_EXPERIMENTAL,
};

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

export function registerAnimationBatchTools(): void {
  createTool(
    batchKeyframeOperationsToolDoc.name,
    {
      ...batchKeyframeOperationsToolDoc,
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
    batchKeyframeOperationsToolDoc.status
  );

  createTool(
    animationCopyPasteToolDoc.name,
    {
      ...animationCopyPasteToolDoc,
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
    animationCopyPasteToolDoc.status
  );
}
