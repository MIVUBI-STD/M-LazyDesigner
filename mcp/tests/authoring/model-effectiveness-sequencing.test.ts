import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("model creation effectiveness — texture/animation sequencing", () => {
  test("Authoring keeps Geometry approval → UV PASS → Texturing while Animation uses Gateway handoff", async () => {
    const [agents, flow, workspace, control, texturing, animation] = await Promise.all([
      source("../AGENTS.md"),
      source("../docs/01-product/flow.md"),
      source("../workspace/README.md"),
      source("gateway/control/packet.ts"),
      source("../.agents/skills/lazydesigner-texturing/SKILL.md"),
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
    ]);

    for (const text of [agents, workspace]) {
      expect(text).toContain("Geometry APPROVED");
      expect(text).toContain("UV Layout PASS");
    }
    expect(flow).toContain("USER GEOMETRY APPROVAL");
    expect(flow).toContain("PRODUCTION UV LAYOUT");
    expect(flow).toContain("TEXTURING");
    expect(workspace).toContain("Texturing cannot enter `IN_PROGRESS` until `UV Layout: PASS`");
    expect(control).toContain("GEOMETRY_APPROVAL_REQUIRED");
    expect(control).toContain("UV_LAYOUT_PASS_REQUIRED");
    expect(control).toContain("TEXTURE_APPROVAL_REQUIRED");

    expect(agents).toContain("AUTHORING↔Animation handoff through Gateway");
    for (const text of [texturing, animation]) {
      expect(text).toContain("switch_authoring_phase");
      expect(text).toContain("Gateway");
    }
    expect(texturing).toContain("HANDOFF_REQUIRED");
    expect(animation).toContain("HANDOFF_REQUIRED");
    expect(texturing).toContain("No Geometry↔Texturing phase switch");
    expect(animation.toLowerCase().replaceAll("/", " ")).toContain("participating hierarchy pivots are suitable");
  });

  test("existing-asset baseline policy stays with the modelling owner", async () => {
    const modelling = await source("../.agents/skills/lazydesigner-modelling/SKILL.md");
    expect(modelling).toMatch(/Existing geometry is a baseline, not fidelity proof/);
    expect(modelling).toContain("Existing Assets / Shared Session");
  });

  test("Texturing can correct upstream Geometry/UV in-session; Animation still hands back", async () => {
    const [texturing, animation] = await Promise.all([
      source("../.agents/skills/lazydesigner-texturing/SKILL.md"),
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
    ]);

    expect(texturing).toMatch(/unlocked\/invalid UV\s+→ Geometry owner \+ bounded UV correction; no phase switch/);
    expect(texturing).toContain("Geometry/UV capabilities remain callable for bounded upstream correction");
    expect(texturing).toContain("No Geometry↔Texturing phase switch");
    expect(animation).toContain("Animation owns motion, not structural rig mutation");
    expect(animation).toContain("target_phase: geometry");
    expect(animation).not.toContain("tool_search");
  });

  test("texture and animation guidance remains evidence-based without preset density metrics", async () => {
    const [texturing, animation, texturePolicy] = await Promise.all([
      source("../.agents/skills/lazydesigner-texturing/SKILL.md"),
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
      source("../docs/03-authoring/texture/standard.md"),
    ]);

    expect(texturePolicy).toContain("## Box UV / UV Lock");
    expect(texturePolicy).toContain("one coherent final UV lock with autouv=0");
    expect(texturePolicy).toContain("Do not optimize atlas occupancy as a quality score");
    expect(texturePolicy).toContain("physical pixels per UV unit");

    expect(texturing).toContain("pixels per UV unit");
    expect(texturing).toContain("random high-contrast noise");
    for (const quality of ["face aspect ratio", "texel density", "semantic UV reuse"]) {
      expect(texturing).toContain(quality);
    }

    const normalizedAnimation = animation.toLowerCase();
    expect(normalizedAnimation).toContain("no universal fps, duration, amplitude, phase, keyframe count, or bezier target");
    expect(normalizedAnimation).toContain("animation quality score");
    expect(normalizedAnimation).toContain("manage_animation_timeline");
    expect(normalizedAnimation).toContain("molang");
  });

  test("sequencing remains instruction/stage ownership rather than a registration profile", async () => {
    const profile = await source("lib/registrationProfile.ts");
    expect(profile).toContain('export type McpRegistrationProfile = "bedrock_entity" | "extended";');
    expect(profile).not.toContain("sequencing_profile");
    expect(profile).not.toContain("readiness_profile");
  });
});
