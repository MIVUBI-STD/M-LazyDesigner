import { describe, expect, test } from "bun:test";
import { compileMotionRecipe } from "@/lib/animation/motionRecipe";
import { compileMotionToCreateAnimation, compileMotionToKeyframeRequests } from "@/lib/animation/toolCompiler";

describe("motion recipe compiler",()=>{
  test("compiles semantic poses into existing animation contracts",()=>{
    const compiled=compileMotionRecipe({
      name:"fisher_cast",loop:false,
      poses:[
        {id:"ready",time:0,bones:{arm:{rotation:[0,0,0]}}},
        {id:"cast",time:0.5,bones:{arm:{rotation:[-70,0,20]}}},
        {id:"settle",time:1,bones:{arm:{rotation:[-20,0,0]}}},
      ],
    });
    const create=compileMotionToCreateAnimation(compiled);
    expect(create.bones.arm).toHaveLength(3);
    expect(create.animation_length).toBe(1);
    const requests=compileMotionToKeyframeRequests(compiled,["arm"]);
    expect(requests).toHaveLength(1);
    expect(requests[0].channel).toBe("rotation");
  });
});
