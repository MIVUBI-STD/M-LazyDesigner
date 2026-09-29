/// <reference types="blockbench-types" />
import { animationControllerReceipt } from "@/lib/receipts/animationController";
import { recordCurrentCapabilitySemanticHistoryEffect } from "@/lib/semanticHistory";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL } from "@/lib/constants";
import { resolveUuidOrUniqueName } from "@/lib/coreIdentity";
import {
  manageAnimationControllerParameters,
  type ControllerMutationOperation,
} from "@/server/tools/animation/controllerSchema";
import {
  controllerStateContinuation,
  snapshotController,
  validateFinalControllerPlan,
  type ControllerAnimationLink,
  type ControllerParticleEffect,
  type ControllerPlan,
  type ControllerSoundEffect,
  type ControllerStatePlan,
  type ControllerTransition,
} from "@/server/tools/animation/controllerState";
export { manageAnimationControllerParameters } from "@/server/tools/animation/controllerSchema";



function requireBedrockControllerProject(): void {
  if (!Project) {
    throw new Error(
      "No project is open. Open the intended Minecraft Bedrock Entity project first."
    );
  }
  const format = Format as { id?: string; animation_controllers?: boolean } | undefined;
  if (format?.id !== "bedrock" || !format.animation_controllers) {
    throw new Error(
      `manage_animation_controller requires a Bedrock Entity project with animation controllers; current format is ${format?.id ?? "unknown"}.`
    );
  }
}

function isAnimationControllerItem(
  item: _Animation | AnimationController
): item is AnimationController {
  return (
    typeof AnimationController !== "undefined" &&
    item instanceof AnimationController
  );
}

function currentControllers(): AnimationController[] {
  return ((AnimationItem.all ?? []) as Array<_Animation | AnimationController>).filter(
    isAnimationControllerItem
  );
}

function resolveController(reference: string): AnimationController {
  return resolveUuidOrUniqueName(currentControllers(), reference, {
    kind: "AnimationController",
    notFoundHint:
      "Use inspect_animation to confirm the intended controller UUID.",
  });
}

function resolveControllerState(
  states: readonly ControllerStatePlan[],
  reference: string
): ControllerStatePlan {
  return resolveUuidOrUniqueName(states, reference, {
    kind: "AnimationController state",
    notFoundHint: "Use inspect_animation state detail to confirm the intended state UUID.",
  });
}

function resolveAuthoredAnimation(reference: string): _Animation {
  const items = (AnimationItem.all ?? []) as Array<_Animation | AnimationController>;
  const animations = items.filter(
    (item): item is _Animation => !isAnimationControllerItem(item)
  );
  return resolveUuidOrUniqueName(animations, reference, {
    kind: "Animation",
    notFoundHint:
      "Pass an exact authored Animation UUID or unique exact Animation name; controller targets are not animation links.",
  });
}

function ensureControllerNameAvailable(
  requestedName: string,
  path: string,
  excludeUuid?: string
): void {
  const collision = currentControllers().find(
    (candidate) =>
      candidate.uuid !== excludeUuid &&
      (candidate.path || "") === path &&
      candidate.name === requestedName
  );
  if (collision) {
    throw new Error(
      `AnimationController name "${requestedName}" already exists for the same file scope (${collision.uuid}). Use a unique exact name.`
    );
  }
}

function requireUniqueStateName(
  states: readonly ControllerStatePlan[],
  requestedName: string,
  excludeUuid?: string
): void {
  const collision = states.find(
    (state) => state.uuid !== excludeUuid && state.name === requestedName
  );
  if (collision) {
    throw new Error(
      `AnimationController state name "${requestedName}" already exists (${collision.uuid}). Use a unique exact name.`
    );
  }
}

function findTransition(
  state: ControllerStatePlan,
  uuid: string
): ControllerTransition {
  const transition = state.transitions.find((candidate) => candidate.uuid === uuid);
  if (!transition) {
    throw new Error(
      `Transition "${uuid}" not found in state "${state.name}". Use inspect_animation state detail to confirm the transition UUID.`
    );
  }
  return transition;
}

