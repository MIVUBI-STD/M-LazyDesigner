import { describe, expect, test } from "bun:test";
import { edgeMask, combineMasks } from "@/lib/texture/masks";

describe("procedural texture masks",()=>{
  test("builds deterministic edge masks",()=>{
    const edge=edgeMask(5,5,2);
    expect(edge.values[0]).toBe(1);
    expect(edge.values[12]).toBe(0);
    expect(combineMasks(edge,edge,"MULTIPLY").values[0]).toBe(1);
  });
});
