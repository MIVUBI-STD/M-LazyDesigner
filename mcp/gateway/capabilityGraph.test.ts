import { describe, expect, test } from "bun:test";
import {
  applyCapabilityGraphOutcome,
  evaluateCapabilityPreconditions,
  seedCapabilityFacts,
} from "./capabilityGraph";
import { searchCapabilityCatalog, type BackendTool } from "./contract";

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
      true
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
