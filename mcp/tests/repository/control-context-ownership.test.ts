import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("Control context ownership", () => {
  test("content-addressed context reuse is owned by registry + packet only", async () => {
    expect(await Bun.file("gateway/control/contextCache.ts").exists()).toBe(false);

    const [barrel, contexts, packet, packetContext] = await Promise.all([
      source("gateway/control/index.ts"),
      source("gateway/control/contexts.ts"),
      source("gateway/control/packet.ts"),
      source("gateway/control/packetContext.ts"),
    ]);

    expect(barrel).not.toContain("contextCache");
    expect(barrel).not.toContain("contextSetChanged");
    expect(contexts).toContain("contextHandleCache");
    expect(contexts).toContain("sha256");
    expect(packet).toContain("knownContextIds");
    expect(packetContext).toContain("cached_ids");
    expect(packetContext).toContain("invalidated_ids");
  });

  test("Control keeps research-derived modelling intelligence out of stage-context payloads", async () => {
    const [contexts, projection, packet, controlReadme] = await Promise.all([
      source("gateway/control/contexts.ts"),
      source("gateway/control/contextProjection.ts"),
      source("gateway/control/packet.ts"),
      source("gateway/control/README.md"),
    ]);

    expect(contexts).toContain("MODELLING_PATH");
    expect(contexts).toContain("PROFILE_PATHS");
    expect(contexts).toContain("if (domain === \"GEOMETRY\")");
    expect(contexts).toContain("if (selectedProfile) required.push");
    expect(contexts).toContain("else if (domain === \"ANIMATION\")");

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
    const [referenceParser, contexts, modelling, projectionDoc] = await Promise.all([
      source("gateway/control/referenceParser.ts"),
      source("gateway/control/contexts.ts"),
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../docs/04-system/control/context-projection.md"),
    ]);

    expect(referenceParser).toContain("profileValue(asset?.profile)");
    expect(referenceParser).toContain("selected_profile: selectedProfile");
    expect(contexts).toContain("contextForAuthoringDomain(");
    expect(contexts).toContain("PROFILE_PATHS[selectedProfile]");
    expect(modelling).toContain("accept `selected_profile` from Control");
    expect(modelling).toContain("current Reference Package");
    expect(projectionDoc).toContain("Control does not independently classify the asset");
  });
  test("fallback source ownership points to the canonical Runtime surface owner", async () => {
    const sourceOwners = await source("gateway/control/sourceOwners.ts");

    expect(sourceOwners).toContain('source: "mcp/server/runtime/registration.ts"');
    expect(sourceOwners).not.toContain('source: "mcp/server/tools.ts"');
  });

  test("Control does not add a second persistent context state store", async () => {
    const packet = await source("gateway/control/packet.ts");
    const contexts = await source("gateway/control/contexts.ts");

    expect(packet).not.toContain("writeFile");
    expect(packet).not.toContain("mkdir");
    expect(contexts).not.toContain("writeFile");
    expect(contexts).not.toContain("mkdir");
  });
});
