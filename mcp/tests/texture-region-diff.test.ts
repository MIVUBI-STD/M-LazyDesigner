import { describe, expect, test } from "bun:test";
import { diffTextureRegion } from "@/lib/texture/regionDiff";

describe("texture affected-region diff",()=>{
  test("returns the smallest changed bounding rectangle",()=>{
    const a=new Uint8Array(4*4*4);
    const b=new Uint8Array(a);
    b[(2*4+1)*4]=255;
    b[(3*4+2)*4]=255;
    expect(diffTextureRegion(a,b,4,4)).toEqual({
      changed:true,rect:{x:1,y:2,width:2,height:2},changed_pixels:2
    });
  });
});
