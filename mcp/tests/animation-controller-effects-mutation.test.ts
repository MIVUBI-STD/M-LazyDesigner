import { describe, expect, test } from "bun:test";
import { manageAnimationControllerParameters } from "@/server/tools/animation-controller";

describe("animation controller state effect mutation", () => {
  test("schema accepts bounded sound and particle lifecycle operations", () => {
    expect(
      manageAnimationControllerParameters.parse({
        controller_id: "controller-uuid",
        operations: [
          { op: "add_sound", state: "idle", effect: "mob.step" },
          {
            op: "add_particle",
            state: "attack",
            effect: "minecraft:spark",
            locator: "weapon_tip",
            bind_to_actor: false,
            pre_effect_script: "variable.hit = 1;",
          },
          {
            op: "update_particle",
            state: "attack",
            id: "particle-uuid",
            locator: null,
            bind_to_actor: null,
            pre_effect_script: null,
          },
          { op: "remove_sound", state: "idle", id: "sound-uuid" },
        ],
      }).operations.length
    ).toBe(4);
  });

  test("sound operations reject particle-only payload fields", () => {
    expect(() =>
      manageAnimationControllerParameters.parse({
        controller_id: "controller-uuid",
        operations: [
          {
            op: "add_sound",
            state: "idle",
            effect: "mob.step",
            locator: "head",
          },
        ],
      })
    ).toThrow();
  });

  test("source mutates state-owned native effect arrays without a new tool family", async () => {
    const source = await Bun.file("server/tools/animation/controller.ts").text();

    for (const marker of [
      '"add_sound"',
      '"update_sound"',
      '"remove_sound"',
      '"add_particle"',
      '"update_particle"',
      '"remove_particle"',
      "findSoundEffect",
      "findParticleEffect",
      "state.sounds.push(sound)",
      "state.particles.push(particle)",
      "controller.extend",
      'file: ""',
    ]) {
      expect(source).toContain(marker);
    }

    expect(source).toContain("operation.locator ?? \"\"");
    expect(source).toContain("operation.bind_to_actor ?? true");
    expect(source).toContain("operation.pre_effect_script ?? \"\"");
    expect(source).not.toContain("manage_controller_effects");
  });
});
