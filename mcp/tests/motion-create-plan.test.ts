import { describe, expect, test } from "bun:test";
import { compileMotionRecipe } from "@/lib/animation/motionRecipe";
import {
  compileMotionToCreateAnimation,
  compileMotionToCreateAnimationPlan,
} from "@/lib/animation/toolCompiler";

describe("motion create plan",()=>{
  test("does not silently drop interpolation unsupported by create_animation",()=>{
    const recipe=compileMotionRecipe({name:"clip",poses:[
      {id:"a",time:0,bones:{arm:{rotation:[0,0,0],interpolation:"step"}}},
      {id:"b",time:1,bones:{arm:{rotation:[10,0,0],interpolation:"linear"}}},
    ]});
    expect(()=>compileMotionToCreateAnimation(recipe)).toThrow("does not author interpolation");
    const plan=compileMotionToCreateAnimationPlan(recipe);
    expect(plan.post_create_keyframe_edits).toHaveLength(1);
    expect(plan.post_create_keyframe_edits[0].action).toBe("edit");
  });
});
