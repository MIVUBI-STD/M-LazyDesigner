import type { CompiledMotionRecipe, MotionVec3 } from "@/lib/animation/motionRecipe";

const AXIS_INDEX={X:0,Y:1,Z:2} as const;

function mirrorVector(values:MotionVec3,axis:"X"|"Y"|"Z"):MotionVec3{
  const next=[...values] as MotionVec3;
  next[AXIS_INDEX[axis]]*=-1;
  return next;
}

export function mirrorMotionBone(
  recipe:CompiledMotionRecipe,
  sourceBone:string,
  targetBone:string,
  axis:"X"|"Y"|"Z"
):CompiledMotionRecipe{
  const source=recipe.bones[sourceBone];
  if(!source) throw new Error("Motion mirror source bone is missing: "+sourceBone+".");
  if(recipe.bones[targetBone]) throw new Error("Motion mirror target bone already exists: "+targetBone+".");
  return {
    ...recipe,
    bones:{
      ...recipe.bones,
      [targetBone]:source.map(frame=>({
        ...frame,
        ...(frame.position?{position:mirrorVector(frame.position,axis)}:{}),
        ...(frame.rotation?{rotation:mirrorVector(frame.rotation,axis)}:{}),
      })),
    },
  };
}
