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
  expect(result.lockstep_rotation_cohort_count).toBe(1);
  expect(result.lockstep_rotation_examples[0].bone_count).toBe(4);
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
  expect(result.dense_track_count).toBe(1);
  expect(result.state).toBe("available");
  expect(result.note).toContain("review hints only");
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
  expect(result.lockstep_rotation_cohort_count).toBe(0);
  expect(result.dense_track_count).toBe(0);
});
