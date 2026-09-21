import { describe, expect, test } from "bun:test";
import { projectFreshnessInvalidation } from "@/lib/orchestration/freshnessProjection";

describe("orchestration freshness projection",()=>{
  test("projects into existing Control freshness vocabulary",()=>{
    const result=projectFreshnessInvalidation({
      geometry:{upsert_instance_ids:["a"],remove_instance_ids:[],metadata_only_instance_ids:[],preserved_instance_ids:[]},
      uv:{stale:true,affected_island_ids:["a:north"],scope:"AFFECTED_ONLY"},
      rig:{stale:true,affected_instance_ids:["a"],scope:"AFFECTED_ONLY"},
      animation:{stale:true,affected_instance_ids:["a"],scope:"AFFECTED_ONLY"},
      texture:{stale:true,reason:"UV_CHANGED",scope:"AFFECTED_SURFACES"},
      symmetry_changed_relation_ids:[],
    });
    expect(result).toEqual([
      "GEOMETRY_STRUCTURE","UV_MAPPING","TEXTURE_APPEARANCE","ANIMATION_MOTION"
    ]);
  });
});
