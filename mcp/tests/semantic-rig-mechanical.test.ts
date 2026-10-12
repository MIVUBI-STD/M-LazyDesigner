import { describe, expect, test } from "bun:test";
import { compileMechanicalRigIntent } from "@/lib/rig/mechanicalTemplates";
import { inferFunctionalRigHints, compileHighConfidenceFunctionalRig } from "@/lib/rig/functionalInference";
import type { CompiledAuthoringRecipe } from "@/lib/authoringRecipe/contracts";

const compiled: CompiledAuthoringRecipe = {
  schema: 1, compiler_version: 1, recipe_id: "r",
  placements: [{ id:"door", name:"door", prototype_id:"p", from:[2,0,0], to:[6,8,1], origin:[4,4,0.5], rotation:[0,0,0], inflate:0, source_pattern_id:"p", instance_index:0 }],
  symmetry_relationships: [],
  metrics:{prototype_count:1,pattern_count:1,instance_count:1,realized_cube_count:1,unique_geometry_count:1,repeated_instance_count:0,symmetry_generated_count:0},
};

describe("mechanical rig templates", () => {
  test("derives hinge pivot from geometry edge", () => {
    const bone = compileMechanicalRigIntent(compiled, {
      kind:"HINGE", id:"door_hinge", name:"door_hinge", instance_id:"door", hinge_axis:"X", hinge_side:"MIN"
    });
    expect(bone.origin).toEqual([2,4,0.5]);
  });

  test("uses center for rotator/slider foundations", () => {
    expect(compileMechanicalRigIntent(compiled, {
      kind:"ROTATOR", id:"wheel", name:"wheel", instance_id:"door", axis:"Z"
    }).origin).toEqual([4,4,0.5]);
  });

  test("a mechanical name and axis token cannot authorize a native hinge or guess a hinge side", () => {
    const named = { ...compiled, placements: [{ ...compiled.placements[0]!, name: "door_y" }] };
    const hints = inferFunctionalRigHints(named);
    expect(hints[0]?.kind).toBe("HINGE");
    expect(hints[0]?.axis).toBe("Y");
    expect(hints[0]?.hinge_side).toBeUndefined();
    expect(hints[0]?.confidence).toBeLessThan(0.8);
    expect(hints[0]?.evidence).toContain("mechanism:unverified");
    expect(compileHighConfidenceFunctionalRig(hints)).toEqual([]);
    expect(compileHighConfidenceFunctionalRig([{ ...hints[0]!, confidence: 0.99 }])).toEqual([]);
  });

  test("only independently confirmed mechanism intent compiles, preserving explicit hinge side", () => {
    const hint = inferFunctionalRigHints(compiled)[0]!;
    const prepared = { ...hint, confidence: 0.95, confirmed_intent: {
      kind: "HINGE" as const, axis: "Z" as const, hinge_side: "MAX" as const,
      evidence_ref: "reference:door-hinge-side",
    } };
    const intent = compileHighConfidenceFunctionalRig([prepared])[0]!;
    expect(intent).toMatchObject({ kind: "HINGE", instance_id: "door", hinge_axis: "Z", hinge_side: "MAX" });
    expect(compileMechanicalRigIntent(compiled, intent).origin).toEqual([4, 4, 1]);
    expect(() => compileHighConfidenceFunctionalRig([{
      ...prepared, confirmed_intent: { ...prepared.confirmed_intent, evidence_ref: "" },
    }])).toThrow("evidence reference");
  });

  test("invalid or duplicated hint identities are rejected before rig planning", () => {
    const hint = inferFunctionalRigHints(compiled)[0]!;
    expect(() => compileHighConfidenceFunctionalRig([{ ...hint, confidence: Number.NaN }])).toThrow("confidence");
    expect(() => compileHighConfidenceFunctionalRig([hint, hint])).toThrow("unique");
  });
});
