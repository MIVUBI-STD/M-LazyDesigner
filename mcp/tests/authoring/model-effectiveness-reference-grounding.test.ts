import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

function normalized(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

describe("model creation effectiveness — actual reference grounding", () => {
  test("actual approved image is required for visual judgement; policy preserves evidence authority", async () => {
    const [reference, modelling, workflow, validation] = await Promise.all([
      source("../docs/02-reference/policy.md"),
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("prompts/bedrock_entity_workflow.md"),
      source("../docs/03-authoring/validation/visual.md"),
    ]);
    const referenceLower = normalized(reference);
    expect(referenceLower).toContain("approved visual reference");
    expect(referenceLower).toContain("visible source evidence");
    for (const text of [modelling, validation]) {
      expect(normalized(text)).toContain("actual approved reference image");
    }
    expect(normalized(modelling)).toContain("active multimodal context");
    expect(normalized(modelling)).toMatch(/path\/prose\/memory[^.]*not visual evidence/);
    expect(normalized(workflow)).toContain("actual approved image in active multimodal context");
    expect(normalized(validation)).toContain("difference-first");
  });

  test("material semantic decisions retain explicit evidence states at their canonical owners", async () => {
    const [schema, modelling] = await Promise.all([
      source("../docs/02-reference/package/schema.md"),
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
    ]);
    for (const state of ["SUPPORTED", "PROVISIONAL", "CONFLICTING", "UNAVAILABLE"]) {
      expect(schema).toContain(state);
      expect(modelling).toContain(state);
    }
    expect(normalized(modelling)).toContain("semantic label never authorizes coordinates");
  });

  test("view pairing stays conditional instead of becoming a universal intake ritual", async () => {
    const [modelling, validation] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../docs/03-authoring/validation/visual.md"),
    ]);
    expect(modelling).toContain("View Pair Map");
    expect(normalized(modelling)).toMatch(/view pair map only .*front\/back/);
    expect(normalized(validation)).toContain("do not silently compare the closest-looking view");
  });

  test("visual PASS requires actual reference plus fresh current model evidence", async () => {
    const [modelling, validation, camera] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../docs/03-authoring/validation/visual.md"),
      source("server/tools/camera.ts"),
    ]);
    for (const text of [modelling, validation]) {
      const lower = normalized(text);
      expect(lower).toContain("actual approved reference image");
      expect(text).toContain("FAIL");
      expect(text).toContain("UNVERIFIED");
      expect(text).toContain("PASS");
      expect(lower).toContain("difference-first");
    }
    expect(camera).toContain("VIEW ${view}");
    expect(camera).toContain("this tool does not judge resemblance");
  });

  test("grounding does not add automatic similarity authority or runtime framework", async () => {
    const [modelling, validation, profile, cubes] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../docs/03-authoring/validation/visual.md"),
      source("lib/registrationProfile.ts"),
      source("server/tools/cubes.ts"),
    ]);
    expect(normalized(modelling)).toContain("similarity scores cannot justify `pass`");
    expect(normalized(validation)).toContain("none of these proves resemblance by itself");
    expect(profile).not.toContain("reference_grounding");
    expect(profile).not.toContain("vision_gate");
    expect(cubes).not.toContain("reference_score");
    expect(cubes).not.toContain("similarity_threshold");
  });
});