function findAnimationLink(
  state: ControllerStatePlan,
  uuid: string
): ControllerAnimationLink {
  const link = state.animations.find((candidate) => candidate.uuid === uuid);
  if (!link) {
    throw new Error(
      `Animation link "${uuid}" not found in state "${state.name}". Use inspect_animation state detail to confirm the link UUID.`
    );
  }
  return link;
}

function findSoundEffect(
  state: ControllerStatePlan,
  uuid: string
): ControllerSoundEffect {
  const sound = state.sounds.find((candidate) => candidate.uuid === uuid);
  if (!sound) {
    throw new Error(
      `Sound effect "${uuid}" not found in state "${state.name}". Use inspect_animation state detail to confirm the sound UUID.`
    );
  }
  return sound;
}

function findParticleEffect(
  state: ControllerStatePlan,
  uuid: string
): ControllerParticleEffect {
  const particle = state.particles.find((candidate) => candidate.uuid === uuid);
  if (!particle) {
    throw new Error(
      `Particle effect "${uuid}" not found in state "${state.name}". Use inspect_animation state detail to confirm the particle UUID.`
    );
  }
  return particle;
}

function normalizeBlendValue(value: string | number | undefined): string {
  if (value === undefined) return "";
  return typeof value === "number" ? String(value) : value;
}

