import { describe, expect, test } from "bun:test";
import { compileMotionRecipe } from "@/lib/animation/motionRecipe";
import { mirrorMotionBone } from "@/lib/animation/mirror";

describe("motion symmetry",()=>{
  test("requires explicit Euler rotation policy",()=>{
    const recipe=compileMotionRecipe({name:"walk",poses:[
      {id:"a",time:0,bones:{leg_L:{rotation:[20,5,0],position:[-1,0,0]}}},
    ]});
    expect(()=>mirrorMotionBone(recipe,"leg_L","leg_R","X")).toThrow("rotation_signs");
    const mirrored=mirrorMotionBone(recipe,"leg_L","leg_R","X",{
      rotation_signs:[-1,1,1],
    });
    expect(mirrored.bones.leg_R[0].rotation).toEqual([-20,5,0]);
    expect(mirrored.bones.leg_R[0].position).toEqual([1,0,0]);
  });
});
