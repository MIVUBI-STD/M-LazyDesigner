import { describe, expect, test } from "bun:test";
import { compilePbrIntent } from "@/lib/texture/pbrIntent";

describe("PBR material intent",()=>{
  test("compiles semantic presets into existing material values",()=>{
    const result=compilePbrIntent({kind:"PAINTED_METAL",name:"blue metal"});
    expect(result.name).toBe("blue metal");
    expect(result.mer_value[0]).toBeGreaterThan(result.mer_value[2]);
  });
});
