import { describe, expect, test } from "bun:test";
import benchmark from "./fixtures/quality-benchmark-cases.json";

type BenchmarkCase = (typeof benchmark.cases)[number];

const byId = new Map(benchmark.cases.map((entry) => [entry.id, entry] as const));

function requireDimensions(entry: BenchmarkCase, expected: readonly string[]) {
  for (const dimension of expected) {
    expect(entry.geometry_dimensions).toContain(dimension as never);
  }
}

describe("BlockIT authoring quality benchmark contract", () => {
  test("uses categorical evidence verdicts rather than an aggregate quality score", () => {
    expect(benchmark.aggregate_score).toBe(false);
    expect(benchmark.quality_precedes_efficiency).toBe(true);
    expect(benchmark.verdicts).toEqual(["PASS", "FAIL", "UNVERIFIED"]);
  });

  test("covers six representative quality cases without creating a scoring system", () => {
    expect([...byId.keys()].sort()).toEqual([
      "character_mob",
      "layered_cutout",
      "mechanical_assembly",
      "organic_curved",
      "prop_furniture",
      "vehicle",
    ]);
    expect(benchmark.aggregate_score).toBe(false);
  });

  test("every case measures cross-view geometry and reference completeness", () => {
    for (const entry of benchmark.cases) {
      requireDimensions(entry, [
        "silhouette",
        "cross_view_proportion",
        "required_part_completeness",
        "attachment_contact",
        "depth_layering",
        "negative_space",
      ]);
      expect(entry.critical_failures).toContain("missing_required_part");
      expect(entry.critical_failures).toContain("floating_required_part");
      expect(entry.critical_failures).toContain("reference_unsupported_invention");
    }
  });

  test("character benchmark explicitly guards rig deformation failure modes", () => {
    const character = byId.get("character_mob")!;
    expect(character.required_phases).toContain("ANIMATION");
    expect(character.animation_dimensions).toContain("pivot_rig_suitability");
    expect(character.animation_dimensions).toContain("reference_pose_fidelity");
    expect(character.animation_dimensions).toContain("joint_gap_control");
    expect(character.animation_dimensions).toContain("weight_transfer");
    expect(character.critical_failures).toContain("excessive_joint_gap");
    expect(character.critical_failures).toContain("unintended_foot_slide");
  });

  test("organic benchmark guards curve quality without rewarding cube count", () => {
    const organic = byId.get("organic_curved")!;
    expect(organic.geometry_dimensions).toContain("curve_segmentation_quality");
    expect(organic.critical_failures).toContain("silhouette_stair_step_oversegmentation");
    expect(JSON.stringify(organic)).not.toMatch(/cube_count|poly_count|more_cubes/i);
  });

  test("mechanical benchmark exercises surface, UV, pivot and clearance evidence", () => {
    const mechanical = byId.get("mechanical_assembly")!;
    expect(mechanical.profile).toBe("MECHANICAL");
    expect(mechanical.geometry_dimensions).toContain("surface_integrity");
    expect(mechanical.texture_dimensions).toContain("physical_uv_fidelity");
    expect(mechanical.animation_dimensions).toContain("pivot_rig_suitability");
    expect(mechanical.animation_dimensions).toContain("clearance_contact");
    expect(mechanical.critical_failures).toContain("coplanar_surface_overlap");
    expect(mechanical.critical_failures).toContain("interpenetration_at_required_extreme");
  });

  test("layered/cutout benchmark exercises coplanar, physical UV and alpha-boundary evidence", () => {
    const layered = byId.get("layered_cutout")!;
    expect(layered.geometry_dimensions).toContain("surface_integrity");
    expect(layered.texture_dimensions).toContain("physical_uv_fidelity");
    expect(layered.texture_dimensions).toContain("alpha_cutout_boundary");
    expect(layered.critical_failures).toContain("coplanar_surface_overlap");
    expect(layered.critical_failures).toContain("stretched_uv_mapping");
    expect(layered.critical_failures).toContain("cutout_boundary_mismatch");
  });

  test("efficiency is observed separately as cost to accepted result", () => {
    expect(benchmark.efficiency_observations).toEqual(expect.arrayContaining([
      "search_capability_calls",
      "describe_capability_calls",
      "redundant_readbacks",
      "correction_rounds",
      "tool_calls_to_accepted_result",
    ]));
  });
});
