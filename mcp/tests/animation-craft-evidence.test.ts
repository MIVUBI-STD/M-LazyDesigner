import { expect, test } from "bun:test";
import { analyzeAnimationCraftEvidence } from "@/lib/animationCraftEvidence";

test("lockstep multi-bone rotation timing is surfaced as review evidence", () => {
  const tracks = ["body", "head", "arm", "forearm"].map((name) => ({
    group_uuid: name,
    group_name: name,
    channel: "rotation" as const,
    keyframe_times: [0, 0.25, 0.5, 0.75, 1],
  }));
  const result = analyzeAnimationCraftEvidence({ length: 1, tracks });
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected available animation craft evidence");
  expect(result.lockstep_rotation_cohort_count).toBe(1);
  expect(result.lockstep_rotation_examples[0]?.bone_count).toBe(4);
  expect(result.visual_verdict).toBe("not_evaluated");
});

test("dense sampling is flagged without being called a motion failure", () => {
  const result = analyzeAnimationCraftEvidence({
    length: 0.5,
    tracks: [{
      group_uuid: "arm",
      group_name: "arm",
      channel: "rotation",
      keyframe_times: Array.from({ length: 10 }, (_, index) => index * 0.05),
    }],
  });
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected available animation craft evidence");
  expect(result.dense_track_count).toBe(1);
  expect(result.note).toContain("craft evidence only");
});

test("sparse staggered tracks remain free of lockstep cohort evidence", () => {
  const result = analyzeAnimationCraftEvidence({
    length: 1,
    tracks: [
      { group_uuid: "body", group_name: "body", channel: "rotation", keyframe_times: [0, 0.35, 0.7, 1] },
      { group_uuid: "head", group_name: "head", channel: "rotation", keyframe_times: [0.05, 0.4, 0.75, 1] },
      { group_uuid: "arm", group_name: "arm", channel: "rotation", keyframe_times: [0.02, 0.3, 0.68, 0.95] },
    ],
  });
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected available animation craft evidence");
  expect(result.lockstep_rotation_cohort_count).toBe(0);
  expect(result.dense_track_count).toBe(0);
});

test("numeric motion shape exposes staggered onset without turning it into a verdict", () => {
  const result = analyzeAnimationCraftEvidence({
    length: 1,
    tracks: [
      {
        group_uuid: "body",
        group_name: "body",
        channel: "rotation",
        keyframes: [
          { time: 0, value: [0, 0, 0] },
          { time: 0.2, value: [0, 0, 0] },
          { time: 0.5, value: [0, 15, 0] },
          { time: 1, value: [0, 20, 0] },
        ],
      },
      {
        group_uuid: "arm",
        group_name: "arm",
        channel: "rotation",
        keyframes: [
          { time: 0, value: [0, 0, 0] },
          { time: 0.4, value: [0, 0, 0] },
          { time: 0.7, value: [30, 0, 0] },
          { time: 1, value: [35, 0, 0] },
        ],
      },
    ],
  });
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected available animation craft evidence");
  expect(result.numeric_motion_shape_track_count).toBe(2);
  expect(result.phase_onset.earliest_seconds).toBe(0.2);
  expect(result.phase_onset.latest_seconds).toBe(0.4);
  expect(result.phase_onset.spread_seconds).toBe(0.2);
  expect(result.visual_verdict).toBe("not_evaluated");
});

test("direction reversal is exposed as follow-through candidate evidence", () => {
  const result = analyzeAnimationCraftEvidence({
    length: 1,
    tracks: [{
      group_uuid: "hand",
      group_name: "hand",
      channel: "rotation",
      keyframes: [
        { time: 0, value: [0, 0, 0] },
        { time: 0.35, value: [45, 0, 0] },
        { time: 0.6, value: [30, 0, 0] },
        { time: 1, value: [35, 0, 0] },
      ],
    }],
  });
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected available animation craft evidence");
  expect(result.direction_reversal.track_count).toBe(1);
  expect(result.direction_reversal.examples[0]).toMatchObject({
    group_uuid: "hand",
    channel: "rotation",
  });
  expect(result.note).toContain("follow-through");
});

test("speed-shape variability is bounded diagnostic evidence, not an automatic failure", () => {
  const result = analyzeAnimationCraftEvidence({
    length: 1,
    tracks: [{
      group_uuid: "rod",
      group_name: "rod",
      channel: "position",
      keyframes: [
        { time: 0, value: [0, 0, 0] },
        { time: 0.1, value: [10, 0, 0] },
        { time: 0.9, value: [11, 0, 0] },
        { time: 1, value: [21, 0, 0] },
      ],
    }],
  });
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected available animation craft evidence");
  expect(result.speed_shape.high_variability_track_count).toBe(1);
  expect(result.visual_verdict).toBe("not_evaluated");
});
