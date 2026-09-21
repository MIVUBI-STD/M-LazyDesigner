import { describe, expect, test } from "bun:test";
import { placementAnchor } from "@/lib/rig/semanticRig";

describe("semantic rig rotated source safety",()=>{
  test("fails closed instead of deriving anchors from untransformed bounds",()=>{
    expect(()=>placementAnchor({
      id:"door",name:"door",prototype_id:"p",
      from:[0,0,0],to:[4,8,1],origin:[0,4,0.5],rotation:[0,45,0],inflate:0,
      source_pattern_id:"p",instance_index:0,
    },["MIN","CENTER","CENTER"])).toThrow("transformed-anchor semantics");
  });
});
