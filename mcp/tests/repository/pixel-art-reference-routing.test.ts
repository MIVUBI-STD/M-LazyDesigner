import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("pixel-art reference specialist ownership", () => {
  test("canonical routing exposes Pixel Art as Reference Preparation, not an authoring stage", async () => {
    const [agents, taxonomy, loading, specialist] = await Promise.all([
      source("../AGENTS.md"),
      source("../docs/04-system/skill-taxonomy.md"),
      source("../docs/04-system/ai-context-loading.md"),
      source("../.agents/skills/lazydesigner-pixel-art-authoring/SKILL.md"),
    ]);

    expect(agents).toContain("lazydesigner-pixel-art-authoring/SKILL.md");
    expect(agents).toContain("actual Blockbench atlas/UV/Painter task");

    expect(taxonomy).toContain("lazydesigner-pixel-art-authoring");
    expect(taxonomy).toContain("standalone icon / sprite / tile / pixel-art reference image");
    expect(taxonomy).toContain("actual Blockbench texture atlas / mapped UV surface / Painter mutation / PBR");

    expect(loading).toContain("unselected sibling reference specialists");
    expect(loading).toContain("pixel-art knowledge corpus after its artifact/profile has already been handed off");

    expect(specialist).toContain("## True Pixel Rule");
    expect(specialist).toContain("## Style / Series Rule");
    expect(specialist).toContain("## Handoff Boundary");
  });

  test("Pixel Art is not introduced as a LazyDesigner Control authoring domain", async () => {
    const [types, developmentIntent] = await Promise.all([
      source("gateway/control/types.ts"),
      source("gateway/development/intent.ts"),
    ]);

    expect(types).not.toContain('"PIXEL_ART"');
    expect(developmentIntent).not.toContain('| "PIXEL_ART"');
  });

  test("pixel-art domain keeps current lazy-load owners available", async () => {
    const requiredOwners = [
      "README.md",
      "authoring-spec.md",
      "workflow.md",
      "prompt-contract.md",
      "iconography.md",
      "object-prop.md",
      "sprites.md",
      "animation.md",
      "tiles-patterns.md",
      "silhouette.md",
      "grid-clusters.md",
      "resolution-scaling.md",
      "palette-material.md",
      "shading.md",
      "style-lock.md",
      "minecraft-compatibility.md",
      "reference-conversion.md",
      "texture-reference.md",
      "audit-revision.md",
      "qa.md",
      "delivery.md",
    ];

    for (const file of requiredOwners) {
      const text = await source(`../docs/02-reference/pixel-art/${file}`);
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });
  test("Pixel Art delivery preserves authored grid fidelity and native-size readability", async () => {
    const [skill, qa, scaling, delivery] = await Promise.all([
      source("../.agents/skills/lazydesigner-pixel-art-authoring/SKILL.md"),
      source("../docs/02-reference/pixel-art/qa.md"),
      source("../docs/02-reference/pixel-art/resolution-scaling.md"),
      source("../docs/02-reference/pixel-art/delivery.md"),
    ]);

    expect(skill).toContain("native-size readability outranks zoomed-in prettiness");
    expect(qa).toContain("100% target scale");
    expect(qa).toContain("integer nearest-neighbor enlargement");
    expect(scaling).toContain("Avoid smooth interpolation");
    expect(scaling).toContain("rebuild or clean the clusters at the target grid");
    expect(delivery).toContain("smooth-resize residue");
    expect(delivery).toContain("canvas/grid dimensions");
  });

});
