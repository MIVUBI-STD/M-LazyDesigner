import type { MotionRecipe, MotionPose, MotionVec3 } from "@/lib/animation/motionRecipe";

export type PhaseSample = {
  phase: number;
  bone: string;
  channel: "position" | "rotation";
  value: MotionVec3;
};

export type CyclicPhaseRecipe = {
  name: string;
  duration: number;
  loop?: boolean;
  samples: readonly PhaseSample[];
};

function phaseTime(phase:number,duration:number):number{
  if(!Number.isFinite(phase)||phase<0||phase>1) throw new Error("Animation phase must be within 0..1.");
  return phase*duration;
}

export function compileCyclicPhaseRecipe(recipe:CyclicPhaseRecipe):MotionRecipe{
  if(!recipe.name.trim()) throw new Error("Cyclic phase recipe requires a non-empty name.");
  if(!Number.isFinite(recipe.duration)||recipe.duration<=0||recipe.duration>10000) throw new Error("Cyclic phase duration must be finite and within 0..10000.");
  const posesByTime=new Map<number,MotionPose>();
  for(const sample of recipe.samples){
    if(!sample.bone.trim()) throw new Error("Cyclic phase sample requires a bone identity.");
    if(sample.value.length!==3||sample.value.some(v=>!Number.isFinite(v))) throw new Error("Cyclic phase sample values must be finite vec3.");
    const time=phaseTime(sample.phase,recipe.duration);
    const pose=posesByTime.get(time) ?? {id:"phase_"+sample.phase,time,bones:{}};
    const current={...(pose.bones[sample.bone] ?? {})};
    current[sample.channel]=[...sample.value] as MotionVec3;
    pose.bones={...pose.bones,[sample.bone]:current};
    posesByTime.set(time,pose);
  }
  return {
    name:recipe.name,
    loop:recipe.loop ?? true,
    duration:recipe.duration,
    poses:[...posesByTime.values()].sort((a,b)=>a.time-b.time),
  };
}
