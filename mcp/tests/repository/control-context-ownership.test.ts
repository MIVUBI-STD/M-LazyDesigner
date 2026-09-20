import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("Control context ownership", () => {
  test("content-addressed context reuse is owned by registry + packet only", async () => {
    expect(await Bun.file("gateway/control/contextCache.ts").exists()).toBe(false);

    const [barrel, registry, packet] = await Promise.all([
      source("gateway/control/index.ts"),
      source("gateway/control/registry.ts"),
      source("gateway/control/packet.ts"),
    ]);

    expect(barrel).not.toContain("contextCache");
    expect(barrel).not.toContain("contextSetChanged");
    expect(registry).toContain("contextHandleCache");
    expect(registry).toContain("sha256");
    expect(packet).toContain("knownContextIds");
    expect(packet).toContain("cached_ids");
    expect(packet).toContain("invalidated_ids");
  });

  test("Control keeps research-derived modelling intelligence out of stage-context payloads", async () => {
    const [registry, projection, packet, controlReadme] = await Promise.all([
      source("gateway/control/registry.ts"),
      source("gateway/control/contextProjection.ts"),
      source("gateway/control/packet.ts"),
      source("gateway/control/README.md"),
    ]);

    expect(registry).toContain("MODELLING_PATH");
    expect(registry).toContain("PROFILE_PATHS");
    expect(registry).toContain("if (domain === \"GEOMETRY\")");
    expect(registry).toContain("if (selectedProfile) required.push");
    expect(registry).toContain("else if (domain === \"ANIMATION\")");

    for (const forbidden of [
      "smallest_changed_branch",
      "ownership_reuse",
      "rig_clip_controller_budget",
      "locator_parent_motion_rule",
      "family_attachment_contract",
      "responsibility_vocabulary",
      "presentation_variant_contract",
      "direct_locator_animation",
    ]) {
      expect(projection).not.toContain(forbidden);
      expect(packet).not.toContain(forbidden);
    }

    expect(controlReadme).toContain("Research-derived authoring guidance stays");
    expect(controlReadme).toContain("Control must not add duplicate stage-context fields");
  });

  test("selected modelling profile originates in REFERENCE.json and Control only transports it", async () => {
    const [referenceSource, registry, modelling, projectionDoc] = await Promise.all([
      source("gateway/control/referencePackage.ts"),
      source("gateway/control/registry.ts"),
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../docs/04-system/control/context-projection.md"),
    ]);

    expect(referenceSource).toContain("profileValue(asset?.profile)");
    expect(referenceSource).toContain("selected_profile: selectedProfile");
    expect(registry).toContain("contextForAuthoringDomain(");
    expect(registry).toContain("PROFILE_PATHS[selectedProfile]");
    expect(modelling).toContain("accept `selected_profile` from Control");
    expect(modelling).toContain("current Reference Package");
    expect(projectionDoc).toContain("Control does not independently classify the asset");
  });
  test("fallback source ownership points to the canonical Runtime surface owner", async () => {
    const registry = await source("gateway/control/registry.ts");

    expect(registry).toContain('source: "mcp/server/runtime/registration.ts"');
    expect(registry).not.toContain('source: "mcp/server/tools.ts"');
  });

  test("Control does not add a second persistent context state store", async () => {
    const packet = await source("gateway/control/packet.ts");
    const registry = await source("gateway/control/registry.ts");

    expect(packet).not.toContain("writeFile");
    expect(packet).not.toContain("mkdir");
    expect(registry).not.toContain("writeFile");
    expect(registry).not.toContain("mkdir");
  });
});
