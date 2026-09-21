import {
  compileMotionRecipe,
  type CompiledMotionRecipe,
  type MotionChannel,
  type MotionRecipe,
} from "@/lib/animation/motionRecipe";
import {
  compileSecondaryMotion,
  type SecondaryMotionLink,
} from "@/lib/animation/secondaryMotion";

function createAnimationPayload(recipe:CompiledMotionRecipe){
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

export function compileMotionToCreateAnimation(recipe: CompiledMotionRecipe) {
  if(Object.values(recipe.bones).some(frames=>frames.some(frame=>frame.interpolation!==undefined))){
    throw new Error(
      "create_animation does not author interpolation metadata. Use compileMotionToCreateAnimationPlan so interpolation is applied through bounded post-create manage_keyframes edits."
    );
  }
  return createAnimationPayload(recipe);
}

export type KeyframeToolRequest = {
  animation_id?: string;
  action:"create"|"edit";
  bone_name:string;
  channel:MotionChannel;
  keyframes:Array<{
    time:number;
    values?:number | string | Array<number|string>;
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

export function compileMotionToCreateAnimationPlan(recipe:CompiledMotionRecipe){
  const postCreateEdits:KeyframeToolRequest[]=[];
  for(const [bone,frames] of Object.entries(recipe.bones)){
    for(const channel of ["position","rotation","scale"] as const){
      const edits=frames.flatMap(frame=>
        frame[channel]!==undefined && frame.interpolation!==undefined
          ? [{time:frame.time,interpolation:frame.interpolation}]
          : []
      );
      if(edits.length>0){
        postCreateEdits.push({
          action:"edit",
          bone_name:bone,
          channel,
          keyframes:edits,
        });
      }
    }
  }
  return {
    create_animation:createAnimationPayload(recipe),
    post_create_keyframe_edits:postCreateEdits,
  };
}

export function compileMotionWithSecondaryToCreateAnimationPlan(
  recipe:MotionRecipe,
  links:readonly SecondaryMotionLink[]
){
  return compileMotionToCreateAnimationPlan(
    compileMotionRecipe(compileSecondaryMotion(recipe,links))
  );
}
