import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("particle reference authoring contract", () => {
  test("appearance orientation and flipbook timing have explicit semantic owners", async () => {
    const [skill, spec, texture, emitter] = await Promise.all([
      source("../.agents/skills/lazydesigner-particle-reference-authoring/SKILL.md"),
      source("../docs/02-reference/particle/authoring-spec.md"),
      source("../docs/02-reference/particle/texture-authoring.md"),
      source("../docs/02-reference/particle/emitter.md"),
    ]);

    expect(skill).toContain("Appearance / Timing Gate");
    expect(skill).toContain("camera-facing vs direction-aligned");
    expect(skill).toContain("frames_per_second");
    expect(skill).toContain("stretch_to_lifetime");
    expect(skill).toContain("activation_expression");

    expect(spec).toContain("facing_camera_mode");
    expect(spec).toContain("timing owner: frames_per_second | stretch_to_lifetime");
    expect(spec).toContain("Physical travel stays in motion components");
    expect(texture).toContain("flipbook");
    expect(texture).toContain("stretch_to_lifetime");
    expect(emitter).toContain("activation_expression");
    expect(emitter).toContain("Do not confuse emitter activation with individual particle lifetime");
  });

  test("particle authoring remains minimal and does not promote flipbook or reactivity by default", async () => {
    const [skill, spec] = await Promise.all([
      source("../.agents/skills/lazydesigner-particle-reference-authoring/SKILL.md"),
      source("../docs/02-reference/particle/authoring-spec.md"),
    ]);

    expect(skill).toContain("Use the first level that satisfies the requested visual behavior.");
    expect(spec).toContain("Do not create an atlas, flipbook, or generated texture pipeline by default.");
    expect(spec).toContain("Start at the lowest viable tier.");
    expect(spec).toContain("Do not promote a DIRECT request into COMPOSED");
  });
});
