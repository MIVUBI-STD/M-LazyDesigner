import type { CompiledMotionRecipe, CompiledMotionKeyframe } from "@/lib/animation/motionRecipe";

function frameKey(frame: CompiledMotionKeyframe): string {
  return JSON.stringify(frame);
}

export function diffCompiledMotion(previous: CompiledMotionRecipe, next: CompiledMotionRecipe) {
  const bones=new Set([...Object.keys(previous.bones),...Object.keys(next.bones)]);
  const affected_bones:string[]=[];
  const unchanged_bones:string[]=[];
  const removed_bones:string[]=[];
  for(const bone of bones){
    const before=previous.bones[bone];
    const after=next.bones[bone];
    if(!after){removed_bones.push(bone);continue;}
    if(!before || before.length!==after.length || before.some((frame,index)=>frameKey(frame)!==frameKey(after[index]))){
      affected_bones.push(bone);
    } else {
      unchanged_bones.push(bone);
    }
  }
  return {
    affected_bones:affected_bones.sort(),
    removed_bones:removed_bones.sort(),
    unchanged_bones:unchanged_bones.sort(),
  };
}
