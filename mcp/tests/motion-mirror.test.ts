import { describe, expect, test } from "bun:test";
import { compileMotionRecipe } from "@/lib/animation/motionRecipe";
import { mirrorMotionBone } from "@/lib/animation/mirror";

describe("motion symmetry",()=>{
  test("mirrors explicit counterpart motion without duplicating authored poses",()=>{
    const recipe=compileMotionRecipe({name:"walk",poses:[
      {id:"a",time:0,bones:{leg_L:{rotation:[20,5,0]}}},
      {id:"b",time:0.5,bones:{leg_L:{rotation:[-20,5,0]}}},
    ]});
    const mirrored=mirrorMotionBone(recipe,"leg_L","leg_R","X");
    expect(mirrored.bones.leg_R[0].rotation).toEqual([-20,5,0]);
  });
});
