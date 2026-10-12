/**
 * Source-policy text assertions only. A PASS here does not execute Blockbench,
 * inspect model/reference pixels, measure fidelity, or establish acceptance.
 */
import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("quality-first authoring guidance (source text only, not asset quality)", () => {
  test("bounds and visual evidence policies live in current modelling/validation owners", async () => {
    const [modelling, geometry, validation] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../docs/03-authoring/modelling/standard.md"),
      source("../docs/03-authoring/validation/visual.md"),
    ]);
    for (const text of [modelling, geometry, validation]) {
      expect(text.toLowerCase()).toMatch(/bounds|surface|contact|visual|evidence/);
    }
    expect(modelling).toContain("inspect_model_bounds");
  });

  test("reference and production UV policy preserve explicit authority without blocking nonvisual edits", async () => {
    const [modelling, reference, texture] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../docs/02-reference/policy.md"),
      source("../docs/03-authoring/texture/standard.md"),
    ]);
    expect(modelling).toMatch(/nonvisual edits[^\n]*current authored state/i);
    expect(reference.toLowerCase()).toMatch(/user requirement|approved reference|source/);
    expect(texture).not.toContain("GEOMETRY PASS");
    expect(texture).toMatch(/128[^\n]*default[^\n]*256[^\n]*opt-in/);
  });

  test("supported controller editing and fresh state are not blocked by stale workflow rules", async () => {
    const [workflow, animation, texture] = await Promise.all([
      source("prompts/bedrock_entity_workflow.md"),
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
      source("../.agents/skills/lazydesigner-texturing/SKILL.md"),
    ]);
    const gaps = workflow.split("Protected gaps remain")[1] ?? "";
    expect(gaps).not.toContain("controller blend-curve mutation");
    expect(workflow).toMatch(/observed geometry mismatch[^\n]*reuse[^\n]*missing\/stale/);
    expect(animation).toMatch(/reuse fresh uuid\/state/i);
    expect(texture).toMatch(/explicit file integration[^\n]*manage_render_profile/);
  });

  test("runtime guidance preserves explicit atlas constraints and bounded contact evidence", async () => {
    const prompt = await source("prompts/bedrock_entity_workflow.md");
    expect(prompt).toContain("Approved bitmap size/density takes precedence");
    expect(prompt).toContain("bounded surface/contact review");
    expect(prompt).toContain("Known major mismatch stays FAIL");
    expect(prompt).not.toContain("New AI production uses logical UV 128×128");
  });

  test("review boundaries preserve rejection and require current differences and playable motion", async () => {
    const [geometry, texture, animation, flow, validation] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../.agents/skills/lazydesigner-texturing/SKILL.md"),
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
      source("../docs/01-product/flow.md"),
      source("../docs/03-authoring/validation/visual.md"),
    ]);
    expect(validation.toLowerCase()).toMatch(/rejection|user.*reject|reopen/);
    expect(geometry).toMatch(/remaining reference differences[\s\S]*representative extremes/);
    expect(texture).toMatch(/identity-critical patch[\s\S]*before propagation/);
    expect(animation).toMatch(/three consecutive cycles[\s\S]*playable evidence[\s\S]*UNVERIFIED/);
    expect(flow.toLowerCase()).toMatch(/technical|visual|user/);
  });

  test("Geometry protects assembly, mapped resize, motion readiness, and requested atlas constraints", async () => {
    const skill = await source("../.agents/skills/lazydesigner-modelling/SKILL.md");

    for (const marker of [
      "motion-ready structure",
      "required surface class",
      "PRESERVE_MAPPING | PRESERVE_DENSITY | RELAYOUT",
      "Requested atlas size and density are constraints",
      "whole assembly boundary",
    ]) expect(skill).toContain(marker);

    expect(skill).toMatch(/known rig\/contact defect[^\n]*does not wait for Animation/i);
    expect(skill).toMatch(/RESIZE[^\n]*mapped\/textured Geometry[\s\S]*UV\/pixel impact/i);
    expect(skill).toMatch(/Do not silently enlarge the atlas/i);
  });

  test("Texturing proves material intent before propagation and protects variants and live authority", async () => {
    const skill = await source("../.agents/skills/lazydesigner-texturing/SKILL.md");

    for (const marker of [
      "representative patch/cohort",
      "formula/gradient/color count is not quality evidence",
      "Requested atlas size/density are constraints",
      "production base role",
      "required hidden material surfaces",
      "stale exported PNG/bbmodel",
    ]) expect(skill).toContain(marker);

    expect(skill).toMatch(/never silently enlarge/i);
    expect(skill).toMatch(/Variants preserve[\s\S]*dimensions\/mapping/i);
  });

  test("Animation proves rig readiness, caller semantics, and time-based quality", async () => {
    const skill = await source("../.agents/skills/lazydesigner-animation/SKILL.md");

    for (const marker of [
      "representative extreme poses",
      "external query/variable caller semantics",
      "signed reverse semantics",
      "repeated full-loop playback",
      "three static snapshots do not prove",
    ]) expect(skill).toContain(marker);

    expect(skill).toMatch(/handoff Geometry first/i);
  });

  test("Finalization is progressive-disclosure and separates save/export/proof levels", async () => {
    const [root, finalization] = await Promise.all([
      source("../AGENTS.md"),
      source("../docs/03-authoring/finalization/standard.md"),
    ]);

    expect(root).toContain("At `FINALIZATION`, load only `docs/03-authoring/finalization/standard.md`");
    expect(root).toMatch(/do not load it during earlier authoring stages/i);

    for (const marker of [
      "Requested Deliverable Contract",
      "Identifier / Reference Integrity",
      "NATIVE_SAVED",
      "EXPORTED",
      "PARSE / REFERENCE VERIFIED",
      "VISUAL PASS",
      "MINECRAFT RUNTIME VERIFIED | UNVERIFIED",
      "current summary, not append-only history",
      "missing requested output",
      "FINALIZATION BLOCKED",
    ]) expect(finalization).toContain(marker);

    expect(finalization).toMatch(/do not patch compiled JSON/i);
    expect(finalization).toMatch(/does not satisfy a separately requested animation export/i);
  });

  test("quality hardening remains generic rather than fixture or object specific", async () => {
    const files = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../.agents/skills/lazydesigner-texturing/SKILL.md"),
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
      source("../docs/03-authoring/finalization/standard.md"),
    ]);

    for (const text of files) {
      for (const fixture of ["tiger-transport-pickup", "small_cannon_boat", "station-sign", "palm-fruit", "businessman-npc", "lift-quality"]) {
        expect(text.toLowerCase()).not.toContain(fixture);
      }
    }
  });
});
