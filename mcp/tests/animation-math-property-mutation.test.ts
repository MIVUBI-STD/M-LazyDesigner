import { describe, expect, test } from "bun:test";
import {
  animationTimelineParameters,
  normalizeAnimationMolangProperty,
} from "@/server/tools/animation";

describe("animation Molang property mutation", () => {
  test("timeline schema accepts authored values and explicit clear", () => {
    for (const action of ["set_anim_time_update", "set_blend_weight"] as const) {
      expect(
        animationTimelineParameters.safeParse({
          action,
          molang: "query.modified_distance_moved",
        }).success
      ).toBe(true);
      expect(
        animationTimelineParameters.safeParse({ action, molang: null }).success
      ).toBe(true);
      expect(
        animationTimelineParameters.safeParse({ action, molang: "   \n  " }).success
      ).toBe(false);
      expect(animationTimelineParameters.safeParse({ action }).success).toBe(false);
    }
  });

  test("Molang payload is rejected for unrelated timeline actions", () => {
    expect(
      animationTimelineParameters.safeParse({
        action: "play",
        molang: "query.life_time",
      }).success
    ).toBe(false);
  });

  test("normalization mirrors native Animation properties dialog behavior", () => {
    expect(
      normalizeAnimationMolangProperty("  query.modified_distance_moved\n* 2  ")
    ).toBe("query.modified_distance_moved* 2");
    expect(normalizeAnimationMolangProperty(null)).toBe("");
  });

  test("timeline source preserves Molang text and rejects no-op before Undo", async () => {
    const source = await Bun.file("server/tools/animation-timeline.ts").text();
    const block = source;
    const molangCase = block.slice(block.indexOf('case "set_anim_time_update":'));

    expect(molangCase).toContain('case "set_blend_weight":');
    expect(molangCase).toContain("normalizeAnimationMolangProperty(molang)");
    expect(molangCase).toContain("would not change animation");
    expect(molangCase.indexOf("would not change animation")).toBeLessThan(
      molangCase.indexOf("runPersistentAnimationEdit(`Change animation")
    );
    expect(molangCase).toContain("animation.extend({ [property]: nextValue })");
    expect(molangCase).toContain("anim_time_update:");
    expect(molangCase).toContain("blend_weight:");
    expect(molangCase).toContain("structuredContent: propertyResult");
    expect(block).not.toContain("MolangParser.parse(");
    expect(block).not.toContain("risky_eval");
  });
});
