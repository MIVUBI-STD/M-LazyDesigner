import { describe, expect, test } from "bun:test";
import { planSemanticUv } from "@/lib/uv/semanticPlanner";

describe("semantic UV incremental padding",()=>{
  test("retains padded footprint around unchanged islands",()=>{
    const before=planSemanticUv([
      {id:"a",world_size:[4,4],cohort:"base"},
      {id:"b",world_size:[4,4],cohort:"base"},
    ],{atlas_width:32,atlas_height:16,default_texel_density:1,padding:1});
    const next=planSemanticUv([
      {id:"a",world_size:[6,4],cohort:"base"},
      {id:"b",world_size:[4,4],cohort:"base"},
    ],{
      atlas_width:32,atlas_height:16,default_texel_density:1,padding:1,
      previous_placements:before.owner_placements,affected_ids:["a"]
    });
    const b=next.placements.find(p=>p.id==="b")!;
    const a=next.placements.find(p=>p.id==="a")!;
    const horizontalGap=Math.max(a.x-b.x-b.width,b.x-a.x-a.width);
    const verticalGap=Math.max(a.y-b.y-b.height,b.y-a.y-a.height);
    expect(horizontalGap>=2 || verticalGap>=2).toBe(true);
  });
});
