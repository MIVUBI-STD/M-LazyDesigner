import { describe, expect, test } from "bun:test";
import {
  capabilityBranchFromArguments,
  evaluateCapabilityPreconditions,
  seedCapabilityFacts,
} from "../gateway/capabilities/graph";

describe("Hybrid-4 direct precondition safety", () => {
  test("branch identity is derived from direct tool arguments", () => {
    expect(
      capabilityBranchFromArguments({ operation: "update", id: "cube" })
    ).toEqual({ field: "operation", value: "update" });
  });

  test("known missing project fact blocks direct geometry before Runtime", () => {
    const facts = seedCapabilityFacts({ projectBound: false });
    const evaluation = evaluateCapabilityPreconditions(
      "manage_cubes",
      { field: "operation", value: "create" },
      facts
    );
    expect(evaluation.eligibility).toBe("BLOCKED");
    expect(evaluation.missing).toContain("project_bound");
  });

  test("unknown facts remain eligible for Runtime resolution rather than false blocking", () => {
    const evaluation = evaluateCapabilityPreconditions(
      "manage_material",
      { field: "operation", value: "configure" },
      seedCapabilityFacts({ projectBound: true })
    );
    expect(evaluation.eligibility).toBe("UNKNOWN");
    expect(evaluation.unknown).toContain("material_available");
  });
});
