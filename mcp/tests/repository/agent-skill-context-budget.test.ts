import { describe, expect, test } from "bun:test";

const ROUTER_SKILLS = [
  {
    path: "../.agents/skills/lazydesigner-reference-preparation/SKILL.md",
    maxChars: 9000,
  },
] as const;

const REFERENCE_SPECIALIST_SKILLS = [
  {
    path: "../.agents/skills/lazydesigner-prompt-compiler/SKILL.md",
    maxChars: 6000,
    classMarker: "CLASS: DELEGATED",
  },
  {
    path: "../.agents/skills/lazydesigner-pixel-art-authoring/SKILL.md",
    maxChars: 11000,
    classMarker: "CLASS: SPECIALIST",
  },
  {
    path: "../.agents/skills/lazydesigner-particle-reference-authoring/SKILL.md",
    maxChars: 10000,
    classMarker: "CLASS: SPECIALIST",
  },
] as const;

const HOT_PATH_SKILLS = [
  {
    path: "../.agents/skills/lazydesigner-modelling/SKILL.md",
    maxChars: 11000,
    references: [
      "references/verification.md",
      "references/uv-layout.md",
      "references/correction.md",
    ],
  },
  {
    path: "../.agents/skills/lazydesigner-animation/SKILL.md",
    maxChars: 9500,
    references: ["references/fidelity-correction-evidence.md"],
  },
  {
    path: "../.agents/skills/lazydesigner-texturing/SKILL.md",
    maxChars: 9800,
    references: ["references/fidelity-styling-verification.md"],
  },
] as const;

describe("agent skill context budget", () => {
  test("routing skills stay compact enough to classify before specialist loading", async () => {
    for (const skill of ROUTER_SKILLS) {
      const source = await Bun.file(skill.path).text();
      expect(source.length).toBeLessThan(skill.maxChars);
      expect(source).toContain("CLASS: ROUTER");
    }
  });

  test("reference specialists stay bounded without forcing premature fragmentation", async () => {
    for (const skill of REFERENCE_SPECIALIST_SKILLS) {
      const source = await Bun.file(skill.path).text();
      expect(source.length).toBeLessThan(skill.maxChars);
      expect(source).toContain(skill.classMarker);
    }
  });

  test("hot-path specialist skills stay compact and lazy-load deep references", async () => {
    for (const skill of HOT_PATH_SKILLS) {
      const source = await Bun.file(skill.path).text();
      expect(source.length).toBeLessThan(skill.maxChars);
      for (const reference of skill.references) expect(source).toContain(reference);
    }

    const modelling = await Bun.file("../.agents/skills/lazydesigner-modelling/SKILL.md").text();
    expect(modelling).not.toContain("verification-uv-correction.md");
    expect(await Bun.file("../.agents/skills/lazydesigner-modelling/references/verification-uv-correction.md").exists()).toBe(false);
  });
});
