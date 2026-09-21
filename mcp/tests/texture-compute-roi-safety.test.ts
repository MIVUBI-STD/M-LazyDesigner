import { describe, expect, test } from "bun:test";
import { compileTextureRefinementIntent } from "@/lib/texture/computeCompiler";

describe("texture refinement ROI safety",()=>{
  test("rejects ordered dither inside a bounded ROI",()=>{
    expect(()=>compileTextureRefinementIntent({
      target_rect:{x:0,y:0,width:8,height:8},
      palette:[[0,0,0],[255,255,255]],
      ordered_dither:true,
    })).toThrow("not ROI-safe");
  });
});
