import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

async function text(path: string): Promise<string> {
  return Bun.file(path).text();
}

async function walk(root: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else out.push(path);
  }
  return out;
}

describe("Reference Preparation content contract", () => {
  test("reference domain routes to current canonical owners only", async () => {
    const files = await walk("../docs/02-reference");
    const stale: string[] = [];

    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const content = await text(file);
      if (
        content.includes("docs/knowledge/") ||
        content.includes("docs/foundation/") ||
        content.includes("image-reference-standard.md") ||
        content.includes("image-generation-prompt-contract.md") ||
        content.includes("player-scale-and-sheet-escalation.md")
      ) {
        stale.push(file);
      }
    }

    expect(stale).toEqual([]);
  });

  test("REFERENCE.json schema owns numeric and player-relative scale without inventing conversion", async () => {
    const schema = await text("../docs/02-reference/package/schema.md");

    expect(schema).toContain('"dimensions_blocks"');
    expect(schema).toContain('"player_relative_scale"');
    expect(schema).toContain("explicit user dimensions remain authoritative");
    expect(schema).toMatch(/never infer block values from image pixels/i);
    expect(schema).toContain("PLAYER_HEIGHT");
    expect(schema).not.toMatch(/pixels?\s*(?:=|→)\s*blocks?/i);
  });

  test("image relevance survives optional stage Markdown omission", async () => {
    const [schema, load, packageReadme] = await Promise.all([
      text("../docs/02-reference/package/schema.md"),
      text("../docs/02-reference/package/load-contract.md"),
      text("../docs/02-reference/package/README.md"),
    ]);

    expect(schema).toContain('"used_by": ["GEOMETRY"]');
    expect(schema).toContain("GEOMETRY | TEXTURE | ANIMATION");
    expect(load).toContain("images.used_by includes GEOMETRY when GEOMETRY.md is absent");
    expect(load).toContain("images.used_by includes TEXTURE when TEXTURE.md is absent");
    expect(load).toContain("images.used_by includes ANIMATION when ANIMATION.md is absent");
    expect(packageReadme).toContain("Stage Markdown files are optional");
  });

  test("authority is typed instead of silently ranking visual against scale", async () => {
    const policy = await text("../docs/02-reference/policy.md");

    expect(policy).toContain("Authority is **typed by fact**");
    expect(policy).toContain("approved visual reference");
    expect(policy).toContain("confirmed numeric dimensions");
    expect(policy).toContain("confirmed player-relative scale");
    expect(policy).toMatch(/do not silently choose one/i);
  });

  test("image generation preserves identity and scale locks", async () => {
    const [prompt, templates, scale] = await Promise.all([
      text("../docs/02-reference/image/prompt-contract.md"),
      text("../docs/02-reference/image/master-templates.md"),
      text("../docs/02-reference/image/scale-and-escalation.md"),
    ]);

    for (const owner of [prompt, templates, scale]) {
      expect(owner).toContain("Scale Lock");
    }
    expect(prompt).toContain("DO NOT REDESIGN / DO NOT RESCALE");
    expect(templates).toContain("PRESERVE SCALE LOCK");
    expect(scale).toContain("Sheet 01 remains the identity and scale anchor");
  });

  test("particle branch skips ceremonial pre-confirmation and packages only on request", async () => {
    const [flow, particleWorkflow, referenceSkill, particleSkill] = await Promise.all([
      text("../docs/02-reference/flow.md"),
      text("../docs/02-reference/particle/workflow.md"),
      text("../.agents/skills/lazydesigner-reference-preparation/SKILL.md"),
      text("../.agents/skills/lazydesigner-particle-reference-authoring/SKILL.md"),
    ]);

    expect(flow).toContain("no ceremonial pre-confirmation when no BLOCKING ambiguity remains");
    expect(referenceSkill).toContain("Particle-only exception");
    expect(referenceSkill).toContain("does **not** inherit the image branch's hard pre-generation confirmation ceremony");
    expect(particleWorkflow).toContain("PACKAGE ONLY IF EXPLICITLY REQUESTED OR UNAMBIGUOUSLY PART OF THE REQUEST");
    expect(particleWorkflow).toContain("A validated particle artifact and a delivered Resource Pack are separate states");
    expect(particleSkill).toContain("delivery.md only when package/handoff is requested");
    expect(particleSkill).toContain("Do not duplicate those details here");
  });


  test("reference package carries variants and moving attachments through existing stage owners", async () => {
    const [schema, geometry, animation, load] = await Promise.all([
      text("../docs/02-reference/package/schema.md"),
      text("../docs/02-reference/package/geometry.md"),
      text("../docs/02-reference/package/animation.md"),
      text("../docs/02-reference/package/load-contract.md"),
    ]);

    expect(schema).toContain("State/presentation variants do **not** require a new top-level schema field");
    expect(schema).toContain("existing `parts`, `articulation`, `constraints`");
    expect(schema).toContain("not by a direct Locator-animation schema");

    expect(geometry).toContain("smallest changed semantic branch");
    expect(geometry).toContain("owning semantic parent Group/Bone relationship");
    expect(geometry).toContain("do not specify direct Locator keyframes");

    expect(animation).toContain("semantic parent Group/Bone that drives it");
    expect(animation).toContain("Do not prescribe direct Locator keyframes");

    expect(load).toContain("Locator → parent Group/Bone → animation ownership");
    expect(load).toContain("Do not add Control packet fields for them");
  });
  test("reference handoff stays compact and delegates exact contracts", async () => {
    const handoff = await text("../docs/02-reference/package/handoff.md");

    expect(handoff).toContain("schema.md");
    expect(handoff).toContain("load-contract.md");
    expect(handoff).toContain("It deliberately does not repeat");
    expect(handoff).not.toContain("## Canonical Asset Profiles");
    expect(handoff).not.toContain("## Optional Reference Modules");
  });
});
