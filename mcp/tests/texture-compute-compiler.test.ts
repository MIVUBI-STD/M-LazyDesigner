import { describe, expect, test } from "bun:test";
import { compileTextureRefinementIntent } from "@/lib/texture/computeCompiler";

describe("texture refinement compiler",()=>{
  test("compiles semantic refinement into exact existing compute contract",()=>{
    const result=compileTextureRefinementIntent({
      auto_levels:{strength:0.5},
      directional_shade:{strength:0.4,azimuth_degrees:45},
      posterize_levels:6,
      palette:[[0,0,0],[255,255,255]],
      ordered_dither:true,
      target_rect:{x:4,y:4,width:16,height:16},
    });
    expect(result.compute.map(step=>step.operation)).toEqual([
      "auto_levels","directional_shade","posterize","palettize"
    ]);
    expect(result.compute[0].args?.target_rect).toEqual({x:4,y:4,width:16,height:16});
    expect(result.compute.slice(1).every(step=>step.args?.target_rect===undefined)).toBe(true);
  });
});
