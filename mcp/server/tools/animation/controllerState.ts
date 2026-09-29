/// <reference types="blockbench-types" />

export type ControllerAnimationLink = {
  uuid: string;
  key: string;
  animation: string;
  blend_value: string | number;
};

export type ControllerTransition = {
  uuid: string;
  target: string;
  condition: string;
};

export type ControllerSoundEffect = {
  uuid: string;
  effect: string;
  file?: string;
};

export type ControllerParticleEffect = {
  uuid: string;
  effect: string;
  locator: string;
  bind_to_actor: boolean;
  pre_effect_script: string;
  file?: string;
};

export type ControllerStatePlan = {
  uuid: string;
  name: string;
  animations: ControllerAnimationLink[];
  transitions: ControllerTransition[];
  sounds: ControllerSoundEffect[];
  particles: ControllerParticleEffect[];
  on_entry: string;
  on_exit: string;
  blend_transition: number;
  blend_transition_curve?: Record<string, number>;
  blend_via_shortest_path: boolean;
};

export type ControllerPlan = {
  uuid?: string;
  name: string;
  path: string;
  initial_state: string;
  states: ControllerStatePlan[];
};

function cloneJsonArray<T>(value: readonly T[]): T[] {
  return JSON.parse(JSON.stringify(value)) as T[];
}

export function snapshotController(
  controller: AnimationController
): ControllerPlan {
  return {
    uuid: controller.uuid,
    name: controller.name,
    path: controller.path || "",
    initial_state: controller.initial_state || "",
    states: controller.states.map((state) => {
      const view = state as AnimationControllerState & {
        animations: ControllerAnimationLink[];
        transitions: ControllerTransition[];
        sounds: ControllerSoundEffect[];
        particles: ControllerParticleEffect[];
        blend_transition_curve?: Record<string, number>;
      };
      return {
        uuid: view.uuid,
        name: view.name,
        animations: view.animations.map((link) => ({
          ...link,
          blend_value:
            typeof link.blend_value === "number"
              ? link.blend_value
              : String(link.blend_value ?? ""),
        })),
        transitions: cloneJsonArray(view.transitions),
        sounds: cloneJsonArray(view.sounds),
        particles: cloneJsonArray(view.particles),
        on_entry: view.on_entry || "",
        on_exit: view.on_exit || "",
        blend_transition: view.blend_transition || 0,
        blend_transition_curve: view.blend_transition_curve
          ? { ...view.blend_transition_curve }
          : undefined,
        blend_via_shortest_path: Boolean(view.blend_via_shortest_path),
      };
    }),
  };
}

export function controllerStateContinuation(state: ControllerStatePlan) {
  return {
    uuid: state.uuid,
    name: state.name,
    on_entry: state.on_entry || null,
    on_exit: state.on_exit || null,
    blend_transition: state.blend_transition || 0,
    blend_transition_curve: state.blend_transition_curve
      ? { ...state.blend_transition_curve }
      : null,
    blend_via_shortest_path: state.blend_via_shortest_path,
    animations: state.animations.map((link) => ({
      uuid: link.uuid,
      key: link.key,
      animation_uuid: link.animation || null,
      blend_value: link.blend_value,
    })),
    transitions: state.transitions.map((transition) => ({
      uuid: transition.uuid,
      target_uuid: transition.target,
      condition: transition.condition,
    })),
    sounds: state.sounds.map((sound) => ({
      uuid: sound.uuid,
      effect: sound.effect,
      ...(sound.file ? { file: sound.file } : {}),
    })),
    particles: state.particles.map((particle) => ({
      uuid: particle.uuid,
      effect: particle.effect,
      locator: particle.locator || null,
      bind_to_actor: particle.bind_to_actor,
      pre_effect_script: particle.pre_effect_script || null,
      ...(particle.file ? { file: particle.file } : {}),
    })),
  };
}

export function validateFinalControllerPlan(plan: ControllerPlan): void {
  if (!plan.states.length) {
    throw new Error("AnimationController must contain at least one state.");
  }

  const initial = plan.states.find(
    (state) => state.uuid === plan.initial_state
  );
  if (!initial) {
    throw new Error(
      "AnimationController initial_state does not resolve to a retained state. Add/set an initial state in the same batch."
    );
  }

  for (const state of plan.states) {
    for (const transition of state.transitions) {
      if (!plan.states.some((target) => target.uuid === transition.target)) {
        throw new Error(
          `Transition "${transition.uuid}" in state "${state.name}" targets a missing state.`
        );
      }
    }
  }
}
