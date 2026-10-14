import { describe, expect, test } from "bun:test";
import {
  summarizeProjectTexelDensity,
  UV_MODEL_TEXEL_DENSITY_MATERIAL_AREA_FRACTION,
  UV_MODEL_TEXEL_DENSITY_REVIEW_FACTOR,
  type ProjectTexelDensitySample,
} from "@/server/tools/element-inspection";

function sample(
  cube: string,
  face: string,
  modelArea: number,
  logicalDensity: number,
  physicalDensity: number | null = null
): ProjectTexelDensitySample {
  return {
    cube_uuid: `${cube}-uuid`,
    cube_name: cube,
    face,
    model_area: modelArea,
    logical_uv_units_per_model_unit: logicalDensity,
    physical_pixels_per_model_unit: physicalDensity,
  };
}

describe("model-wide texel density diagnostics", () => {
  test("major surfaces with different one-pixel model scale require UV review", () => {
    const audit = summarizeProjectTexelDensity([
      sample("door_left", "north", 100, 1, 2),
      sample("door_right", "north", 100, 1, 2),
      sample("door_header", "north", 100, 1, 2),
      sample("roof", "up", 100, 0.25, 0.5),
    ]);

    expect(UV_MODEL_TEXEL_DENSITY_REVIEW_FACTOR).toBe(2);
    expect(audit.state).toBe("review_required");
    expect(audit.reference_logical_uv_units_per_model_unit).toBe(1);
    expect(audit.spread_factor).toBe(4);
    expect(audit.outlier_faces).toBe(1);
    expect(audit.outlier_model_area_fraction).toBe(0.25);
    expect(audit.examples[0]).toMatchObject({
      cube_name: "roof",
      face: "up",
      relative_to_reference: "lower_density",
      ratio_to_reference: 4,
      physical_pixels_per_model_unit: 0.5,
      model_units_per_physical_pixel: 2,
    });
  });

  test("tiny deliberate high-detail allocation is reported without blocking major surfaces", () => {
    const audit = summarizeProjectTexelDensity([
      sample("body_a", "north", 100, 1, 2),
      sample("body_b", "north", 100, 1, 2),
      sample("button", "north", 1, 4, 8),
    ]);

    expect(audit.outlier_model_area_fraction).toBeLessThan(
      UV_MODEL_TEXEL_DENSITY_MATERIAL_AREA_FRACTION
    );
    expect(audit.state).toBe("localized_variance");
    expect(audit.examples[0]).toMatchObject({
      cube_name: "button",
      relative_to_reference: "higher_density",
      ratio_to_reference: 4,
    });
  });

  test("coherent major surfaces remain consistent and preserve physical one-pixel scale", () => {
    const audit = summarizeProjectTexelDensity([
      sample("panel_a", "north", 80, 1, 2),
      sample("panel_b", "north", 80, 1.1, 2.2),
      sample("panel_c", "north", 80, 0.9, 1.8),
    ]);

    expect(audit.state).toBe("consistent");
    expect(audit.outlier_faces).toBe(0);
    expect(audit.reference_physical_pixels_per_model_unit).toBe(2);
    expect(audit.reference_model_units_per_physical_pixel).toBe(0.5);
  });

  test("Texturing routes undersized UV islands upstream instead of painting around them", async () => {
    const skill = await Promise.all([Bun.file("../.agents/skills/lazydesigner-texturing/SKILL.md").text(), Bun.file("../.agents/skills/lazydesigner-texturing/references/fidelity-styling-verification.md").text()]).then((parts) => parts.join("\n"));
    const inspection = await Bun.file(
      "server/tools/element/inspection.ts"
    ).text();

    expect(skill).toMatch(/^## UV(?: Layout Quality)? Gate$/m);
    expect(skill).toContain("texel density");
    expect(skill).toContain("pixels per UV unit");
    expect(skill).toMatch(/return to Geometry\/UV (?:if|when) (?:detail|it) cannot fit/i);
    expect(skill).toContain(
      "Pin atlas UUID and pass `texture_id` when multiple textures are loaded"
    );
    // Palette/identity wording belongs to texture-design reasoning tests;
    // this regression owns upstream routing when physical texels cannot fit.
    expect(inspection).toContain("model_units_per_physical_pixel");
    expect(inspection).toContain("outlier_model_area_fraction");
  });
});
