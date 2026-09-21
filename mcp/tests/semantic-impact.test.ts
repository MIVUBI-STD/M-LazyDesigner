import { describe, expect, test } from "bun:test";
import { analyzeSemanticImpact } from "../lib/semantic/impact";
import { CAPABILITY_BRANCH_MANIFEST } from "../gateway/capabilities/manifest";
import { listExplicitSourceOwners } from "../gateway/control/sourceOwners";

describe("semantic affected graph", () => {
  test("maps a source change to its canonical capability and test owner", () => {
    const report = analyzeSemanticImpact({
      changedPaths: ["mcp/server/tools/cubes.ts"],
      sourceOwners: listExplicitSourceOwners(),
      manifest: CAPABILITY_BRANCH_MANIFEST,
    });

    expect(report.direct_capabilities).toContain("manage_cubes");
    expect(report.affected_sources).toContain("mcp/server/tools/cubes.ts");
    expect(report.affected_tests).toContain(
      "mcp/tests/model-effectiveness-correction-accuracy.test.ts"
    );
    expect(
      report.affected_capabilities.find(
        (entry) => entry.capability === "manage_cubes"
      )?.semantic_ids
    ).toContain("branch:manage_cubes/operation=update");
  });

  test("expands through produced facts without loading unrelated domains", () => {
    const report = analyzeSemanticImpact({
      changedPaths: ["mcp/server/runtime/uvLayoutService.ts"],
      sourceOwners: listExplicitSourceOwners(),
      manifest: CAPABILITY_BRANCH_MANIFEST,
    });

    expect(report.direct_capabilities).toContain("manage_uv_layout");
    expect(report.affected_capabilities.map((entry) => entry.capability)).toContain(
      "manage_uv_layout"
    );
    expect(report.affected_capabilities.map((entry) => entry.capability)).not.toContain(
      "manage_animation_controller"
    );
    expect(report.affected_capabilities.map((entry) => entry.capability)).not.toContain(
      "manage_particle"
    );
  });

  test("specialist changes identify only capabilities owned by that specialist", () => {
    const report = analyzeSemanticImpact({
      changedPaths: [".agents/skills/lazydesigner-animation/SKILL.md"],
      sourceOwners: listExplicitSourceOwners(),
      manifest: CAPABILITY_BRANCH_MANIFEST,
    });

    expect(report.direct_capabilities).toContain("manage_animation_timeline");
    expect(report.direct_capabilities).toContain("manage_animation_controller");
    expect(report.direct_capabilities).not.toContain("manage_cubes");
  });

  test("honors the capability budget", () => {
    const report = analyzeSemanticImpact({
      changedPaths: [".agents/skills/lazydesigner-texturing/SKILL.md"],
      sourceOwners: listExplicitSourceOwners(),
      manifest: CAPABILITY_BRANCH_MANIFEST,
      maxCapabilities: 3,
    });

    expect(report.affected_capabilities.length).toBeLessThanOrEqual(3);
    expect(report.truncated).toBe(true);
  });
});
