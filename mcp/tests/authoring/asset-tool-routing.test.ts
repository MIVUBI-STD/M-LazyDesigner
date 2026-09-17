import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("LazyDesigner asset routing", () => {
  test("root routing delegates authoring orientation to Control, not a router Skill", async () => {
    const root = await source("../AGENTS.md");

    expect(root).toContain("LazyDesigner Control is the canonical routing/context authority");
    expect(root).toContain("Control active stage/context");
    expect(root).toContain("exact known Runtime capability");
    expect(root).toContain("reuse returned state + control_delta");
    expect(root).not.toContain("→ .agents/skills/blockit-bedrock-entity-mcp/SKILL.md");
    expect(root).not.toContain("router + matching specialist");
  });

  test("Control uses direct-first bounded discovery instead of repository/tool ceremony", async () => {
    const [policy, controlReadme] = await Promise.all([
      source("gateway/control/routingPolicy.ts"),
      source("gateway/control/README.md"),
    ]);

    expect(policy).toContain('strategy: "DIRECT_FIRST"');
    expect(policy).toContain('known_capability: "INVOKE_CAPABILITY"');
    expect(policy).toContain('unknown_capability: "SEARCH_CAPABILITIES"');
    expect(policy).toContain('schema_uncertain: "DESCRIBE_CAPABILITY"');
    expect(policy).toContain('stale_or_lost_context: "STATUS"');
    expect(policy).toContain("search_limit: 4");
    expect(controlReadme).toContain("minimum canonical context");
    expect(controlReadme).not.toContain("3D_ASSISTED");
  });

  test("authoring context loads only the active specialist and one Geometry profile", async () => {
    const [registry, root] = await Promise.all([
      source("gateway/control/registry.ts"),
      source("../AGENTS.md"),
    ]);

    expect(registry).toContain('.agents/skills/lazydesigner-modelling/SKILL.md');
    expect(registry).toContain('.agents/skills/lazydesigner-texturing/SKILL.md');
    expect(registry).toContain('.agents/skills/lazydesigner-animation/SKILL.md');
    expect(registry).toContain("PROFILE_PATHS[selectedProfile]");
    expect(root).toContain("exactly one selected modelling profile");
    expect(root).toContain("Do not preload sibling specialists or all profiles");
  });

  test("Geometry and Texturing share AUTHORING while Animation remains the handoff boundary", async () => {
    const [root, texturing, animation] = await Promise.all([
      source("../AGENTS.md"),
      source("../.agents/skills/lazydesigner-texturing/SKILL.md"),
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
    ]);

    expect(root).toContain("Geometry↔Texturing use the shared AUTHORING surface");
    expect(root).toContain("Animation remains the Runtime phase handoff boundary");
    expect(texturing).toContain("No Geometry↔Texturing phase switch");
    expect(animation).toContain("HANDOFF_REQUIRED");
    expect(animation).toContain("switch_authoring_phase");
  });

  test("Workspace lifecycle prevents illegal late-stage entry", async () => {
    const packet = await source("gateway/control/packet.ts");

    expect(packet).toContain("GEOMETRY_APPROVAL_REQUIRED");
    expect(packet).toContain("UV_LAYOUT_PASS_REQUIRED");
    expect(packet).toContain("TEXTURE_APPROVAL_REQUIRED");
    expect(packet).toContain("WORKSPACE_LIFECYCLE_UNAVAILABLE");
  });

  test("Control separates reference intent from current correction delta", async () => {
    const projection = await source("gateway/control/contextProjection.ts");

    expect(projection).toContain("original_user_intent");
    expect(projection).toContain("current_user_delta");
    expect(projection).toContain("reference_package_id_or_hash");
    expect(projection).toContain("workspace_revision_or_hash");
  });

  test("normal asset routing excludes retired 3D-assisted architecture", async () => {
    const [root, controlReadme, modelling] = await Promise.all([
      source("../AGENTS.md"),
      source("gateway/control/README.md"),
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
    ]);

    for (const owner of [root, controlReadme, modelling]) {
      expect(owner).not.toContain("DIRECT | 3D_ASSISTED");
      expect(owner).not.toContain("Shape Reconstruction");
      expect(owner).not.toContain("PrimitiveAnything");
      expect(owner).not.toContain("manage_geometry_reference");
    }
  });

  test("internal extended registration identifier remains developer compatibility only", async () => {
    const [profile, settings] = await Promise.all([
      source("lib/registrationProfile.ts"),
      source("ui/settings.ts"),
    ]);

    expect(profile).toContain('export type McpRegistrationProfile = "bedrock_entity" | "extended";');
    expect(settings).toContain('name: "Legacy Compatibility (Developer)"');
    expect(settings).toContain("Troubleshooting support for older or generic Blockbench workflows");
    expect(settings).toContain("Leave this off for normal use");
    expect(profile).not.toContain("routing_state");
  });
});