function applyOperationToPlan(
  plan: ControllerPlan,
  operation: ControllerMutationOperation,
  affectedStateUuids: Set<string>,
  created: {
    states: Array<{ uuid: string; name: string }>;
    transitions: Array<{ uuid: string; state_uuid: string; target_uuid: string }>;
    animation_links: Array<{ uuid: string; state_uuid: string; animation_key: string; animation_uuid: string | null }>;
    sounds: Array<{ uuid: string; state_uuid: string; effect: string }>;
    particles: Array<{ uuid: string; state_uuid: string; effect: string }>;
  },
  removed: {
    states: Array<{ uuid: string; name: string }>;
    transitions: string[];
    animation_links: string[];
    sounds: string[];
    particles: string[];
  }
): void {
  switch (operation.op) {
    case "rename_controller": {
      if (operation.name === plan.name) {
        throw new Error("rename_controller would not change the controller name.");
      }
      ensureControllerNameAvailable(operation.name!, plan.path, plan.uuid);
      plan.name = operation.name!;
      return;
    }
    case "add_state": {
      requireUniqueStateName(plan.states, operation.name!);
      const state: ControllerStatePlan = {
        uuid: guid(),
        name: operation.name!,
        animations: [],
        transitions: [],
        sounds: [],
        particles: [],
        on_entry: operation.on_entry ?? "",
        on_exit: operation.on_exit ?? "",
        blend_transition: operation.blend_transition ?? 0,
        blend_via_shortest_path: operation.blend_via_shortest_path ?? false,
      };
      plan.states.push(state);
      if (!plan.initial_state) plan.initial_state = state.uuid;
      affectedStateUuids.add(state.uuid);
      created.states.push({ uuid: state.uuid, name: state.name });
      return;
    }
    case "update_state": {
      const state = resolveControllerState(plan.states, operation.state!);
      const nextName = operation.name ?? state.name;
      if (nextName !== state.name) {
        requireUniqueStateName(plan.states, nextName, state.uuid);
      }
      const next = {
        name: nextName,
        on_entry: operation.on_entry ?? state.on_entry,
        on_exit: operation.on_exit ?? state.on_exit,
        blend_transition:
          operation.blend_transition ?? state.blend_transition,
        blend_via_shortest_path:
          operation.blend_via_shortest_path ?? state.blend_via_shortest_path,
      };
      if (
        next.name === state.name &&
        next.on_entry === state.on_entry &&
        next.on_exit === state.on_exit &&
        next.blend_transition === state.blend_transition &&
        next.blend_via_shortest_path === state.blend_via_shortest_path
      ) {
        throw new Error(`update_state would not change state "${state.name}".`);
      }
      Object.assign(state, next);
      affectedStateUuids.add(state.uuid);
      return;
    }
    case "remove_state": {
      const state = resolveControllerState(plan.states, operation.state!);
      if (plan.states.length <= 1) {
        throw new Error("remove_state cannot remove the final controller state.");
      }
      if (plan.initial_state === state.uuid) {
        throw new Error(
          `State "${state.name}" is the current initial state. Set another initial state earlier in the same operations batch before removing it.`
        );
      }
      const inbound = plan.states
        .filter((candidate) => candidate.uuid !== state.uuid)
        .flatMap((candidate) =>
          candidate.transitions
            .filter((transition) => transition.target === state.uuid)
            .map((transition) => `${candidate.name}:${transition.uuid}`)
        );
      if (inbound.length) {
        throw new Error(
          `State "${state.name}" still has inbound transition(s): ${inbound.join(", ")}. Remove or retarget them earlier in the same batch.`
        );
      }
      plan.states = plan.states.filter((candidate) => candidate.uuid !== state.uuid);
      removed.states.push({ uuid: state.uuid, name: state.name });
      return;
    }
    case "set_initial_state": {
      const state = resolveControllerState(plan.states, operation.state!);
      if (plan.initial_state === state.uuid) {
        throw new Error(`State "${state.name}" is already the initial state.`);
      }
      plan.initial_state = state.uuid;
      affectedStateUuids.add(state.uuid);
      return;
    }
    case "add_transition": {
      const state = resolveControllerState(plan.states, operation.state!);
      const target = resolveControllerState(plan.states, operation.target!);
      if (state.uuid === target.uuid) {
        throw new Error("A controller transition cannot target its own source state.");
      }
      if (state.transitions.some((item) => item.target === target.uuid)) {
        throw new Error(
          `State "${state.name}" already has a transition to "${target.name}".`
        );
      }
      const transition = {
        uuid: guid(),
        target: target.uuid,
        condition: operation.condition!,
      };
      state.transitions.push(transition);
      affectedStateUuids.add(state.uuid);
      created.transitions.push({ uuid: transition.uuid, state_uuid: state.uuid, target_uuid: target.uuid });
      return;
    }
    case "update_transition": {
      const state = resolveControllerState(plan.states, operation.state!);
      const transition = findTransition(state, operation.id!);
      const target = operation.target
        ? resolveControllerState(plan.states, operation.target)
        : resolveControllerState(plan.states, transition.target);
      if (state.uuid === target.uuid) {
        throw new Error("A controller transition cannot target its own source state.");
      }
      if (
        target.uuid !== transition.target &&
        state.transitions.some(
          (candidate) =>
            candidate.uuid !== transition.uuid && candidate.target === target.uuid
        )
      ) {
        throw new Error(
          `State "${state.name}" already has a transition to "${target.name}".`
        );
      }
      const nextCondition = operation.condition ?? transition.condition;
      if (
        target.uuid === transition.target &&
        nextCondition === transition.condition
      ) {
        throw new Error(
          `update_transition would not change transition "${transition.uuid}".`
        );
      }
      transition.target = target.uuid;
      transition.condition = nextCondition;
      affectedStateUuids.add(state.uuid);
      return;
    }
    case "remove_transition": {
      const state = resolveControllerState(plan.states, operation.state!);
      const transition = findTransition(state, operation.id!);
      state.transitions = state.transitions.filter(
        (candidate) => candidate.uuid !== transition.uuid
      );
      affectedStateUuids.add(state.uuid);
      removed.transitions.push(transition.uuid);
      return;
    }
    case "add_animation": {
      const state = resolveControllerState(plan.states, operation.state!);
      const animation = resolveAuthoredAnimation(operation.animation!);
      // Bedrock controllers key animation links by short name: a duplicate
      // key would silently shadow the earlier link on serialize.
      const nextKey = animation.getShortName();
      if (
        state.animations.some(
          (candidate) =>
            candidate.key === nextKey || candidate.animation === animation.uuid
        )
      ) {
        throw new Error(
          `State "${state.name}" already links animation "${nextKey}". Remove the existing link or update it instead of adding a duplicate.`
        );
      }
      const link = {
        uuid: guid(),
        key: nextKey,
        animation: animation.uuid,
        blend_value: normalizeBlendValue(operation.blend_value),
      };
      state.animations.push(link);
      affectedStateUuids.add(state.uuid);
      created.animation_links.push({ uuid: link.uuid, state_uuid: state.uuid, animation_key: link.key, animation_uuid: link.animation || null });
      return;
    }
    case "update_animation": {
      const state = resolveControllerState(plan.states, operation.state!);
      const link = findAnimationLink(state, operation.id!);
      let nextAnimationUuid = link.animation;
      let nextKey = link.key;
      if (operation.animation !== undefined) {
        const animation = resolveAuthoredAnimation(operation.animation);
        nextAnimationUuid = animation.uuid;
        nextKey = animation.getShortName();
      }
      const nextBlendValue =
        operation.blend_value === undefined
          ? String(link.blend_value ?? "")
          : normalizeBlendValue(operation.blend_value);
      if (
        nextAnimationUuid === link.animation &&
        nextKey === link.key &&
        nextBlendValue === String(link.blend_value ?? "")
      ) {
        throw new Error(
          `update_animation would not change animation link "${link.uuid}".`
        );
      }
      if (
        state.animations.some(
          (candidate) =>
            candidate.uuid !== link.uuid &&
            (candidate.key === nextKey ||
              candidate.animation === nextAnimationUuid)
        )
      ) {
        throw new Error(
          `State "${state.name}" already links animation "${nextKey}". update_animation would create a duplicate link key.`
        );
      }
      link.animation = nextAnimationUuid;
      link.key = nextKey;
      link.blend_value = nextBlendValue;
      affectedStateUuids.add(state.uuid);
      return;
    }
    case "remove_animation": {
      const state = resolveControllerState(plan.states, operation.state!);
      const link = findAnimationLink(state, operation.id!);
      state.animations = state.animations.filter(
        (candidate) => candidate.uuid !== link.uuid
      );
      affectedStateUuids.add(state.uuid);
      removed.animation_links.push(link.uuid);
      return;
    }
    case "add_sound": {
      const state = resolveControllerState(plan.states, operation.state!);
      const sound: ControllerSoundEffect = {
        uuid: guid(),
        effect: operation.effect!,
        file: "",
      };
      state.sounds.push(sound);
      affectedStateUuids.add(state.uuid);
      created.sounds.push({ uuid: sound.uuid, state_uuid: state.uuid, effect: sound.effect });
      return;
    }
    case "update_sound": {
      const state = resolveControllerState(plan.states, operation.state!);
      const sound = findSoundEffect(state, operation.id!);
      if (sound.effect === operation.effect) {
        throw new Error(`update_sound would not change sound effect "${sound.uuid}".`);
      }
      sound.effect = operation.effect!;
      affectedStateUuids.add(state.uuid);
      return;
    }
    case "remove_sound": {
      const state = resolveControllerState(plan.states, operation.state!);
      const sound = findSoundEffect(state, operation.id!);
      state.sounds = state.sounds.filter((candidate) => candidate.uuid !== sound.uuid);
      affectedStateUuids.add(state.uuid);
      removed.sounds.push(sound.uuid);
      return;
    }
    case "add_particle": {
      const state = resolveControllerState(plan.states, operation.state!);
      const particle: ControllerParticleEffect = {
        uuid: guid(),
        effect: operation.effect!,
        locator: operation.locator ?? "",
        bind_to_actor: operation.bind_to_actor ?? true,
        pre_effect_script: operation.pre_effect_script ?? "",
        file: "",
      };
      state.particles.push(particle);
      affectedStateUuids.add(state.uuid);
      created.particles.push({ uuid: particle.uuid, state_uuid: state.uuid, effect: particle.effect });
      return;
    }
    case "update_particle": {
      const state = resolveControllerState(plan.states, operation.state!);
      const particle = findParticleEffect(state, operation.id!);
      const next = {
        effect: operation.effect ?? particle.effect,
        locator:
          operation.locator === undefined
            ? particle.locator
            : operation.locator ?? "",
        bind_to_actor:
          operation.bind_to_actor === undefined
            ? particle.bind_to_actor
            : operation.bind_to_actor ?? true,
        pre_effect_script:
          operation.pre_effect_script === undefined
            ? particle.pre_effect_script
            : operation.pre_effect_script ?? "",
      };
      if (
        next.effect === particle.effect &&
        next.locator === particle.locator &&
        next.bind_to_actor === particle.bind_to_actor &&
        next.pre_effect_script === particle.pre_effect_script
      ) {
        throw new Error(`update_particle would not change particle effect "${particle.uuid}".`);
      }
      Object.assign(particle, next);
      affectedStateUuids.add(state.uuid);
      return;
    }
    case "remove_particle": {
      const state = resolveControllerState(plan.states, operation.state!);
      const particle = findParticleEffect(state, operation.id!);
      state.particles = state.particles.filter(
        (candidate) => candidate.uuid !== particle.uuid
      );
      affectedStateUuids.add(state.uuid);
      removed.particles.push(particle.uuid);
      return;
    }
  }
}

