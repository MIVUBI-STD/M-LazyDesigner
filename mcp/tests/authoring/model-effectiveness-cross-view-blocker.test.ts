import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("model creation effectiveness — cross-view and blocker handling", () => {
  test("material 3D claims keep explicit evidence states instead of borrowing confidence across axes", async () => {
    const [schema, modelling, workflow] = await Promise.all([
      source("../docs/02-reference/package/schema.md"),
      Promise.all([source("../.agents/skills/lazydesigner-modelling/SKILL.md"), source("../.agents/skills/lazydesigner-modelling/references/correction.md"), source("../.agents/skills/lazydesigner-modelling/references/uv-layout.md"), source("../.agents/skills/lazydesigner-modelling/references/verification.md")]).then((parts) => parts.join("\n")),
      source("prompts/bedrock_entity_workflow.md"),
    ]);

    for (const state of ["SUPPORTED", "PROVISIONAL", "CONFLICTING", "UNAVAILABLE"]) {
      expect(schema).toContain(state);
      expect(modelling).toContain(state);
    }
    expect(modelling).toContain("Front agreement never certifies unresolved material depth");
    expect(workflow).toContain("Front PASS is not full 3D PASS");
  });

  test("material cross-view conflicts block instead of being averaged into invented geometry", async () => {
    const [modelling, validation] = await Promise.all([
      Promise.all([source("../.agents/skills/lazydesigner-modelling/SKILL.md"), source("../.agents/skills/lazydesigner-modelling/references/correction.md"), source("../.agents/skills/lazydesigner-modelling/references/uv-layout.md"), source("../.agents/skills/lazydesigner-modelling/references/verification.md")]).then((parts) => parts.join("\n")),
      source("../docs/03-authoring/validation/visual.md"),
    ]);

    expect(modelling).toContain("Material `CONFLICTING` or `UNAVAILABLE` evidence blocks dependent construction");
    expect(modelling).toContain("Material `UNRESOLVED` → `BLOCKED`");
    expect(validation.toLowerCase()).toContain("conflicting");
    expect(validation).toContain("BLOCKED");
  });

  test("persistent correction failures stop instead of looping", async () => {
    const [root, modelling, workflow] = await Promise.all([
      source("../AGENTS.md"),
      Promise.all([source("../.agents/skills/lazydesigner-modelling/SKILL.md"), source("../.agents/skills/lazydesigner-modelling/references/correction.md"), source("../.agents/skills/lazydesigner-modelling/references/uv-layout.md"), source("../.agents/skills/lazydesigner-modelling/references/verification.md")]).then((parts) => parts.join("\n")),
      source("prompts/bedrock_entity_workflow.md"),
    ]);

    expect(root).toContain("Stop the same failed direction after two attempts without new evidence");
    expect(modelling).toMatch(/same causal direction.*twice without new evidence.*BLOCKED/i);
    expect(workflow).toContain("Same causal direction failing twice without new evidence");
  });
});
