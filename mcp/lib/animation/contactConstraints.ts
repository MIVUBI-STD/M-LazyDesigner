import type { CompiledMotionRecipe, MotionVec3 } from "@/lib/animation/motionRecipe";

export type ContactConstraint = {
  bone: string;
  channel: "position";
  start: number;
  end: number;
  value: MotionVec3;
};

export function applyContactConstraints(
  recipe:CompiledMotionRecipe,
  constraints:readonly ContactConstraint[]
):CompiledMotionRecipe{
  const bones={...recipe.bones};
  for(const constraint of constraints){
    if(!Number.isFinite(constraint.start)||!Number.isFinite(constraint.end)||constraint.start<0||constraint.end<constraint.start) {
      throw new Error("Contact constraint requires a finite non-negative range.");
    }
    const frames=bones[constraint.bone];
    if(!frames) throw new Error("Contact constraint references missing bone "+constraint.bone+".");
    bones[constraint.bone]=frames.map(frame=>{
      if(frame.time<constraint.start||frame.time>constraint.end) return frame;
      return {...frame,position:[...constraint.value] as MotionVec3};
    });
  }
  return {...recipe,bones};
}
