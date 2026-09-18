import { describe, expect, test } from "bun:test";
import { animationTimelineParameters } from "@/server/tools/animation";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("professional animation reasoning contract", () => {
  test("A0 keeps loop/FPS parity on the existing timeline surface", () => {
    for (const loop_mode of ["once", "loop", "hold"]) {
      expect(
        animationTimelineParameters.safeParse({ action: "loop", loop_mode }).success
      ).toBe(true);
    }
    expect(
      animationTimelineParameters.safeParse({ action: "set_fps", fps: 24 }).success
    ).toBe(true);
  });

  test("new animation reuses create receipt instead of confirmation inspection", async () => {
    const [skill, animationSource] = await Promise.all([
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
      source("server/tools/animation-create.ts"),
    ]);

    expect(skill).toContain(
      "new known clip → create_animation → reuse returned UUID/state; timeline if needed"
    );
    expect(skill).toContain("existing/unknown detail → inspect_animation");
    expect(skill).not.toContain("create_animation\ninspect_animation\nmanage_animation_timeline");

    for (const marker of [
      "uuid: createdAnimation.uuid",
      "name: createdAnimation.name",
      "length: createdAnimation.length",
      "snapping: createdAnimation.snapping",
      "structuredContent: result",
    ]) {
      expect(animationSource).toContain(marker);
    }
  });

  test("active animation guidance requires a motion design contract without preset metrics", async () => {
    const [skill, policy] = await Promise.all([
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
      source("../docs/03-authoring/animation/standard.md"),
    ]);

    for (const text of [skill, policy]) {
      for (const marker of [
        "Motion Design Contract",
        "primary driver",
        "counter-motion",
        "phase",
        "contact",
        "Molang",
        "q.anim_time",
        "q.modified_distance_moved",
        "anticipation",
        "impact",
        "follow-through",
        "recovery",
        "causal event",
        "IMPROVED | UNCHANGED | REGRESSED",
      ]) {
        expect(text).toContain(marker);
      }
      expect(text.toLowerCase()).toContain("not preset");
      expect(text.toLowerCase()).toMatch(/no universal fps|do not impose one global fps/);
      expect(text.toLowerCase()).toContain("animation quality score");
    }
  });

  test("procedural math is bounded to causal continuous motion rather than replacing authored action", async () => {
    const [skill, policy] = await Promise.all([
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
      source("../docs/03-authoring/animation/standard.md"),
    ]);

    for (const text of [skill, policy]) {
      expect(text).toContain("continuous");
      expect(text).toContain("cyclic");
      expect(text).toContain("identity-critical");
      expect(text).toContain("driver");
    }

    expect(skill).toContain("driver → delayed followers");
    expect(policy).toContain("Secondary motion normally follows");
    expect(policy).toContain("math.sin");
    expect(policy).toContain("inverse_lerp");
    expect(policy).toContain("lerp");
    expect(policy).toContain("exp(-damping * time)");
    expect(policy).toContain("Run is not merely walk played faster");
    expect(policy).toContain("Do not use continuous `math.random` as generic jitter");
  });

  test("active guidance does not promote Bezier complexity or a new animation generator", async () => {
    const [skill, policy, profile] = await Promise.all([
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
      source("../docs/03-authoring/animation/standard.md"),
      source("lib/registrationProfile.ts"),
    ]);

    expect(skill).toContain("No universal FPS");
    expect(skill).toContain("Bezier target");
    expect(policy).toContain("Do not add Bezier complexity");
    for (const forbidden of [
      "animation_quality_score",
      "auto_animation_generator",
      "procedural_animation_profile",
    ]) {
      expect(skill).not.toContain(forbidden);
      expect(policy).not.toContain(forbidden);
      expect(profile).not.toContain(forbidden);
    }
  });

  test("verified effect/controller owners replace only the gaps they actually close", async () => {
    const [skill, policy, controller, effects] = await Promise.all([
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
      source("../docs/03-authoring/animation/standard.md"),
      source("server/tools/animation-controller.ts"),
      source("server/tools/animation-effects.ts"),
    ]);

    expect(skill).toContain("existing animation effects            → manage_animation_effects");
    expect(skill).toContain("controller state/composition/effects  → manage_animation_controller");
    expect(skill).toContain("all timeline/keyframe work            → manage_animation_timeline (operation: keyframes|graph|timeline|batch|copy_paste)");
    expect(policy).toContain("existing-animation particle/sound/timeline effect mutation");
    expect(policy).toContain("controller blend-curve mutation");
    expect(policy).toContain("bone-binding expressions");
    expect(controller).toContain('"add_particle"');
    expect(controller).toContain('"add_sound"');
    expect(effects).toContain('name: "manage_animation_effects"');
    expect(skill).not.toContain("Existing-animation effect mutation");
    expect(skill).not.toContain("controller-state particle/sound mutation");
  });
});
