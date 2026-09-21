import type { CompiledMotionRecipe, CompiledMotionKeyframe, MotionVec3 } from "@/lib/animation/motionRecipe";

export type ContactConstraint = {
  bone: string;
  channel: "position";
  start: number;
  end: number;
  value: MotionVec3;
};

function frameAt(frames:readonly CompiledMotionKeyframe[],time:number):CompiledMotionKeyframe|undefined{
  return frames.find(frame=>frame.time===time);
}

export function applyContactConstraints(
  recipe:CompiledMotionRecipe,
  constraints:readonly ContactConstraint[]
):CompiledMotionRecipe{
  const bones={...recipe.bones};
  for(const constraint of constraints){
    if(!Number.isFinite(constraint.start)||!Number.isFinite(constraint.end)||constraint.start<0||constraint.end<constraint.start||constraint.end>recipe.duration) {
      throw new Error("Contact constraint requires a finite non-negative range within the motion duration.");
    }
    if(constraint.value.length!==3||constraint.value.some(value=>!Number.isFinite(value))){
      throw new Error("Contact constraint value must contain three finite values.");
    }
    const frames=bones[constraint.bone];
    if(!frames) throw new Error("Contact constraint references missing bone "+constraint.bone+".");
    const next=frames.map(frame=>{
      if(frame.time<constraint.start||frame.time>constraint.end) return {...frame};
      return {...frame,position:[...constraint.value] as MotionVec3};
    });
    for(const time of new Set([constraint.start,constraint.end])){
      const existing=frameAt(next,time);
      if(existing){
        existing.position=[...constraint.value] as MotionVec3;
      }else{
        next.push({time,position:[...constraint.value] as MotionVec3});
      }
    }
    next.sort((a,b)=>a.time-b.time);
    bones[constraint.bone]=next;
  }
  return {...recipe,bones};
}
