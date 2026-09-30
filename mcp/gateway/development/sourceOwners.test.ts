import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { CAPABILITY_CORE_MANIFEST } from "../../lib/capabilities/manifest";
import { GEOMETRY_SOURCE_OWNERS } from "./sourceOwners/geometry";
import { TEXTURING_SOURCE_OWNERS } from "./sourceOwners/texturing";
import { ANIMATION_SOURCE_OWNERS } from "./sourceOwners/animation";
import { CORE_SOURCE_OWNERS } from "./sourceOwners/core";
import {
  anchorTestForSourceOwner,
  authoringDomainForCapability,
  listExplicitSourceOwners,
  sourceOwnerForCapability,
} from "./sourceOwners";

async function activeTypeScriptFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await activeTypeScriptFiles(path)));
    } else if (
      entry.isFile() &&
      path.endsWith(".ts") &&
      !path.endsWith(".test.ts")
    ) {
      files.push(path.replaceAll("\\", "/"));
    }
  }
  return files;
}

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

  test("explicit owner registries no longer author the legacy test_owner field", async () => {
    for (const path of [
      "gateway/development/sourceOwners/core.ts",
      "gateway/development/sourceOwners/geometry.ts",
      "gateway/development/sourceOwners/texturing.ts",
      "gateway/development/sourceOwners/animation.ts",
    ]) {
      const source = await Bun.file(path).text();
      expect(source, path).toContain("anchor_test:");
      expect(source, path).not.toContain("test_owner:");
    }
  });

  test("public source-owner projections expose anchor_test without legacy test_owner", () => {
    const explicit = listExplicitSourceOwners();
    const owner = sourceOwnerForCapability("manage_cubes");

    expect(owner.anchor_test).toBe(
      "mcp/tests/model-effectiveness-correction-accuracy.test.ts"
    );
    expect(owner).not.toHaveProperty("test_owner");
    expect(explicit.manage_cubes?.anchor_test).toBe(
      "mcp/tests/model-effectiveness-correction-accuracy.test.ts"
    );
    expect(explicit.manage_cubes).not.toHaveProperty("test_owner");
  });

  test("anchor-test semantics remain canonical for explicit and fallback owners", () => {
    expect(
      anchorTestForSourceOwner(sourceOwnerForCapability("manage_cubes"))
    ).toBe("mcp/tests/model-effectiveness-correction-accuracy.test.ts");

    expect(
      anchorTestForSourceOwner(sourceOwnerForCapability("future_unknown_tool"))
    ).toBe("mcp/tests/gateway-contract.test.ts");
  });

  test("active Gateway and development code cannot reintroduce legacy test_owner", async () => {
    const files = [
      ...(await activeTypeScriptFiles("gateway")),
      ...(await activeTypeScriptFiles("scripts")),
    ];

    const violations: string[] = [];
    for (const path of files) {
      const source = await Bun.file(path).text();
      if (
        /\btest_owner\b/.test(source) ||
        /\.test_owner\b/.test(source)
      ) {
        violations.push(path);
      }
    }

    expect(violations).toEqual([]);
  });

  test("preserves representative ownership mappings", () => {
    expect(sourceOwnerForCapability("manage_cubes")).toMatchObject({
      source: "mcp/server/tools/geometry/cubes.ts",
      specialist: ".agents/skills/lazydesigner-modelling/SKILL.md",
    });
    expect(sourceOwnerForCapability("manage_uv_layout")).toMatchObject({
      source: "mcp/server/runtime/uv/layoutService.ts",
      specialist: ".agents/skills/lazydesigner-texturing/SKILL.md",
    });
    expect(sourceOwnerForCapability("manage_animation_controller")).toMatchObject({
      source: "mcp/server/tools/animation/controller.ts",
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
      resolution: "FALLBACK",
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