import { describe, expect, test } from "bun:test";
import { compileMotionRecipe } from "@/lib/animation/motionRecipe";
import { diffCompiledMotion } from "@/lib/animation/diff";

describe("motion recipe affected-only diff",()=>{
  test("isolates changed bones",()=>{
    const a=compileMotionRecipe({name:"a",poses:[
      {id:"p0",time:0,bones:{arm:{rotation:[0,0,0]},head:{rotation:[0,0,0]}}},
      {id:"p1",time:1,bones:{arm:{rotation:[10,0,0]},head:{rotation:[5,0,0]}}},
    ]});
    const b=compileMotionRecipe({name:"a",poses:[
      {id:"p0",time:0,bones:{arm:{rotation:[0,0,0]},head:{rotation:[0,0,0]}}},
      {id:"p1",time:1,bones:{arm:{rotation:[20,0,0]},head:{rotation:[5,0,0]}}},
    ]});
    expect(diffCompiledMotion(a,b)).toEqual({
      affected_bones:["arm"],removed_bones:[],unchanged_bones:["head"]
    });
  });
});
