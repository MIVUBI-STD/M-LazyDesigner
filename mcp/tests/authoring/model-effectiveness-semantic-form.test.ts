import { describe, expect, test } from "bun:test";
import { placeCubeParameters } from "@/server/tools/cubes";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("model creation effectiveness — semantic form, rotation, pivot and contact", () => {
  test("semantic/construction reasoning exists before exact Cube coordinates", async () => {
    const [modelling, geometry] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../docs/03-authoring/modelling/standard.md"),
    ]);

    expect(modelling).toContain("Semantic Form / Construction / Transform Gate");
    for (const term of [
      "primary masses + must-exist reason",
      "required count / symmetry",
      "topology: what attaches to what",
      "negative spaces",
      "representation: geometry | texture | animation | omit",
    ]) expect(modelling).toContain(term);
    expect(modelling.toLowerCase()).toContain("semantic label never authorizes coordinates");
    expect(modelling).toContain("No orphan/filler Cube");
    expect(geometry).toContain("Every material Cuboid must have a modelling purpose in the **whole form**");
  });

  test("native Geometry stays quality-first without per-Cube planning or five-view capture ceremony", async () => {
    const modelling = await source("../.agents/skills/lazydesigner-modelling/SKILL.md");

    for (const term of [
      "Geometry Hot Path",
      "transient Primary Mass Contract",
      "Core View Triad",
      "`front + left + top`",
      "No per-Cube plan.",
      "one coherent `manage_cubes` batch",
      "Never recapture all five routinely",
    ]) expect(modelling).toContain(term);

    expect(modelling).toMatch(/`back`[^;]*rear topology\/asymmetry/);
    expect(modelling).toMatch(/`front_left_3q`[^.]*ambiguity[^.]*source-matched fidelity/);
    expect(modelling).toMatch(/bounded edits[^.]*affected views/);
    expect(modelling).toContain("correspondence metadata only maps captures to canonical board slots");
    expect(modelling).toContain("it is not a scorer and never creates visual PASS");
  });

  test("small-detail budget stays texture-first while alpha carriers avoid micro-Cubes", async () => {
    const [modelling, geometry, texturing, textureStandard] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../docs/03-authoring/modelling/standard.md"),
      source("../.agents/skills/lazydesigner-texturing/SKILL.md"),
      source("../docs/03-authoring/texture/standard.md"),
    ]);

    expect(modelling).toContain("`<= 4 Blockbench units`");
    expect(modelling).toContain("PLANAR_CUTOUT_CARRIER");
    expect(modelling).toContain("1 plane or 2 crossed planes");
    expect(modelling).toContain("rather than a fixed ritual angle");
    expect(geometry).toContain("### Planar cutout carrier");
    expect(geometry).toContain("not a new modelling strategy or object preset");
    expect(geometry).toContain("Small-detail thresholds measure the visible feature, not incidental carrier thickness");
    expect(textureStandard).toContain("### Alpha-owned silhouette carrier");
    expect(textureStandard).toContain("alpha intentionally owns only the 2D silhouette/holes");
    expect(texturing).toContain("planar carrier silhouette stays alpha, not Cubes");

    const crossed = placeCubeParameters.safeParse({
      elements: [
        { name: "carrier_a", from: [-4, 0, -0.0625], to: [4, 8, 0.0625], origin: [0, 4, 0], rotation: [0, 45, 0] },
        { name: "carrier_b", from: [-4, 0, -0.0625], to: [4, 8, 0.0625], origin: [0, 4, 0], rotation: [0, -45, 0] },
      ],
    });
    expect(crossed.success).toBe(true);
  });

  test("rotation is an explicit modelling decision instead of zero-rotation default bias", async () => {
    const [modelling, geometry] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../docs/03-authoring/modelling/standard.md"),
    ]);

    expect(modelling).toContain("AXIS_ALIGNED | ROTATED | UNRESOLVED");
    expect(modelling.toLowerCase()).toMatch(/visible.*slope|slope.*visible/);
    expect(modelling).toContain("MASS_CENTER | ATTACHMENT | JOINT | PARENT_TRANSFORM");
    expect(geometry).toContain("Rotation is justified when");
    expect(geometry.toLowerCase()).toContain("visibly");
    expect(geometry).toContain("explicit origin/pivot required");

    expect(placeCubeParameters.safeParse({ elements: [{ name: "sloped_mass", from: [0, 0, 0], to: [4, 8, 4], rotation: [0, 0, 20] }] }).success).toBe(false);
    expect(placeCubeParameters.safeParse({ elements: [{ name: "sloped_mass", from: [0, 0, 0], to: [4, 8, 4], rotation: [0, 0, 20], origin: [2, 0, 2] }] }).success).toBe(true);
  });

  test("pivot and contact preserve declared relationships instead of technical touching", async () => {
    const [modelling, geometry] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../docs/03-authoring/modelling/standard.md"),
    ]);

    for (const term of ["required attachment", "contact target/invariant", "attachment/joint pivot", "negative spaces"]) {
      expect(modelling).toContain(term);
    }
    expect(modelling).toContain("AABB overlap, hierarchy, or numeric touching is not contact proof");
    expect(geometry.replace(/\s+/g, " ")).toContain("AABB overlap or hierarchy alone is not proof");
  });

  test("semantic hardening stays in modelling judgement instead of self-reported MCP fields", async () => {
    const [cubes, profile] = await Promise.all([
      source("server/tools/geometry/cubes.ts"),
      source("lib/registrationProfile.ts"),
    ]);
    const start = cubes.indexOf("export const placeCubeParameters");
    const end = cubes.indexOf("export const modifyCubeParameters", start);
    const placeContract = cubes.slice(start, end);
    for (const field of ["semantic_form", "mass_id", "must_exist_reason", "contact_target", "orientation_state", "pivot_role"]) {
      expect(placeContract).not.toContain(field);
    }
    expect(profile).not.toContain("semantic_form");
    expect(profile).not.toContain("orientation_gate");
  });
});
