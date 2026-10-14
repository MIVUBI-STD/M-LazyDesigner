import { describe, expect, test } from "bun:test";
import {
  animationInspectionToolDocs,
  inspectAnimationParameters,
  resolveUniqueControllerState,
} from "@/server/tools/animation-inspection";

describe("AnimationController inspection closure", () => {
  test("adds a focused controller-state selector without a new tool", async () => {
    expect(inspectAnimationParameters.parse({ state: "idle" }).state).toBe("idle");
    expect(inspectAnimationParameters.safeParse({ state: "" }).success).toBe(false);
    const source = await Bun.file("server/tools/animation/inspection.ts").text();
    expect(source).toContain("instanceof AnimationController");
    expect(source).toContain('authored_space: "blockbench_animation_controller"');
    expect(source).toContain("animation_key");
    expect(source).toContain("target_name");
    expect(source).not.toContain("create_animation_controller");
    expect(source).not.toContain('name: "manage_animation_controller"');
  });

  test("tool description only advertises supported focused selectors", () => {
    const description = animationInspectionToolDocs[0].description;
    expect(description).toContain("bone");
    expect(description).toContain("state");
    expect(description).toContain("include_effect_keyframes");
    expect(description).not.toContain("channel/time_range");
    expect(description).not.toContain("time_range");
  });

  test("state identity is UUID-first then unique exact name", () => {
    const states = [
      { uuid: "u1", name: "idle" },
      { uuid: "u2", name: "attack" },
      { uuid: "u3", name: "attack" },
    ];
    expect(resolveUniqueControllerState(states, "u3")).toEqual(states[2]);
    expect(resolveUniqueControllerState(states, "idle")).toEqual(states[0]);
    expect(() => resolveUniqueControllerState(states, "attack")).toThrow("ambiguous");
    expect(() => resolveUniqueControllerState(states, "missing")).toThrow("not found");
  });

  test("focused state inspection omits the redundant all-state summary", async () => {
    const source = await Bun.file("server/tools/animation/inspection.ts").text();
    const start = source.indexOf("function inspectAnimationController");
    const end = source.indexOf("function inspectKeyframe", start);
    const controllerInspection = source.slice(start, end);
    const focusedStart = controllerInspection.indexOf("if (stateReference)");
    const summaryReturn = controllerInspection.indexOf("states: (controller.states as ControllerStateView[]).map(");
    expect(focusedStart).toBeGreaterThan(-1);
    expect(summaryReturn).toBeGreaterThan(focusedStart);
    const focusedBranch = controllerInspection.slice(focusedStart, summaryReturn);
    expect(focusedBranch).toContain("focused_state: inspectControllerState(controller, stateReference)");
    expect(focusedBranch).not.toContain("states: (controller.states");
  });

  test("focused state exposes exact identities and preserves numeric zero", async () => {
    const source = await Bun.file("server/tools/animation/inspection.ts").text();
    const start = source.indexOf("function inspectControllerState");
    const end = source.indexOf("function inspectAnimationController", start);
    const focusedState = source.slice(start, end);
    expect(focusedState).toContain("uuid: sound.uuid || null");
    expect(focusedState).toContain("uuid: particle.uuid || null");
    expect(focusedState).toContain("uuid: transition.uuid");
    expect(focusedState).toContain("uuid: link.uuid");
    expect(focusedState).toContain("blend_value: link.blend_value ?? null");
    expect(focusedState).toContain("blend_transition: state.blend_transition ?? 0");
    expect(focusedState).not.toContain("blend_value: link.blend_value || null");
  });

  test("authored effect inspection exposes D1 target identity and timeline channel", async () => {
    expect(
      inspectAnimationParameters.parse({ include_effect_keyframes: true })
        .include_effect_keyframes
    ).toBe(true);

    const source = await Bun.file("server/tools/animation/inspection.ts").text();
    const start = source.indexOf("function inspectParticleEffects");
    const end = source.indexOf("function summarizeBoneAnimators", start);
    const effects = source.slice(start, end);

    expect(effects).toContain("existingEffects.timeline");
    expect(effects).toContain("inspectedTimelineKeyframes");
    expect(effects).toContain("script_count");
    expect(effects).toContain("data_point_index: dataPointIndex");
    expect((effects.match(/data_point_index: dataPointIndex/g) ?? []).length).toBe(3);
    expect(effects).not.toContain("data_point_uuid");
  });

  test("authored animation summary preserves animation-level Molang controls", async () => {
    const source = await Bun.file("server/tools/animation/inspection.ts").text();
    const executeStart = source.indexOf("const animationSummary = {");
    const focusedStart = source.indexOf("if (bone !== undefined)", executeStart);
    const summary = source.slice(executeStart, focusedStart);

    expect(summary).toContain("anim_time_update: animation.anim_time_update || null");
    expect(summary).toContain("blend_weight: animation.blend_weight || null");
    expect(summary).not.toContain("MolangParser.parse(");
  });

  test("focused authored-bone inspection omits animation-wide summaries", async () => {
    const source = await Bun.file("server/tools/animation/inspection.ts").text();
    const executeStart = source.indexOf("async execute({ animation_id, bone, state, include_effect_keyframes })");
    const focusedStart = source.indexOf("if (bone !== undefined)", executeStart);
    const summaryStart = source.indexOf("const boneAnimators = summarizeBoneAnimators(animation)", focusedStart);
    expect(executeStart).toBeGreaterThan(-1);
    expect(focusedStart).toBeGreaterThan(executeStart);
    expect(summaryStart).toBeGreaterThan(focusedStart);

    const focusedBranch = source.slice(focusedStart, summaryStart);
    expect(focusedBranch).toContain("focused_bone: focusedBone");
    expect(focusedBranch).not.toContain("summarizeBoneAnimators");
    expect(focusedBranch).not.toContain("bone_animator_count");
    expect(focusedBranch).toContain("include_effect_keyframes");
    expect(focusedBranch).toContain("inspectParticleEffects(animation, true)");
  });
});
