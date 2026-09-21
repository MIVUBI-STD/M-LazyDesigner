import { describe, expect, test } from "bun:test";
import { compileMotionRecipe } from "@/lib/animation/motionRecipe";
import { applyContactConstraints } from "@/lib/animation/contactConstraints";

describe("motion contact constraints",()=>{
  test("inserts exact hold boundaries and locks existing frames inside the range",()=>{
    const recipe=compileMotionRecipe({name:"step",duration:1,poses:[
      {id:"a",time:0,bones:{foot:{position:[0,0,0]}}},
      {id:"b",time:0.5,bones:{foot:{position:[1,0,0]}}},
      {id:"c",time:1,bones:{foot:{position:[2,0,0]}}},
    ]});
    const constrained=applyContactConstraints(recipe,[{
      bone:"foot",channel:"position",start:0.2,end:0.7,value:[0,0,0]
    }]);
    expect(constrained.bones.foot.map(f=>f.time)).toEqual([0,0.2,0.5,0.7,1]);
    expect(constrained.bones.foot.slice(1,4).map(f=>f.position)).toEqual([
      [0,0,0],[0,0,0],[0,0,0]
    ]);
  });
});