export function registerAnimationControllerTools(): void {
  createTool(
    animationControllerToolDocs[0].name,
    {
      ...animationControllerToolDocs[0],
      parameters: manageAnimationControllerParameters,
      async execute({ controller_id, create_name, operations }) {
        requireBedrockControllerProject();

        const creating = create_name !== undefined;
        const existingController = controller_id
          ? resolveController(controller_id)
          : undefined;
        if (create_name) {
          ensureControllerNameAvailable(create_name, "");
        }

        const plan: ControllerPlan = existingController
          ? snapshotController(existingController)
          : {
              uuid: undefined,
              name: create_name!,
              path: "",
              initial_state: "",
              states: [],
            };
        const affectedStateUuids = new Set<string>();
        const created = {
          states: [] as Array<{ uuid: string; name: string }>,
          transitions: [] as Array<{ uuid: string; state_uuid: string; target_uuid: string }>,
          animation_links: [] as Array<{ uuid: string; state_uuid: string; animation_key: string; animation_uuid: string | null }>,
          sounds: [] as Array<{ uuid: string; state_uuid: string; effect: string }>,
          particles: [] as Array<{ uuid: string; state_uuid: string; effect: string }>,
        };
        const removed = {
          states: [] as Array<{ uuid: string; name: string }>,
          transitions: [] as string[],
          animation_links: [] as string[],
          sounds: [] as string[],
          particles: [] as string[],
        };

        for (const operation of operations) {
          applyOperationToPlan(
            plan,
            operation,
            affectedStateUuids,
            created,
            removed
          );
        }
        validateFinalControllerPlan(plan);

        const controller =
          existingController ?? new AnimationController({ name: plan.name });

        let editOpen = false;
        try {
          if (creating) {
            Undo.initEdit({ animation_controllers: [] });
          } else {
            Undo.initEdit({ animation_controllers: [controller] });
          }
          editOpen = true;

          (
            controller.extend as (data: {
              name?: string;
              states?: ControllerStatePlan[];
              initial_state?: string;
            }) => AnimationController
          )({
            name: plan.name,
            states: plan.states,
            initial_state: plan.initial_state,
          });
          if (
            controller.selected_state &&
            !plan.states.some(
              (state) => state.uuid === controller.selected_state?.uuid
            )
          ) {
            controller.selected_state = null;
          }
          if (creating) {
            controller.saved = false;
            controller.add(false);
            Undo.finishEdit("Create animation controller", {
              animation_controllers: [controller],
            });
            recordCurrentCapabilitySemanticHistoryEffect("manage_animation_controller");
          } else {
            Undo.finishEdit("Manage animation controller");
            recordCurrentCapabilitySemanticHistoryEffect("manage_animation_controller");
          }
          editOpen = false;
        } catch (error) {
          if (editOpen) Undo.cancelEdit(true);
          throw error;
        }

        const finalPlan = snapshotController(controller);
        const initial = finalPlan.states.find(
          (state) => state.uuid === finalPlan.initial_state
        );
        const result = animationControllerReceipt({
          execution: "applied",
          action: creating ? "created" : "updated",
          operation_count: operations.length,
          controller: {
            uuid: controller.uuid,
            name: controller.name,
            initial_state: initial
              ? { uuid: initial.uuid, name: initial.name }
              : null,
            state_count: finalPlan.states.length,
          },
          affected_states: finalPlan.states
            .filter((state) => affectedStateUuids.has(state.uuid))
            .map(controllerStateContinuation),
          created,
          removed,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `${creating ? "Created" : "Updated"} controller "${finalPlan.name}" (${controller.uuid}); ${operations.length} operation(s) applied across ${affectedStateUuids.size} state(s).`,
            },
          ],
          structuredContent: result,
        };
      },
    },
    animationControllerToolDocs[0].status
  );
}
