import { describe, expect, test } from "bun:test";
import { CAPABILITY_CORE_MANIFEST } from "../../lib/capabilities/manifest";
import { GEOMETRY_SOURCE_OWNERS } from "./sourceOwners/geometry";
import { TEXTURING_SOURCE_OWNERS } from "./sourceOwners/texturing";
import { ANIMATION_SOURCE_OWNERS } from "./sourceOwners/animation";
import { CORE_SOURCE_OWNERS } from "./sourceOwners/core";
import {
  authoringDomainForCapability,
  listExplicitSourceOwners,
  sourceOwnerForCapability,
} from "./sourceOwners";

const MODULES = [
  GEOMETRY_SOURCE_OWNERS,
  TEXTURING_SOURCE_OWNERS,
  ANIMATION_SOURCE_OWNERS,
  CORE_SOURCE_OWNERS,
] as const;

describe("Control source-owner registry", () => {
  test("domain source-owner modules do not overlap keys", () => {
    const seen = new Set<string>();
    for (const module of MODULES) {
      for (const key of Object.keys(module)) {
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
    expect(Object.keys(listExplicitSourceOwners()).length).toBe(seen.size);
  });

  test("every canonical phased capability has an explicit source owner", () => {
    const explicit = listExplicitSourceOwners();
    const missing = [...CAPABILITY_CORE_MANIFEST.entries()]
      .filter(([, entry]) => entry.phase != null)
      .map(([name]) => name)
      .filter((name) => explicit[name] == null)
      .sort();

    expect(missing).toEqual([]);
  });

  test("preserves representative ownership mappings", () => {
    expect(sourceOwnerForCapability("manage_cubes")).toMatchObject({
      source: "mcp/server/tools/cubes.ts",
      specialist: ".agents/skills/lazydesigner-modelling/SKILL.md",
    });
    expect(sourceOwnerForCapability("manage_uv_layout")).toMatchObject({
      source: "mcp/server/runtime/uvLayoutService.ts",
      specialist: ".agents/skills/lazydesigner-texturing/SKILL.md",
    });
    expect(sourceOwnerForCapability("manage_animation_controller")).toMatchObject({
      source: "mcp/server/tools/animation-controller.ts",
      specialist: ".agents/skills/lazydesigner-animation/SKILL.md",
    });
    expect(sourceOwnerForCapability("switch_authoring_phase")).toMatchObject({
      source: "mcp/server/runtime/phaseControl.ts",
      specialist: null,
    });
  });

  test("canonical capabilities never use the generic registration fallback", () => {
    const explicit = listExplicitSourceOwners();
    for (const [name, entry] of CAPABILITY_CORE_MANIFEST) {
      if (entry.phase == null) continue;
      expect(explicit[name]).toBeDefined();
      expect(sourceOwnerForCapability(name).source).not.toBe(
        "mcp/server/runtime/registration.ts"
      );
    }
  });

  test("unknown capabilities fall back by canonical authoring domain", () => {
    expect(authoringDomainForCapability("future_unknown_tool")).toBe("CORE");
    expect(sourceOwnerForCapability("future_unknown_tool")).toMatchObject({
      source: "mcp/server/runtime/registration.ts",
      specialist: null,
    });
  });
  test("source-owner modules match canonical authoring domains", () => {
    for (const key of Object.keys(GEOMETRY_SOURCE_OWNERS)) {
      expect(authoringDomainForCapability(key)).toBe("GEOMETRY");
    }
    for (const key of Object.keys(TEXTURING_SOURCE_OWNERS)) {
      expect(authoringDomainForCapability(key)).toBe("TEXTURING");
    }
    for (const key of Object.keys(ANIMATION_SOURCE_OWNERS)) {
      expect(authoringDomainForCapability(key)).toBe("ANIMATION");
    }
    for (const key of Object.keys(CORE_SOURCE_OWNERS)) {
      expect(authoringDomainForCapability(key)).toBe("CORE");
    }
  });

});
