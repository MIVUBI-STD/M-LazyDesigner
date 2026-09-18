/// <reference types="three" />
/// <reference types="blockbench-types" />

import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL } from "@/lib/constants";
import {
  animationChannelEnum,
  animationIdOptionalSchema,
  axisWithAllEnum,
  boneNameSchema,
  interpolationEnum,
  timeRangeSchema,
} from "@/lib/zodObjects";
import {
  finiteAnimationVector3Schema,
  resolveAnimationClip as resolveAnimation,
  resolveAnimationRigGroup as resolveRigGroup,
  toArrayVector3,
} from "./animation-shared";

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


export const manageKeyframesToolDoc: ToolSpec = {
  name: "manage_keyframes",
  description:
    "Creates, edits, deletes, or selects keyframes for one animation bone and channel. Numeric and authored Molang values are preserved.",
  annotations: {
    title: "Manage Keyframes",
    destructiveHint: true,
  },
  parameters: manageKeyframesParameters,
  status: STATUS_EXPERIMENTAL,
};

export const animationGraphEditorToolDoc: ToolSpec = {
  name: "animation_graph_editor",
  description:
    "Applies a curve/interpolation edit to one animation bone channel.",
  annotations: {
    title: "Animation Graph Editor",
    destructiveHint: true,
  },
  parameters: animationGraphEditorParameters,
  status: STATUS_EXPERIMENTAL,
};

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

export function registerAnimationKeyframeTools(): void {
  createTool(
    manageKeyframesToolDoc.name,
    {
      ...manageKeyframesToolDoc,
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
    manageKeyframesToolDoc.status
  );

  createTool(
    animationGraphEditorToolDoc.name,
    {
      ...animationGraphEditorToolDoc,
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
    animationGraphEditorToolDoc.status
  );
}
