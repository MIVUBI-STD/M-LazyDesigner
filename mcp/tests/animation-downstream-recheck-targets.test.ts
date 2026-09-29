import { describe, expect, test } from "bun:test";
import { buildControlDelta } from "@/gateway/control";

describe("animation downstream recheck targets", () => {
  test("keyframe edits carry animation bone channel and time range", () => {
    const delta = buildControlDelta({
      capability: "manage_keyframes",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        action: "edit",
        animation: { uuid: "anim-a", name: "walk" },
        bone: { uuid: "bone-a", name: "arm" },
        channel: "rotation",
        affected_keyframes: [
          { uuid: "kf-1", time: 0.25, interpolation: "linear" },
          { uuid: "kf-2", time: 0.75, interpolation: "linear" },
        ],
      },
    });

    const motion = delta.downstream_recheck.required.find(
      (entry) => entry.scope === "ANIMATION_MOTION"
    );
    expect(motion?.target).toEqual({
      animation_uuid: "anim-a",
      bone_ids: ["bone-a"],
      channel: "rotation",
      time_range: [0.25, 0.75],
    });
  });

  test("graph edit uses the same bounded motion target", () => {
    const delta = buildControlDelta({
      capability: "animation_graph_editor",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        action: "bezier",
        animation: { uuid: "anim-a", name: "walk" },
        bone: { uuid: "bone-a", name: "arm" },
        channel: "position",
        affected_keyframes: [
          { uuid: "kf-1", time: 1, interpolation: "bezier" },
        ],
      },
    });
    const motion = delta.downstream_recheck.required.find(
      (entry) => entry.scope === "ANIMATION_MOTION"
    );
    expect(motion?.target).toEqual({
      animation_uuid: "anim-a",
      bone_ids: ["bone-a"],
      channel: "position",
      time_range: [1, 1],
    });
  });

  test("animation properties target the clip without inventing bone or range", () => {
    const delta = buildControlDelta({
      capability: "manage_animation_timeline",
      branch: { field: "operation", value: "properties" },
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        action: "properties",
        animation: { uuid: "anim-a", name: "walk" },
        changed_fields: ["loop_mode"],
      },
    });
    const motion = delta.downstream_recheck.required.find(
      (entry) => entry.scope === "ANIMATION_MOTION"
    );
    expect(motion?.target).toEqual({ animation_uuid: "anim-a" });
  });

  test("legacy batch receipt without identity remains conservatively unbounded", () => {
    const delta = buildControlDelta({
      capability: "batch_keyframe_operations",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
      result: { operation: "scale", source_keyframes: 4 },
    });
    const motion = delta.downstream_recheck.required.find(
      (entry) => entry.scope === "ANIMATION_MOTION"
    );
    expect(motion?.target).toBeUndefined();
  });
});
