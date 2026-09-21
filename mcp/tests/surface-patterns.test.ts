import { describe, expect, test } from "bun:test";
import { renderSurfacePattern } from "@/lib/texture/surfacePatterns";

describe("surface patterns",()=>{
  test("renders deterministic checker and panel patterns",()=>{
    const checker=renderSurfacePattern(4,4,{kind:"CHECKER",cell:2,a:[0,0,0,255],b:[255,255,255,255]});
    expect(checker[0]).toBe(0);
    expect(checker[(0*4+2)*4]).toBe(255);
    const panel=renderSurfacePattern(4,4,{kind:"PANEL",spacing_x:2,spacing_y:2,line_width:1,base:[10,10,10,255],line:[20,20,20,255]});
    expect(panel[0]).toBe(20);
  });
});
