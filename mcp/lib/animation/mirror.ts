import type { CompiledMotionRecipe, MotionVec3 } from "@/lib/animation/motionRecipe";

const AXIS_INDEX={X:0,Y:1,Z:2} as const;
type RotationSigns=[1|-1,1|-1,1|-1];

function mirrorPosition(values:MotionVec3,axis:"X"|"Y"|"Z"):MotionVec3{
  const next=[...values] as MotionVec3;
  next[AXIS_INDEX[axis]]*=-1;
  return next;
}

function mirrorRotation(values:MotionVec3,signs:RotationSigns):MotionVec3{
  return [values[0]*signs[0],values[1]*signs[1],values[2]*signs[2]];
}

export function mirrorMotionBone(
  recipe:CompiledMotionRecipe,
  sourceBone:string,
  targetBone:string,
  axis:"X"|"Y"|"Z",
  options:{rotation_signs?:RotationSigns}={}
):CompiledMotionRecipe{
  const source=recipe.bones[sourceBone];
  if(!source) throw new Error("Motion mirror source bone is missing: "+sourceBone+".");
  if(recipe.bones[targetBone]) throw new Error("Motion mirror target bone already exists: "+targetBone+".");
  if(source.some(frame=>frame.rotation!==undefined) && !options.rotation_signs){
    throw new Error(
      "Motion rotation mirroring requires explicit Euler rotation_signs; reflection of authored Euler channels is convention-dependent and will not be guessed."
    );
  }
  return {
    ...recipe,
    bones:{
      ...recipe.bones,
      [targetBone]:source.map(frame=>({
        ...frame,
        ...(frame.position?{position:mirrorPosition(frame.position,axis)}:{}),
        ...(frame.rotation?{rotation:mirrorRotation(frame.rotation,options.rotation_signs!)}:{}),
      })),
    },
  };
}
