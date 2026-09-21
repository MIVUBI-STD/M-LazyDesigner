import { describe, expect, test } from "bun:test";
import { compileCreateTextureSourcePayload } from "@/lib/texture/createTextureAdapter";

describe("procedural texture create adapter",()=>{
  test("compiles RGBA source into the existing create_texture data contract",()=>{
    const payload=compileCreateTextureSourcePayload(
      "demo",
      {kind:"CREATE_TEXTURE_SOURCE",width:2,height:2,rgba:new Uint8Array(16)},
      (_pixels,width,height)=>"data:image/png;base64,"+width+"x"+height
    );
    expect(payload).toEqual({
      name:"demo",type:"blank",width:2,height:2,data:"data:image/png;base64,2x2"
    });
  });
});
