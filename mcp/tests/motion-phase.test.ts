import { describe, expect, test } from "bun:test";
import { compileCyclicPhaseRecipe } from "@/lib/animation/phaseRecipe";
import { compileMotionRecipe } from "@/lib/animation/motionRecipe";

describe("cyclic phase motion",()=>{
  test("maps normalized phase to deterministic keyframe times",()=>{
    const motion=compileCyclicPhaseRecipe({
      name:"walk",duration:2,samples:[
        {phase:0,bone:"leg_L",channel:"rotation",value:[20,0,0]},
        {phase:0.5,bone:"leg_L",channel:"rotation",value:[-20,0,0]},
        {phase:1,bone:"leg_L",channel:"rotation",value:[20,0,0]},
      ]
    });
    expect(motion.poses.map(p=>p.time)).toEqual([0,1,2]);
    expect(compileMotionRecipe(motion).loop).toBe(true);
  });
});
