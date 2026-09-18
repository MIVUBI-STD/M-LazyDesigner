import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

function lower(text: string): string {
  return text.toLowerCase();
}

describe("model creation effectiveness — professional construction without presets", () => {
  test("professional construction stays reasoning-based rather than preset-based", async () => {
    const [modelling, workflow, geometry] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("prompts/bedrock_entity_workflow.md"),
      source("../docs/03-authoring/modelling/standard.md"),
    ]);

    for (const text of [modelling, workflow, geometry]) {
      expect(lower(text)).toContain("not presets");
      expect(lower(text)).toContain("transform ownership");
      expect(lower(text)).toMatch(/primary (?:blockout|cube batch)/);
      expect(lower(text)).toContain("identity-weighted");
    }

    expect(geometry).toContain("thin or zero-thickness plane-like Cube");
    expect(geometry).toContain("layered surface");
    expect(geometry).toContain("linked meaningful segments");
    expect(geometry).toContain("unit-Cube staircasing");
    expect(geometry).toContain("Locator intent");
    expect(geometry).toContain("positive-only or fixed-value rule");
  });

  test("representation stays 3D-need-first while the small-detail threshold remains a guardrail", async () => {
    const [modelling, geometry] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../docs/03-authoring/modelling/standard.md"),
    ]);

    for (const text of [modelling, geometry]) {
      expect(text).toContain("PLANAR_CUTOUT_CARRIER");
      expect(lower(text)).toContain("representation");
      expect(lower(text)).toContain("guardrail");
      expect(lower(text)).toContain("not a classifier");
    }

    expect(geometry).toContain("minimum geometry required to preserve correct 3D form");
    expect(geometry).not.toContain("PrimitiveAnything");
  });

  test("representation eligibility keeps the complete canonical ladder and bounded escalation", async () => {
    const [modelling, geometry] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../docs/03-authoring/modelling/standard.md"),
    ]);

    for (const representation of [
      "SOLID_CUBOID",
      "PLANE_LIKE",
      "PLANAR_CUTOUT_CARRIER",
      "LAYERED_SURFACE",
      "SEGMENTED_FORM",
      "TEXTURE",
      "OMIT",
    ]) {
      expect(modelling).toContain(representation);
      expect(geometry).toContain(representation);
    }

    expect(geometry).toContain("Escalate **one level at a time**");
    expect(geometry).toContain("REDUNDANT_GEOMETRY");
    expect(geometry).toContain("minimum sufficient geometry");
  });

  test("surface integrity distinguishes required closure from intentional openings and intersections", async () => {
    const [modelling, geometry] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../docs/03-authoring/modelling/standard.md"),
    ]);

    for (const relation of ["CLOSED_BOUNDARY", "INTENTIONAL_OPENING", "LAYERED_OFFSET", "INTENTIONAL_INTERSECTION", "CUTOUT_CARRIER"]) {
      expect(modelling).toContain(relation);
      expect(geometry).toContain(relation);
    }

    expect(lower(modelling)).toMatch(/surface.*contact/);
    expect(modelling).toContain("do not force universal watertight geometry");
    expect(geometry).toContain("not that every model is universally watertight");
  });

  test("transform ownership distinguishes local Cube transforms from shared Group/Bone transforms", async () => {
    const [modelling, workflow, geometry] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("prompts/bedrock_entity_workflow.md"),
      source("../docs/03-authoring/modelling/standard.md"),
    ]);

    expect(modelling).toContain("Group/Bone-owned");
    for (const text of [workflow, geometry]) {
      expect(text).toContain("Cube-owned");
      expect(text).toContain("Group/Bone");
    }
    expect(geometry).toContain("Group/Bone-owned transform");
    expect(geometry).toContain("Do not create hierarchy solely to increase depth or node count");
  });


  test("research-backed ownership reuse stays compact and avoids action-driven rig growth", async () => {
    const [modelling, animationSkill, geometry, animation] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
      source("../docs/03-authoring/modelling/standard.md"),
      source("../docs/03-authoring/animation/standard.md"),
    ]);

    expect(modelling).toContain("smallest changed");
    expect(geometry).toContain("smallest changed branch");
    expect(lower(modelling)).toContain("more clips or controller states");
    expect(geometry).toContain("Growth in one budget is not sufficient reason");
    for (const text of [modelling, geometry]) {
      expect(lower(text)).toMatch(/locator.*parent.*group\/bone|group\/bone.*locator/);
    }

    for (const text of [animationSkill, animation]) {
      expect(text).toContain("Rig / Clip / Controller Budget");
      expect(lower(text)).toContain("reuse existing semantic owners");
      expect(lower(text)).toMatch(/controller.*hierarchy|hierarchy.*controller/);
    }

    const combined = lower(`${modelling}\n${animationSkill}\n${geometry}\n${animation}`);
    expect(combined).toContain("separate budgets");
    expect(combined).toContain("existing semantic owner");
    expect(combined).toContain("smallest changed branch");
  });


  test("durable authoring policy stays in docs while Skills remain hot-path execution projections", async () => {
    const [taxonomy, modelling, animationSkill] = await Promise.all([
      source("../docs/04-system/skill-taxonomy.md"),
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
    ]);

    expect(taxonomy).toContain("Docs   = durable semantic policy / contracts");
    expect(taxonomy).toContain("Skills = execution procedure and specialist operating instructions");

    expect(modelling).toContain("Durable Geometry");
    expect(modelling).toContain("docs/03-authoring/modelling/standard.md");
    expect(modelling).toContain("compact operational triggers");
    expect(lower(modelling)).not.toContain("it owns universal geometry");

    expect(animationSkill).toContain("Durable Animation policy is owned by");
    expect(animationSkill).toContain("docs/03-authoring/animation/standard.md");
    expect(animationSkill).toContain("must not become a competing policy owner");
  });


  test("modelling profiles inherit compact ownership reuse without forcing fixed rigs", async () => {
    const [profiles, vehicle, humanoid, creature, mechanical] = await Promise.all([
      source("../docs/03-authoring/modelling/profiles/README.md"),
      source("../docs/03-authoring/modelling/profiles/vehicle.md"),
      source("../docs/03-authoring/modelling/profiles/humanoid.md"),
      source("../docs/03-authoring/modelling/profiles/creature.md"),
      source("../docs/03-authoring/modelling/profiles/mechanical.md"),
    ]);

    expect(profiles).toContain("rig, clip, and controller complexity are separate budgets");
    expect(profiles).toContain("smallest changed branch");
    expect(profiles).toContain("family-level attachment semantics");

    expect(vehicle).toContain("shared assembly parent");
    expect(vehicle).toContain("smallest changed branch");

    expect(humanoid).toContain("Animation-library growth is not evidence for hierarchy growth");
    expect(humanoid).toContain("first-/third-person contexts");

    expect(creature).toContain("Reuse family attachment semantics");
    expect(creature).toContain("phase/amplitude differences");

    expect(mechanical).toContain("same visible mechanical owner");
    expect(mechanical).toContain("shared assembly parent");

    const combined = lower(`${profiles}\n${vehicle}\n${humanoid}\n${creature}\n${mechanical}`);
    expect(combined).toContain("stable semantic ownership");
    expect(combined).toContain("smallest changed branch");
    expect(combined).toContain("without forcing identical topology");
  });

  test("runtime-facing guidance keeps one normal hierarchy path and parent-driven Locator motion", async () => {
    const [modelling, animationSkill, animationPolicy, animationSource, consolidated] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
      source("../docs/03-authoring/animation/standard.md"),
      source("server/tools/animation.ts"),
      source("server/runtime/consolidatedTools.ts"),
    ]);

    for (const tool of [
      "add_group",
      "modify_group",
      "reparent_element",
      "rename_element",
      "remove_element",
    ]) expect(modelling).toContain(tool);

    expect(modelling).toContain("Use `bone_rigging` only when IK or bone mirroring is specifically required");
    expect(animationSource).toContain("Advanced/compatibility rig operations");
    expect(animationSource).toContain("Prefer bone_rigging only for IK or bone mirroring");

    expect(animationSkill).toContain("Locators are not direct animation targets");
    expect(animationPolicy).toContain("Current animation authoring targets Group/Bone animators");
    expect(animationPolicy).toContain("animated parent Group/Bone");

    expect(consolidated).toContain("retainExecutorsBehindConsolidatedSurface");
    expect(consolidated).toContain("if (tools[name]) tools[name].enabled = false");
    expect(consolidated).toContain('name: "manage_animation_timeline"');
  });

  test("professional samples never become callable presets, profiles, or fixture anatomy", async () => {
    const [profile, cubes, element, modelling, workflow] = await Promise.all([
      source("lib/registrationProfile.ts"),
      source("server/tools/cubes.ts"),
      source("server/tools/element.ts"),
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("prompts/bedrock_entity_workflow.md"),
    ]);

    const runtime = `${profile}\n${cubes}\n${element}`;
    for (const forbidden of ["professional_preset", "construction_preset", "asset_class_profile", "detail_density_profile", "professional_planner"]) {
      expect(runtime).not.toContain(forbidden);
    }

    const activeReasoning = lower(`${modelling}\n${workflow}`);
    for (const fixture of ["weapon_katana", "armor_dragon_helmet", "skeleton_spinosaurus", "sample_samurai", "dragon_boss"]) {
      expect(activeReasoning).not.toContain(fixture);
    }
  });
});
