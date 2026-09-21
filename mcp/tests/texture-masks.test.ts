import { describe, expect, test } from "bun:test";
import { edgeMask } from "@/lib/texture/masks";
import { renderTextureSourceRecipe } from "@/lib/texture/sourceComposer";

describe("procedural texture masks",()=>{
  test("builds deterministic edge masks and uses them in source composition",()=>{
    const edge=edgeMask(5,5,2);
    expect(edge.values[0]).toBe(1);
    expect(edge.values[12]).toBe(0);
    const rendered=renderTextureSourceRecipe({
      material:{kind:"PLASTIC",width:5,height:5,base:[20,20,20,255],variation:0},
      edge_treatment:{color:[100,100,100,255],strength:1,falloff:2},
    });
    expect(rendered[0]).toBe(100);
    expect(rendered[(2*5+2)*4]).toBe(20);
  });
});
