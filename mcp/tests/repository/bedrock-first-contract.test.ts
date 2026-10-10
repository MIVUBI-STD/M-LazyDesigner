import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("LazyDesigner Bedrock-first contract", () => {
  test("core authoring identity stays Minecraft Bedrock specific", async () => {
    const [phase, profile, server] = await Promise.all([
      source("lib/capabilities/authoringStage.ts"),
      source("lib/capabilities/registrationProfile.ts"),
      source("server/server.ts"),
    ]);

    expect(phase).toContain("16 Blockbench units=1 Minecraft block");
    expect(profile).toContain('DEFAULT_MCP_REGISTRATION_PROFILE: McpRegistrationProfile =\n  "bedrock_entity"');
    expect(profile).toContain("BEDROCK_ENTITY_REGISTRATION_FAMILIES");
    expect(profile).toContain('"export"');
    expect(server).toContain("LazyDesigner Bedrock Entity authoring");
  });

  test("authoring specialists retain Bedrock geometry, texture and animation ownership", async () => {
    const [modelling, texturing, animation] = await Promise.all([
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../.agents/skills/lazydesigner-texturing/SKILL.md"),
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
    ]);

    expect(modelling).toContain("LazyDesigner Bedrock Modelling");
    expect(modelling).toContain("UV Layout");
    expect(modelling).toContain("Group/Bone-owned");
    expect(texturing).toContain("LazyDesigner Bedrock Texturing");
    expect(texturing).toContain("PBR/material semantics");
    expect(texturing).toContain("manage_material");
    expect(animation).toContain("LazyDesigner Bedrock Animation");
    expect(animation).toContain("Animation Controller");
    expect(animation).toContain("Particle is asset-only");
  });

  test("particle authoring stays Bedrock asset-only and does not absorb gameplay wiring", async () => {
    const [particle, animation] = await Promise.all([
      source("server/tools/particle/manage.ts"),
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
    ]);

    expect(particle).toContain("particle_effect");
    expect(particle).toContain(".particle.json");
    expect(animation).toContain("no client-entity wiring");
    expect(animation).toContain("BP/gameplay integration is out");
  });

  test("generic Blockbench fallback families remain opt-in instead of normal authoring", async () => {
    const profile = await source("lib/capabilities/registrationProfile.ts");
    expect(profile).toContain('EXTENDED_LEGACY_REGISTRATION_FAMILIES = [\n  "import",\n  "ui",');
    expect(profile).toContain('DEFAULT_MCP_REGISTRATION_PROFILE: McpRegistrationProfile =\n  "bedrock_entity"');
  });
});
