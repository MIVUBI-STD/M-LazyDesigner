import { describe, expect, test } from "bun:test";

const HOT_PATH_SKILLS = [
  {
    path: "../.agents/skills/lazydesigner-modelling/SKILL.md",
    maxChars: 15000,
    reference: "references/verification-uv-correction.md",
  },
  {
    path: "../.agents/skills/lazydesigner-animation/SKILL.md",
    maxChars: 10000,
    reference: "references/fidelity-correction-evidence.md",
  },
  {
    path: "../.agents/skills/lazydesigner-texturing/SKILL.md",
    maxChars: 10000,
    reference: "references/fidelity-styling-verification.md",
  },
] as const;

describe("agent skill context budget", () => {
  test("hot-path specialist skills stay compact and lazy-load deep references", async () => {
    for (const skill of HOT_PATH_SKILLS) {
      const source = await Bun.file(skill.path).text();
      expect(source.length).toBeLessThan(skill.maxChars);
      expect(source).toContain(skill.reference);
    }
  });
});
