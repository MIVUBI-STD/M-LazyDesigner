import { describe, expect, test } from "bun:test";
import { classifyMcpToolPhaseByName } from "@/lib/authoringPhase";
import { authoringDomainForCapability } from "@/gateway/control";

describe("LazyDesigner Control canonical phase classification", () => {
  test("Control derives high-frequency capability domains from authoringPhase", () => {
    const cases = [
      ["manage_cubes", "geometry", "GEOMETRY"],
      ["bone_rigging", "geometry", "GEOMETRY"],
      ["create_texture", "texturing", "TEXTURING"],
      ["paint_with_brush", "texturing", "TEXTURING"],
      ["manage_material", "texturing", "TEXTURING"],
      ["create_animation", "animation", "ANIMATION"],
      ["manage_animation_timeline", "animation", "ANIMATION"],
      ["get_project_info", "core", "CORE"],
      ["inspect_model_bounds", "core", "CORE"],
      ["list_textures", "core", "CORE"],
    ] as const;

    for (const [capability, phase, domain] of cases) {
      expect(classifyMcpToolPhaseByName(capability), capability).toBe(phase);
      expect(authoringDomainForCapability(capability), capability).toBe(domain);
    }
  });

  test("Control manifest owns phase projection without duplicate capability sets", async () => {
    const [registry, manifest] = await Promise.all([
      Bun.file("gateway/control/registry.ts").text(),
      Bun.file("gateway/control/capabilityManifest.ts").text(),
    ]);
    expect(manifest).toContain("classifyMcpToolPhaseByName");
    expect(registry).toContain("getControlCapabilityManifestEntry");
    for (const source of [registry, manifest]) {
      expect(source).not.toContain("GEOMETRY_CAPABILITIES");
      expect(source).not.toContain("TEXTURING_CAPABILITIES");
      expect(source).not.toContain("ANIMATION_CAPABILITIES");
    }
  });
});
