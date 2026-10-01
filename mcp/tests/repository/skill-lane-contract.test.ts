import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

const EXPECTED = {
  "lazydesigner-development-brief": ["DEVELOPMENT", "PRODUCT_DEVELOPMENT", "META", "COMPLEX_DEVELOPMENT_CONTRACT"],
  "lazydesigner-mcp-development": ["DEVELOPMENT", "PRODUCT_DEVELOPMENT", "SPECIALIST", "MCP_PUBLIC_CONTRACT"],
  "lazydesigner-blockbench-development": ["DEVELOPMENT", "PRODUCT_DEVELOPMENT", "SPECIALIST", "BLOCKBENCH_RUNTIME_EXECUTION"],
  "lazydesigner-reference-preparation": ["IN_USE", "REFERENCE_PREPARATION", "ROUTER", "REFERENCE_CAPABILITY_SELECTION"],
  "lazydesigner-prompt-compiler": ["IN_USE", "REFERENCE_PREPARATION", "DELEGATED", "REFERENCE_PROMPT_NORMALIZATION"],
  "lazydesigner-pixel-art-authoring": ["IN_USE", "REFERENCE_PREPARATION", "SPECIALIST", "PIXEL_ART_REFERENCE"],
  "lazydesigner-particle-reference-authoring": ["IN_USE", "REFERENCE_PREPARATION", "SPECIALIST", "PARTICLE_REFERENCE_ARTIFACT"],
  "lazydesigner-modelling": ["IN_USE", "ASSET_AUTHORING", "SPECIALIST", "GEOMETRY_UV"],
  "lazydesigner-texturing": ["IN_USE", "ASSET_AUTHORING", "SPECIALIST", "TEXTURE_MATERIAL"],
  "lazydesigner-animation": ["IN_USE", "ASSET_AUTHORING", "SPECIALIST", "ANIMATION_MOTION"],
  "lazydesigner-skill-development": ["SKILL_SYSTEM", "SKILL_ENGINEERING", "META", "SKILL_ACTIVATION_QUALITY"],
} as const;

describe("Skill lane and activation contract", () => {
  test("every canonical LazyDesigner Skill declares one explicit activation contract", async () => {
    const dirs = (await readdir("../.agents/skills", { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => name.startsWith("lazydesigner-"))
      .sort();

    expect(dirs).toEqual(Object.keys(EXPECTED).sort());

    for (const [name, [lane, domain, cls, owner]] of Object.entries(EXPECTED)) {
      const skill = await source(`../.agents/skills/${name}/SKILL.md`);
      expect(skill).toContain("## Activation Contract");
      expect(skill).toContain(`LANE: ${lane}`);
      expect(skill).toContain(`DOMAIN: ${domain}`);
      expect(skill).toContain(`CLASS: ${cls}`);
      expect(skill).toContain(`OWNER: ${owner}`);
    }
  });

  test("routing eval corpus points only to canonical Skills and includes negative boundaries", async () => {
    const corpus = JSON.parse(await source("tests/fixtures/skill-routing-cases.json")) as {
      cases: Array<{
        lane: string;
        expected_skill: string;
        forbidden_skills: string[];
        allowed_handoff?: string;
        parent_skill?: string;
      }>;
    };
    const canonical = new Set(Object.keys(EXPECTED));

    expect(corpus.cases.length).toBeGreaterThanOrEqual(12);
    expect(new Set(corpus.cases.map((entry) => entry.lane))).toEqual(
      new Set(["IN_USE", "DEVELOPMENT", "SKILL_SYSTEM"])
    );

    for (const entry of corpus.cases) {
      expect(canonical.has(entry.expected_skill), entry.expected_skill).toBe(true);
      expect(entry.forbidden_skills.length).toBeGreaterThan(0);
      expect(entry.forbidden_skills).not.toContain(entry.expected_skill);
      for (const name of entry.forbidden_skills) expect(canonical.has(name), name).toBe(true);
      if (entry.allowed_handoff) expect(canonical.has(entry.allowed_handoff), entry.allowed_handoff).toBe(true);
      if (entry.parent_skill) expect(canonical.has(entry.parent_skill), entry.parent_skill).toBe(true);
    }
  });

  test("lane crossing is explicit and suspicion alone cannot escalate IN_USE to Development", async () => {
    const [root, taxonomy, skillDevelopment] = await Promise.all([
      source("../AGENTS.md"),
      source("../docs/04-system/skill-taxonomy.md"),
      source("../.agents/skills/lazydesigner-skill-development/SKILL.md"),
    ]);

    for (const text of [root, taxonomy]) {
      expect(text).toContain("DEVELOPMENT_HANDOFF");
      expect(text).toContain("resume_stage");
    }
    expect(root).toContain("Suspicion");
    expect(skillDevelopment).toContain("A visual/reference/asset failure does not become DEVELOPMENT");
    expect(skillDevelopment).toContain("Static string tests prove repository consistency, not actual model behavior.");
  });
});
