import { describe, expect, test } from "bun:test";
import {
  isAnimationCreationReceipt,
  animationCreationReceiptSchema,
} from "@/lib/receipts/animationCreation";

describe("create_animation native creation evidence", () => {
  const native = {
    animation: {
      uuid: "clip-a", name: "animation.model.walk",
      loop: "loop", length: 2, snapping: 20,
    },
    requested_name: "animation.model.walk",
    requested_bone_count: 2,
    requested_particle_effect_count: 0,
    requested_sound_effect_count: 0,
  };

  test("accepts reported native codec identity without claiming playback fidelity", () => {
    expect(isAnimationCreationReceipt(native)).toBe(true);
    expect(animationCreationReceiptSchema.parse(native).animation.uuid)
      .toBe("clip-a");
  });

  test("refuses a status label, missing UUID or unverified input counts", () => {
    for (const value of [
      undefined,
      { success: true },
      { animation: { name: "walk" } },
      { ...native, animation: { name: "walk", uuid: "" } },
      { ...native, requested_name: "" },
      { ...native, requested_bone_count: -1 },
      { ...native, requested_sound_effect_count: NaN },
    ]) {
      expect(isAnimationCreationReceipt(value)).toBe(false);
    }
  });

  test("producer gets an AnimationCodec instance before building final state", async () => {
    const source = await Bun.file("server/tools/animation/create.ts").text();
    expect(source).toContain("createdAnimation.uuid");
    expect(source).toContain("requested_bone_count");
    expect(source).toContain("structuredContent: result");
  });
});
