import { describe, expect, test } from "bun:test";
import {
  requireValidPlannedBatchTrackTimes,
  planBatchScaleOverwriteTargets,
  selectBatchKeyframes,
} from "../lib/animation/batchPlanning";

describe("track-aware keyframe batch scale preflight", () => {
  test("different bones may share a snapped keyframe time", () => {
    const a = {}, b = {};
    expect(() => requireValidPlannedBatchTrackTimes(
      [{ animator: a, channel: "rotation" }, { animator: b, channel: "rotation" }],
      [1, 1], "scale"
    )).not.toThrow();
  });
  test("one animator's different channels may share a snapped time", () => {
    const a = {};
    expect(() => requireValidPlannedBatchTrackTimes(
      [{ animator: a, channel: "position" }, { animator: a, channel: "rotation" }],
      [1, 1], "scale"
    )).not.toThrow();
  });
  test("same animator/channel collapsing at the snapped time still refuses", () => {
    const a = {};
    expect(() => requireValidPlannedBatchTrackTimes(
      [{ animator: a, channel: "rotation" }, { animator: a, channel: "rotation" }],
      [1, 1], "scale"
    )).toThrow("collapse multiple selected keyframes");
  });
  test("native near-collisions on one track are rejected before Undo", () => {
    const animator = {};
    const selected = [
      { animator, channel: "rotation" },
      { animator, channel: "rotation" },
    ];
    expect(() => requireValidPlannedBatchTrackTimes(selected, [1, 1.00005], "scale"))
      .toThrow("collapse multiple selected keyframes");
    expect(() => requireValidPlannedBatchTrackTimes(selected, [1, 1.00011], "scale"))
      .not.toThrow();
  });

  test("preflight predicts only unselected casualties on the same track", () => {
    const a = {}, b = {};
    const moving = { animator: a, channel: "rotation", time: 1 };
    const selectedOther = { animator: a, channel: "rotation", time: 2 };
    const victim = { animator: a, channel: "rotation", time: 1.50005 };
    const differentChannel = { animator: a, channel: "position", time: 1.5 };
    const differentBone = { animator: b, channel: "rotation", time: 1.5 };
    expect(planBatchScaleOverwriteTargets(
      [moving, selectedOther],
      [moving, selectedOther, victim, differentChannel, differentBone],
      [1.5, 3]
    )).toEqual([victim]);
  });

  test("overwrite scan reads unrelated animator tracks only once and preserves victim order", () => {
    const animatorA = {}, animatorB = {};
    const selected = Array.from({ length: 10 }, (_, index) => ({
      animator: animatorA, channel: "rotation", time: index / 10,
    }));
    let unrelatedTrackReads = 0;
    const unrelated = Array.from({ length: 250 }, (_, index) => ({
      get animator() {
        unrelatedTrackReads += 1;
        return animatorB;
      },
      channel: "rotation",
      time: index / 10,
    }));
    const first = { animator: animatorA, channel: "rotation", time: 1.50005 };
    const second = { animator: animatorA, channel: "rotation", time: 2.50005 };
    const otherChannel = { animator: animatorA, channel: "position", time: 1.5 };
    const times = selected.map((_, index) =>
      index === 0 ? 1.5 : index === 1 ? 2.5 : 100 + index
    );

    expect(planBatchScaleOverwriteTargets(
      selected, [second, ...unrelated, first, otherChannel, ...selected], times
    )).toEqual([first, second]);
    // The same 250 unrelated keys are not checked separately for each
    // selected keyframe. This is a deterministic read-count bound, not latency.
    expect(unrelatedTrackReads).toBe(250);
  });

  test("invalid and mismatched planned times fail before native edit", () => {
    const keyframes = [{ animator: {}, channel: "rotation" }];
    expect(() => requireValidPlannedBatchTrackTimes(keyframes, [-1], "scale")).toThrow("0..10000");
    expect(() => requireValidPlannedBatchTrackTimes(keyframes, [10001], "scale")).toThrow("0..10000");
    expect(() => requireValidPlannedBatchTrackTimes(keyframes, [1, 2], "scale")).toThrow("mismatched");
  });
  test("unknown animator/channel is never silently grouped", () => {
    expect(() => requireValidPlannedBatchTrackTimes(
      [{ animator: null, channel: "rotation" }], [1], "scale"
    )).toThrow("known animator and channel");
    expect(() => requireValidPlannedBatchTrackTimes(
      [{ animator: {}, channel: "" }], [1], "scale"
    )).toThrow("known animator and channel");
  });
  test("pattern selection includes exact decimal multiples affected by floating-point remainder", () => {
    const keyframes = [0.1, 0.2, 0.3, 0.6, 0.35].map((time) => ({ time }));
    const selected = selectBatchKeyframes(keyframes, [], "pattern", {
      pattern: { interval: 0.1, offset: 0 },
      tolerance: 1e-9,
    });
    expect(selected.map((item) => item.time)).toEqual([0.1, 0.2, 0.3, 0.6]);
  });

  test("pattern tolerance is symmetric at both sides of a repetition boundary", () => {
    const keyframes = [1.9995, 2.0005, -0.9995, 1.5].map((time) => ({ time }));
    const selected = selectBatchKeyframes(keyframes, [], "pattern", {
      pattern: { interval: 1, offset: 0 },
      tolerance: 0.001,
    });
    expect(selected.map((item) => item.time)).toEqual([1.9995, 2.0005, -0.9995]);

    expect(selectBatchKeyframes([{ time: 0.3 }], [], "pattern", {
      pattern: { interval: 0.2, offset: 0.1 },
      tolerance: 1e-9,
    })).toEqual([{ time: 0.3 }]);
  });

  test("preflight occurs before native Undo and rollback is retained", async () => {
    const source = await Bun.file("server/tools/animation/batch.ts").text();
    const start = source.indexOf('if (operation === "scale")');
    const end = source.indexOf('if (operation === "reverse")', start);
    const block = source.slice(start, end);
    expect(start).toBeGreaterThan(0);
    expect(block.indexOf("requireValidPlannedBatchTrackTimes(")).toBeGreaterThan(0);
    expect(block.indexOf("requireValidPlannedBatchTrackTimes(")).toBeLessThan(block.indexOf("Undo.initEdit("));
    expect(block).toContain("keyframe.replaceOthers(replacedKeyframes);");
    expect(block).toContain("expectedOverwrites.some(keyframe => !actualOverwrites.has(keyframe))");
    expect(block).toContain("animations: [animation]");
    expect(block).not.toContain("Undo.addKeyframeCasualties(replacedKeyframes)");
    expect(block).toContain("Undo.cancelEdit(true);");
  });
});
