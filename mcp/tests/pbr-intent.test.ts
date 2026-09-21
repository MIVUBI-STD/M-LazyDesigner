import { describe, expect, test } from "bun:test";
import { compilePbrIntent } from "@/lib/texture/pbrIntent";

describe("PBR material intent",()=>{
  test("uses dielectric metalness for painted metal and metallic for bare metal",()=>{
    const painted=compilePbrIntent({kind:"PAINTED_METAL",name:"paint"});
    const bare=compilePbrIntent({kind:"BARE_METAL",name:"steel"});
    expect(painted.mer_value[0]).toBe(0);
    expect(bare.mer_value[0]).toBe(255);
  });
});
