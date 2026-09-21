import { describe, expect, test } from "bun:test";
import { compileMotionRecipe } from "@/lib/animation/motionRecipe";
import { compileMotionSetToController } from "@/lib/animation/controllerLink";
import { compileControllerRecipe } from "@/lib/animation/controllerRecipe";

describe("motion to controller linkage",()=>{
  test("reuses controller recipe compiler",()=>{
    const idle=compileMotionRecipe({name:"idle",poses:[{id:"i",time:0,bones:{body:{rotation:[0,0,0]}}}]});
    const cast=compileMotionRecipe({name:"cast",poses:[{id:"c",time:0,bones:{arm:{rotation:[-60,0,0]}}}]});
    const recipe=compileMotionSetToController("controller.animation.fisher","idle",[
      {id:"idle",motion:idle,transitions:[{target:"cast",condition:"query.any_animation_finished"}]},
      {id:"cast",motion:cast,transitions:[{target:"idle",condition:"query.all_animations_finished"}]},
    ]);
    expect(compileControllerRecipe(recipe).operations.at(-1)).toEqual({op:"set_initial_state",state:"idle"});
  });
});
