import { describe, expect, test } from "bun:test";
import {
  countEffectiveEffectDataPoints,
  countEffectiveTimelineScriptLines,
} from "@/server/tools/animation-inspection";

describe("animation effect summary semantics", () => {
  test("particle and sound counts match native truthy effect export", () => {
    expect(
      countEffectiveEffectDataPoints([
        { effect: "minecraft:spark" },
        { effect: "" },
        { effect: null },
        {},
        { effect: " " },
      ])
    ).toBe(2);
  });

  test("timeline count follows first datapoint and native effective line filtering", () => {
    expect(
      countEffectiveTimelineScriptLines([
        { script: "variable.a = 1\n\n;\n/say ready" },
        { script: "variable.must_not_count = 1" },
      ])
    ).toBe(2);

    expect(countEffectiveTimelineScriptLines([])).toBe(0);
    expect(
      countEffectiveTimelineScriptLines([{ script: " ; \n\t;" }])
    ).toBe(0);
  });

  test("summary uses export-semantic helpers while retaining authored datapoints", async () => {
    const source = await Bun.file("server/tools/animation/inspection.ts").text();
    expect(source).toContain("countEffectiveEffectDataPoints(keyframe.particles)");
    expect(source).toContain("countEffectiveEffectDataPoints(keyframe.sounds)");
    expect(source).toContain("countEffectiveTimelineScriptLines(keyframe.scripts)");
    expect(source).toContain("data_point_index: dataPointIndex");
  });
});
