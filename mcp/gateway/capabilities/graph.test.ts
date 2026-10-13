import { describe, expect, test } from "bun:test";
import {
  applyCapabilityGraphOutcome,
  evaluateCapabilityPreconditions,
  seedCapabilityFacts,
} from "./graph";
import { searchCapabilityCatalog } from "./catalog";
import type { BackendTool } from "../contracts/protocol";

const tool = (name: string, description = ""): BackendTool => ({
  name,
  description,
  annotations: {},
});

describe("capability dependency graph", () => {
  test("uses three-state prerequisites instead of false blocking unknown state", () => {
    const unknown = evaluateCapabilityPreconditions(
      "manage_uv_layout",
      { field: "operation", value: "apply" },
      seedCapabilityFacts({ projectBound: true })
    );

    expect(unknown.eligibility).toBe("UNKNOWN");
    expect(unknown.unknown).toContain("uv_plan_available");
    expect(unknown.missing).toEqual([]);
    expect(unknown.predecessor).toEqual({
      capability: "manage_uv_layout",
      branch: { field: "operation", value: "plan" },
    });
  });

  test("marks authoritative missing prerequisites as blocked", () => {
    const blocked = evaluateCapabilityPreconditions(
      "create_texture",
      { field: "type", value: "variant" },
      {
        project_bound: true,
        texture_available: false,
      }
    );

    expect(blocked.eligibility).toBe("BLOCKED");
    expect(blocked.missing).toEqual(["texture_available"]);
  });

  test("successful outcomes produce and invalidate only graph-owned ephemeral facts", () => {
    let facts = seedCapabilityFacts({ projectBound: true });
    facts = applyCapabilityGraphOutcome(
      facts,
      "manage_cubes",
      { operation: "create" },
      true,
      {
        execution: "applied",
        added: 1,
        cubes: [{ uuid: "cube-a", name: "body", from: [0, 0, 0], to: [2, 2, 2] }],
        visual_scope: null,
      }
    );
    expect(facts.geometry_available).toBe(true);
    expect(facts.uv_layout_current).toBe(false);

    facts = applyCapabilityGraphOutcome(
      facts,
      "manage_uv_layout",
      { operation: "plan" },
      true
    );
    expect(facts.uv_plan_available).toBe(true);

    const ready = evaluateCapabilityPreconditions(
      "manage_uv_layout",
      { field: "operation", value: "apply" },
      facts
    );
    expect(ready.eligibility).toBe("READY");

    facts = applyCapabilityGraphOutcome(
      facts,
      "manage_uv_layout",
      { operation: "apply" },
      true
    );
    expect(facts.uv_layout_current).toBe(true);
    expect(facts.texture_alignment_current).toBe(false);
    expect(facts.uv_plan_available).toBe(false);
    const repeatApply = evaluateCapabilityPreconditions(
      "manage_uv_layout",
      { field: "operation", value: "apply" },
      facts
    );
    expect(repeatApply.eligibility).toBe("BLOCKED");
    expect(repeatApply.missing).toContain("uv_plan_available");
    // Replanning restores graph readiness without changing accepted UV.
    facts = applyCapabilityGraphOutcome(
      facts, "manage_uv_layout", { operation: "plan" }, true
    );
    expect(facts.uv_plan_available).toBe(true);
    expect(evaluateCapabilityPreconditions(
      "manage_uv_layout", { field: "operation", value: "apply" }, facts
    ).eligibility).toBe("READY");
  });

  test("Cube creation never promotes missing or contradictory receipts to Geometry READY", () => {
    const previous = seedCapabilityFacts({ projectBound: true });
    const valid = {
      execution: "applied",
      added: 1,
      cubes: [{ uuid: "cube-a", name: "body", from: [0, 0, 0], to: [1, 1, 1] }],
      visual_scope: null, // Capture availability is not native existence proof.
    };
    const created = applyCapabilityGraphOutcome(
      previous, "manage_cubes", { operation: "create" }, true, valid
    );
    expect(created.geometry_available).toBe(true);
    expect(created.uv_layout_current).toBe(false);

    for (const result of [
      undefined,
      { execution: "applied", added: 1, cubes: [] },
      { execution: "applied", added: 2, cubes: valid.cubes },
      { execution: "applied", added: 2, cubes: [valid.cubes[0], valid.cubes[0]] },
    ]) {
      const unresolved = applyCapabilityGraphOutcome(
        previous, "manage_cubes", { operation: "create" }, true, result
      );
      expect(unresolved.geometry_available).toBe("unknown");
      expect(unresolved.uv_layout_current).toBe(false);
      const knownAbsent = applyCapabilityGraphOutcome(
        { ...previous, geometry_available: false },
        "manage_cubes", { operation: "create" }, true, result
      );
      expect(knownAbsent.geometry_available).toBe("unknown");
      const knownPresent = applyCapabilityGraphOutcome(
        { ...previous, geometry_available: true },
        "manage_cubes", { operation: "create" }, true, result
      );
      expect(knownPresent.geometry_available).toBe(true);
    }
    expect(applyCapabilityGraphOutcome(
      previous, "manage_cubes", { operation: "create" }, false, valid
    )).toEqual(previous);
  });

  test("Cube simplify dry runs preserve existing readiness facts", () => {
    const original = {
      ...seedCapabilityFacts({ projectBound: true }),
      geometry_available: true,
      uv_plan_available: true,
      uv_layout_current: true,
      texture_alignment_current: true,
      visual_evidence_current: true,
    };
    for (const execution of ["planned", "unchanged"] as const) {
      expect(applyCapabilityGraphOutcome(
        original, "manage_cubes", {operation:"simplify"}, true,
        {execution, updates: execution === "planned"
          ? [{id:"cube-a",from:[0,0,0]}] : []}
      )).toEqual(original);
    }
    expect(applyCapabilityGraphOutcome(
      original, "manage_cubes", {operation:"simplify"}, true,
      {execution:"unchanged", updates:[{id:"cube-a",from:[0,0,0]}]}
    ).uv_layout_current).toBe(false);
    expect(applyCapabilityGraphOutcome(
      original, "manage_cubes", {operation:"simplify"}, true,
      {execution:"applied",modified:1}
    ).uv_layout_current).toBe(false);
    expect(applyCapabilityGraphOutcome(
      original, "manage_cubes", {operation:"simplify"}, true,
      {execution:"unchanged",effects:[{geometry_effect:{changed_fields:["from"]}}]}
    ).uv_layout_current).toBe(false);
  });

  test("Cube effects preserve unrelated UV/Texture graph facts", () => {
    const original = {
      ...seedCapabilityFacts({ projectBound: true }),
      geometry_available: true,
      uv_plan_available: true,
      uv_layout_current: true,
      texture_alignment_current: true,
      visual_evidence_current: true,
    };
    const receipt = (fields: string[]) => ({
      geometry_effect: {
        changed_fields: fields,
        center_delta: [0, 0, 0], size_delta: [0, 0, 0],
        origin_delta: [0, 0, 0], rotation_delta: [0, 0, 0],
        inflate_delta: 0, uv_offset_delta: [0, 0],
        mirror_uv_changed: false, autouv_changed: false,
        visibility_changed: false, faces_changed: false,
      },
    });
    const position = applyCapabilityGraphOutcome(
      original, "manage_cubes", { operation: "update" }, true,
      receipt(["rotation"])
    );
    expect(position.geometry_available).toBe(true);
    expect(position.uv_plan_available).toBe(false);
    expect(position.uv_layout_current).toBe(true);
    expect(position.texture_alignment_current).toBe(true);
    expect(position.visual_evidence_current).toBe(false);

    const shape = applyCapabilityGraphOutcome(
      original, "manage_cubes", { operation: "update" }, true,
      receipt(["from", "to"])
    );
    expect(shape.uv_layout_current).toBe(false);
    expect(shape.texture_alignment_current).toBe(false);

    const uv = applyCapabilityGraphOutcome(
      original, "manage_cubes", { operation: "batch_update" }, true,
      receipt(["uv_offset"])
    );
    expect(uv.uv_layout_current).toBe(false);
    expect(uv.texture_alignment_current).toBe(false);

    for (const [operation, result] of [
      ["update", null], ["create", receipt(["rotation"])],
      ["simplify", receipt(["rotation"])],
    ] as const) {
      const conservative = applyCapabilityGraphOutcome(
        original, "manage_cubes", { operation }, true, result
      );
      expect(conservative.uv_layout_current).toBe(false);
      expect(conservative.texture_alignment_current).toBe(false);
    }
    expect(applyCapabilityGraphOutcome(
      original, "manage_cubes", { operation: "update" }, false,
      receipt(["from"])
    )).toEqual(original);
  });

  test("Undo and Redo invalidate inferred facts without declaring authored state missing", () => {
    const observed = {
      ...seedCapabilityFacts({ projectBound: true }),
      geometry_available: true,
      uv_plan_available: true,
      uv_layout_current: false,
      texture_available: true,
      animation_available: true,
      visual_evidence_current: true,
    };
    for (const capability of ["undo", "redo"]) {
      const after = applyCapabilityGraphOutcome(observed, capability, {}, true);
      expect(after).toEqual({ project_bound: true });
      expect(evaluateCapabilityPreconditions(
        "manage_uv_layout", { field: "operation", value: "apply" }, after
      ).eligibility).toBe("UNKNOWN");
      expect(applyCapabilityGraphOutcome(observed, capability, {}, false))
        .toEqual(observed);
    }
  });

  test("animation timeline, effects and controllers invalidate previous visual evidence", () => {
    for (const capability of [
      "manage_animation_timeline",
      "manage_animation_effects",
      "manage_animation_controller",
    ]) {
      const prior = {
        ...seedCapabilityFacts({ projectBound: true }),
        animation_available: true,
        visual_evidence_current: true,
      };
      const next = applyCapabilityGraphOutcome(prior, capability, {}, true);
      expect(next.animation_available).toBe(true);
      expect(next.visual_evidence_current).toBe(false);
      expect(prior.visual_evidence_current).toBe(true);
      expect(applyCapabilityGraphOutcome(prior, capability, {}, false)).toEqual(prior);
    }
  });

  test("blocked candidates are demoted but remain discoverable for recovery", () => {
    const tools = [
      tool("create_texture", "Create a texture."),
      tool("paint_with_brush", "Paint an existing texture with a brush."),
    ];
    const results = searchCapabilityCatalog(
      tools,
      "paint texture with brush",
      4,
      {
        authoringPhase: "texturing",
        facts: {
          project_bound: true,
          texture_available: false,
        },
      }
    );

    const brush = results.find(
      (result) => result.capability_id === "paint_with_brush"
    );
    expect(brush?.eligibility).toBe("BLOCKED");
    expect(brush?.requires).toEqual(["texture_available"]);
  });
});
