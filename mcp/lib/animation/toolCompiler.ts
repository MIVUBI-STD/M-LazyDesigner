import type { CompiledMotionRecipe, MotionChannel } from "@/lib/animation/motionRecipe";

export function compileMotionToCreateAnimation(recipe: CompiledMotionRecipe) {
  return {
    name: recipe.name,
    loop: recipe.loop,
    animation_length: recipe.duration,
    bones: Object.fromEntries(
      Object.entries(recipe.bones).map(([bone,keyframes])=>[
        bone,
        keyframes.map((keyframe)=>({
          time:keyframe.time,
          ...(keyframe.position ? { position:keyframe.position } : {}),
          ...(keyframe.rotation ? { rotation:keyframe.rotation } : {}),
          ...(keyframe.scale !== undefined ? { scale:keyframe.scale } : {}),
        })),
      ])
    ),
  };
}

export type KeyframeToolRequest = {
  animation_id?: string;
  action:"create";
  bone_name:string;
  channel:MotionChannel;
  keyframes:Array<{
    time:number;
    values:number | string | Array<number|string>;
    interpolation?:string;
  }>;
};

export function compileMotionToKeyframeRequests(
  recipe: CompiledMotionRecipe,
  affectedBones?: readonly string[]
): KeyframeToolRequest[] {
  const filter=affectedBones?new Set(affectedBones):null;
  const requests:KeyframeToolRequest[]=[];
  for(const [bone,frames] of Object.entries(recipe.bones)){
    if(filter && !filter.has(bone)) continue;
    for(const channel of ["position","rotation","scale"] as const){
      const keyframes=frames.flatMap(frame=>{
        const value=frame[channel];
        if(value===undefined) return [];
        return [{
          time:frame.time,
          values:value as number | Array<number|string>,
          ...(frame.interpolation ? { interpolation:frame.interpolation } : {}),
        }];
      });
      if(keyframes.length>0) requests.push({action:"create",bone_name:bone,channel,keyframes});
    }
  }
  return requests;
}
