import { describe, expect, test } from "bun:test";

describe("reference and authoring documentation handoff", () => {
  test("reference retains distinct image and package contracts", async () => {
    const required = [
      "../docs/02-reference/README.md", "../docs/02-reference/flow.md", "../docs/02-reference/policy.md",
      "../docs/02-reference/image/README.md", "../docs/02-reference/image/standard.md",
      "../docs/02-reference/image/scale-and-escalation.md", "../docs/02-reference/image/prompt-contract.md",
      "../docs/02-reference/image/master-templates.md", "../docs/02-reference/package/README.md",
      "../docs/02-reference/package/schema.md", "../docs/02-reference/package/handoff.md",
      "../docs/02-reference/package/load-contract.md", "../docs/02-reference/package/geometry.md",
      "../docs/02-reference/package/texture.md", "../docs/02-reference/package/animation.md",
    ];
    for (const path of required) expect(await Bun.file(path).exists(), path).toBe(true);
  });

  test("authoring retains profiles and stage standards", async () => {
    const profileRoot = "../docs/03-authoring/modelling/profiles";
    for (const profile of ["README.md", "prop-furniture.md", "vehicle.md", "humanoid.md", "creature.md", "mechanical.md", "plant-foliage.md", "generic.md"]) {
      expect(await Bun.file(`${profileRoot}/${profile}`).exists(), profile).toBe(true);
    }
    for (const path of [
      "../docs/03-authoring/modelling/standard.md", "../docs/03-authoring/texture/standard.md",
      "../docs/03-authoring/animation/standard.md", "../docs/03-authoring/validation/visual.md",
      "../docs/03-authoring/finalization/standard.md",
    ]) expect(await Bun.file(path).exists(), path).toBe(true);
  });

  test("AI routing retains canonical reference and modelling specialists", async () => {
    const [root, referenceSkill, modellingSkill] = await Promise.all([
      Bun.file("../AGENTS.md").text(),
      Bun.file("../.agents/skills/lazydesigner-reference-preparation/SKILL.md").text(),
      Bun.file("../.agents/skills/lazydesigner-modelling/SKILL.md").text(),
    ]);
    expect(root).toContain(".agents/skills/lazydesigner-reference-preparation/SKILL.md");
    expect(referenceSkill).toContain("docs/02-reference/");
    expect(modellingSkill).toContain("docs/03-authoring/modelling/profiles/");
  });
});
