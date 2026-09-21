import { describe, expect, test } from "bun:test";
import { compileSequenceRecipe } from "@/lib/animation/sequenceRecipe";
import { compileMotionRecipe } from "@/lib/animation/motionRecipe";

describe("animation sequence recipe",()=>{
  test("expands step timing and holds deterministically",()=>{
    const motion=compileSequenceRecipe({
      name:"fisher_loop",loop:true,
      steps:[
        {id:"sit",duration:1,bones:{body:{rotation:[0,0,0]}},hold:0.5},
        {id:"cast",duration:0.5,bones:{arm:{rotation:[-60,0,0]}}},
      ],
    });
    expect(motion.poses.map(p=>p.time)).toEqual([0,1,1.5]);
    expect(compileMotionRecipe(motion).duration).toBe(2);
  });
});
