/// <reference types="blockbench-types" />

import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL } from "@/lib/constants";
import { animationEasingSchema, buildAnimationEasing } from "@/lib/animationEasing";
import {
  animationIdOptionalSchema,
  loopModeEnum,
} from "@/lib/zodObjects";
import {
  resolveAnimationClip,
  resolveAnimationRigGroup,
} from "./animation-shared";

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


export const animationTimelineToolDoc: ToolSpec = {
  name: "animation_timeline",
  description:
    "Controls the explicit animation_id (or current clip when omitted). select/playback/time actions select that clip; property edits target it without changing selection. Returns affected UUID.",
  annotations: {
    title: "Animation Timeline",
    destructiveHint: true,
  },
  parameters: animationTimelineParameters,
  status: STATUS_EXPERIMENTAL,
};

export function normalizeAnimationMolangProperty(value: string | null): string {
  return value === null ? "" : value.trim().replace(/\n/g, "");
}

export function registerAnimationTimelineTool(): void {
  createTool(
    animationTimelineToolDoc.name,
    {
      ...animationTimelineToolDoc,
      parameters: animationTimelineParameters,
      async execute({ animation_id, action, time, length, fps, loop_mode, range, molang, bone_ids, easing }) {
        const animation = resolveAnimationClip(animation_id);
        const timelineGroups = bone_ids?.map(resolveAnimationRigGroup);
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
    animationTimelineToolDoc.status
  );
}
