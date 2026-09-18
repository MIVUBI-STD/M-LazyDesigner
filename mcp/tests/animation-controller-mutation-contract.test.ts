import { describe, expect, test } from "bun:test";
import { manageAnimationControllerParameters } from "@/server/tools/animation-controller";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("AnimationController mutation closure", () => {
  test("one compact tool accepts ordered coherent controller operations", () => {
    expect(manageAnimationControllerParameters.safeParse({
      create_name: "controller.animation.test",
      operations: [
        { op: "add_state", name: "idle" },
        { op: "add_state", name: "walk", blend_transition: 0.2 },
        { op: "add_transition", state: "idle", target: "walk", condition: "q.ground_speed > 0.1" },
      ],
    }).success).toBe(true);

    expect(manageAnimationControllerParameters.safeParse({
      controller_id: "controller-uuid",
      operations: [
        { op: "update_state", state: "idle", on_entry: "v.ready = 1;" },
        { op: "update_transition", state: "idle", id: "transition-uuid", condition: "q.ground_speed > 0.2" },
      ],
    }).success).toBe(true);
  });

  test("target selection is explicit and operation branches reject unused fields", () => {
    for (const input of [
      { operations: [{ op: "add_state", name: "idle" }] },
      { controller_id: "controller-uuid", create_name: "controller.animation.test", operations: [{ op: "add_state", name: "idle" }] },
    ]) expect(manageAnimationControllerParameters.safeParse(input).success).toBe(false);

    expect(manageAnimationControllerParameters.safeParse({
      controller_id: "controller-uuid",
      operations: [{ op: "update_state", state: "idle" }],
    }).success).toBe(false);
    expect(manageAnimationControllerParameters.safeParse({
      controller_id: "controller-uuid",
      operations: [{ op: "remove_transition", state: "idle", id: "transition-uuid", name: "unused" }],
    }).success).toBe(false);
  });

  test("batch stays bounded and transition conditions cannot be blank", () => {
    expect(manageAnimationControllerParameters.safeParse({
      controller_id: "controller-uuid",
      operations: Array.from({ length: 33 }, (_, index) => ({ op: "add_state", name: `state_${index}` })),
    }).success).toBe(false);
    expect(manageAnimationControllerParameters.safeParse({
      controller_id: "controller-uuid",
      operations: [{ op: "add_transition", state: "idle", target: "walk", condition: "   " }],
    }).success).toBe(false);
  });

  test("zero and false remain valid authored controller values", () => {
    expect(manageAnimationControllerParameters.safeParse({
      controller_id: "controller-uuid",
      operations: [
        {
          op: "update_state",
          state: "walk",
          blend_transition: 0,
          blend_via_shortest_path: false,
        },
        {
          op: "update_animation",
          state: "walk",
          id: "animation-link-uuid",
          blend_value: 0,
        },
      ],
    }).success).toBe(true);
  });

  test("explicit null remains the supported clear/reset signal for particle fields", () => {
    expect(manageAnimationControllerParameters.safeParse({
      controller_id: "controller-uuid",
      operations: [
        {
          op: "update_particle",
          state: "walk",
          id: "particle-uuid",
          locator: null,
          bind_to_actor: null,
          pre_effect_script: null,
        },
      ],
    }).success).toBe(true);
  });

  test("implementation preflights a plan then applies one native Undo transaction", async () => {
    const controller = await source("server/tools/animation-controller.ts");
    expect(controller).toContain("applyOperationToPlan");
    expect(controller).toContain("validateFinalPlan(plan)");
    expect(controller).toContain("Undo.initEdit({ animation_controllers:");
    expect(controller).toContain("controller.extend as");
    expect(controller).toContain("controller.add(false)");
    expect(controller).toContain("Undo.cancelEdit(true)");
    expect(controller).toContain('execution: "applied" as const');
    expect(controller).toContain("structuredContent: result");
    expect(controller).not.toContain(".addTransition(");
    expect(controller).not.toContain(".addAnimation(");
    expect(controller).not.toContain("risky_eval");
    expect(controller).not.toContain("trigger_action");
  });

  test("mutation result returns final affected subgraphs without dumping untouched controller state", async () => {
    const controller = await source("server/tools/animation-controller.ts");
    const start = controller.indexOf("function controllerStateContinuation");
    const end = controller.indexOf("function applyOperationToPlan", start);
    const continuation = controller.slice(start, end);
    expect(continuation).toContain("animations: state.animations.map");
    expect(continuation).toContain("transitions: state.transitions.map");
    expect(continuation).toContain("sounds: state.sounds.map");
    expect(continuation).toContain("particles: state.particles.map");
    expect(controller).toContain(".filter((state) => affectedStateUuids.has(state.uuid))");
    expect(controller).toContain(".map(controllerStateContinuation)");
    expect(controller).not.toContain("\n          states: finalPlan.states,");
    expect(controller).toContain("state_uuid: state.uuid");
    expect(controller).toContain("target_uuid: target.uuid");
    expect(controller).toContain("animation_uuid: link.animation || null");
  });

  test("mutation stays inside the existing animation family and generated docs owner", async () => {
    const [registration, manifest, inspection] = await Promise.all([
      source("server/runtime/registration.ts"), source("build/docs-manifest.ts"), source("server/tools/animation-inspection.ts"),
    ]);
    expect(registration).toContain("registerAnimationControllerTools");
    expect(registration).toContain("registerAnimationFamilyTools");
    expect(registration).toContain("registerAnimationControllerTools();");
    expect(manifest).toContain("animationControllerToolDocs");
    expect(inspection).not.toContain('name: "manage_animation_controller"');
    expect(inspection).toContain("readOnlyHint: true");
  });

  test("controller mutation is one default capability, not a new registration profile", async () => {
    const [profile, controller] = await Promise.all([
      source("lib/registrationProfile.ts"), source("server/tools/animation-controller.ts"),
    ]);
    expect(profile).toContain('export type McpRegistrationProfile = "bedrock_entity" | "extended";');
    expect(profile).not.toContain("controller_profile");
    expect(controller).toContain('name: "manage_animation_controller"');
  });
});
