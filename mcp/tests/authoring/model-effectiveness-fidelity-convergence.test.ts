import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

function normalized(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

describe("model creation effectiveness — fidelity convergence and evaluation integrity", () => {
  test("local corrections require qualitative convergence rather than mutation activity", async () => {
    const [modelling, workflow] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("prompts/bedrock_entity_workflow.md"),
    ]);
    for (const text of [modelling, workflow]) {
      expect(text).toContain("IMPROVED | UNCHANGED | REGRESSED");
      const lower = normalized(text);
      expect(lower).toContain("regressed");
      expect(lower).toContain("same causal correction");
      expect(lower).toContain("blocked");
    }
    expect(normalized(modelling)).toMatch(/without regression elsewhere/);
    expect(normalized(modelling)).toMatch(/require.*`improved`/);
  });

  test("correction reuses fresh pre-correction evidence instead of recapturing ceremonially", async () => {
    const modelling = await source("../.agents/skills/lazydesigner-modelling/SKILL.md");
    const modellingText = normalized(modelling);

    expect(modellingText).toContain("reuse fresh affected pre-correction evidence");
    expect(modellingText).toContain("capture before mutation only when none exists");
    expect(modellingText).toContain("after mutation, recapture affected view(s)");
  });

  test("model-facing evaluation remains evidence-bound and non-circular", async () => {
    const [reference, validation] = await Promise.all([
      source("../docs/02-reference/policy.md"),
      source("../docs/03-authoring/validation/visual.md"),
    ]);
    expect(normalized(reference)).toContain("approved visual reference");
    expect(normalized(reference)).toContain("visible source evidence");
    expect(normalized(validation)).toContain("actual approved reference image");
    expect(normalized(validation)).toContain("fresh current-revision model");
    expect(normalized(validation)).toContain("difference-first");
  });

  test("fidelity hardening adds no scorer, planner, runtime profile, or fixture-specific law", async () => {
    const [profile, cubes, modelling, workflow] = await Promise.all([
      source("lib/registrationProfile.ts"),
      source("server/tools/cubes.ts"),
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("prompts/bedrock_entity_workflow.md"),
    ]);
    for (const forbidden of ["reference_eval", "fidelity_profile", "vision_score", "fidelity_score"]) {
      expect(profile).not.toContain(forbidden);
      expect(cubes).not.toContain(forbidden);
    }
    expect(normalized(modelling)).not.toContain("zebra");
    expect(normalized(workflow)).not.toContain("zebra");
    expect(normalized(modelling)).toContain("similarity scores cannot justify `pass`");
    expect(normalized(workflow)).toContain("similarity scores cannot create visual `pass`");
  });
});
