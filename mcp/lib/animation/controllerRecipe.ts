export type ControllerRecipeTransition = {
  target: string;
  condition: string;
};

export type ControllerRecipeState = {
  id: string;
  name: string;
  animation?: string;
  animation_blend?: number | string;
  on_entry?: string;
  on_exit?: string;
  blend_transition?: number;
  transitions?: readonly ControllerRecipeTransition[];
};

export type ControllerRecipe = {
  name: string;
  initial_state: string;
  states: readonly ControllerRecipeState[];
};

export type ControllerRecipeOperation = Record<string, string | number | boolean>;

export function compileControllerRecipe(recipe: ControllerRecipe) {
  if (!recipe.name.trim()) throw new Error("Controller recipe requires a name.");
  if (recipe.states.length === 0) throw new Error("Controller recipe requires at least one state.");
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const state of recipe.states) {
    if (!state.id.trim() || ids.has(state.id)) throw new Error("Controller recipe state IDs must be non-empty and unique.");
    if (!state.name.trim() || names.has(state.name)) throw new Error("Controller recipe state names must be non-empty and unique.");
    ids.add(state.id); names.add(state.name);
  }
  const initial = recipe.states.find((state) => state.id === recipe.initial_state);
  if (!initial) throw new Error("Controller recipe initial_state must reference a state ID.");
  const stateById = new Map(recipe.states.map((state) => [state.id, state]));
  const operations: ControllerRecipeOperation[] = [];

  for (const state of recipe.states) {
    const op: ControllerRecipeOperation = { op: "add_state", name: state.name };
    if (state.on_entry !== undefined) op.on_entry = state.on_entry;
    if (state.on_exit !== undefined) op.on_exit = state.on_exit;
    if (state.blend_transition !== undefined) op.blend_transition = state.blend_transition;
    operations.push(op);
  }
  for (const state of recipe.states) {
    if (state.animation) {
      const op: ControllerRecipeOperation = { op: "add_animation", state: state.name, animation: state.animation };
      if (state.animation_blend !== undefined) op.blend_value = state.animation_blend;
      operations.push(op);
    }
    for (const transition of state.transitions ?? []) {
      const target = stateById.get(transition.target);
      if (!target) throw new Error("Controller recipe transition from " + state.id + " targets unknown state " + transition.target + ".");
      if (!transition.condition.trim()) throw new Error("Controller recipe transition conditions must be non-empty.");
      operations.push({ op: "add_transition", state: state.name, target: target.name, condition: transition.condition });
    }
  }
  operations.push({ op: "set_initial_state", state: initial.name });
  return { create_name: recipe.name, operations };
}
