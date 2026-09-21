import { describe, expect, test } from "bun:test";
import { compileNewTextureNativePlan, compileTextureRefinementNativePlan } from "@/lib/texture/nativePlan";

describe("material recipe native plans",()=>{
  test("keeps new-source and existing-refinement paths distinct",()=>{
    const create=compileNewTextureNativePlan({
      material:{kind:"PLASTIC",width:4,height:4,base:[20,40,60,255]},
      pattern:{kind:"STRIPES",axis:"x",width:2,a:[20,40,60,255],b:[30,50,70,255]},
      pattern_opacity:0.5,
    });
    expect(create.kind).toBe("CREATE_TEXTURE_SOURCE");
    expect(create.rgba).toHaveLength(4*4*4);

    const refine=compileTextureRefinementNativePlan({posterize_levels:4},"sha256:test");
    expect(refine.kind).toBe("PAINT_TEXTURE_COMPUTE");
    expect(refine.compute[0].operation).toBe("posterize");
  });
});
