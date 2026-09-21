import type { CompiledMotionRecipe } from "@/lib/animation/motionRecipe";
import type { ControllerRecipe } from "@/lib/animation/controllerRecipe";

export type MotionControllerState = {
  id:string;
  motion:CompiledMotionRecipe;
  transitions?:readonly {target:string;condition:string}[];
};

export function compileMotionSetToController(
  name:string,
  initial_state:string,
  states:readonly MotionControllerState[]
):ControllerRecipe{
  if(!name.trim()) throw new Error("Motion controller requires a non-empty name.");
  if(states.length===0) throw new Error("Motion controller requires at least one state.");
  const ids=new Set(states.map(s=>s.id));
  if(ids.size!==states.length) throw new Error("Motion controller state IDs must be unique.");
  if(!ids.has(initial_state)) throw new Error("Motion controller initial state is missing.");
  return {
    name,
    initial_state,
    states:states.map(state=>({
      id:state.id,
      name:state.id,
      animation:state.motion.name.startsWith("animation.")?state.motion.name:"animation."+state.motion.name,
      transitions:state.transitions,
    })),
  };
}
