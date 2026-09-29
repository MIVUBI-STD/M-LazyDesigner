import { describe, expect, test } from "bun:test";
import { CAPABILITY_CORE_MANIFEST } from "@/lib/capabilities/manifest";
import { auditCapabilitySemanticCollisions } from "@/gateway/capabilities/collisionAudit";
import { searchCapabilityCatalog, type BackendTool } from "@/gateway/contract";
import { getAllToolDefinitions } from "@/lib/factories";
import { getMcpSurfaceToolNames } from "@/server/tools";

describe("capability semantic collision audit", () => {
  test("audits the complete canonical capability manifest", () => {
    expect(CAPABILITY_CORE_MANIFEST.size).toBeGreaterThanOrEqual(54);
    expect(auditCapabilitySemanticCollisions()).toEqual([]);
  });

  test("particle read and mutation routes no longer share generic aliases", () => {
    const inspect = CAPABILITY_CORE_MANIFEST.get("inspect_particle");
    const manage = CAPABILITY_CORE_MANIFEST.get("manage_particle");
    expect(inspect?.aliases).toEqual(
      expect.arrayContaining([
        "inspect particle emitter",
        "inspect particle molang",
      ])
    );
    expect(manage?.aliases).toEqual(
      expect.arrayContaining([
        "author particle emitter",
        "author particle molang",
      ])
    );
    expect(inspect?.aliases).not.toContain("particle emitter");
    expect(manage?.aliases).not.toContain("particle emitter");
  });

  test("routing keeps inspect and author particle intents separate", () => {
    const definitions = getAllToolDefinitions();
    const catalog = getMcpSurfaceToolNames("bedrock_entity", "animation").map(
      (name) => ({
        name,
        description: definitions[name].description,
        annotations: definitions[name].annotations,
      })
    ) as BackendTool[];

    expect(
      searchCapabilityCatalog(catalog, "inspect this particle emitter", 3)[0]
        ?.capability_id
    ).toBe("inspect_particle");

    expect(
      searchCapabilityCatalog(catalog, "author a particle emitter", 3)[0]
        ?.capability_id
    ).toBe("manage_particle");
  });
});
