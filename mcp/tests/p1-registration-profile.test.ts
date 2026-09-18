import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import {
  BEDROCK_ENTITY_REGISTRATION_FAMILIES,
  DEFAULT_MCP_REGISTRATION_PROFILE,
  EXTENDED_LEGACY_REGISTRATION_FAMILIES,
  getRegistrationFamilies,
} from "@/lib/registrationProfile";

describe("P1 Bedrock Entity registration profile", () => {
  test("default profile preserves audited Bedrock families", () => {
    expect(DEFAULT_MCP_REGISTRATION_PROFILE).toBe("bedrock_entity");

    const families = new Set(getRegistrationFamilies());

    for (const requiredFamily of [
      "animation",
      "animation_inspection",
      "camera",
      "cubes",
      "elements",
      "element_inspection",
      "export",
      "history",
      "material_instances",
      "paint",
      "project",
      "textures",
      "validator_resources",
    ]) {
      expect(families.has(requiredFamily as never)).toBe(true);
    }

    expect(families.has("import" as never)).toBe(false);
    expect(families.has("ui" as never)).toBe(false);
  });

  test("extended profile adds only retained generic fallback families", () => {
    const defaultFamilies = getRegistrationFamilies("bedrock_entity");
    const extendedFamilies = getRegistrationFamilies("extended");

    expect(new Set(defaultFamilies).size).toBe(defaultFamilies.length);
    expect(new Set(extendedFamilies).size).toBe(extendedFamilies.length);

    expect(extendedFamilies).toEqual([
      ...BEDROCK_ENTITY_REGISTRATION_FAMILIES,
      ...EXTENDED_LEGACY_REGISTRATION_FAMILIES,
    ]);
    expect(EXTENDED_LEGACY_REGISTRATION_FAMILIES).toEqual(["import", "ui"]);
  });

  test("registration root consumes the explicit default profile", async () => {
    const [facade, registration] = await Promise.all([
      readFile(new URL("../server/tools.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/runtime/registration.ts", import.meta.url), "utf8"),
    ]);

    expect(facade).toContain(
      "registerMcpProfile(DEFAULT_MCP_REGISTRATION_PROFILE);"
    );
    expect(registration).toContain("getRegistrationFamilies(profile)");
    expect(registration).toContain("import: registerImportTools");
    expect(registration).toContain("ui: registerUITools");
    expect(registration).not.toContain("registerImportTools,\n  registerUITools");
  });

  test("extended compatibility cannot re-enable individually disabled high-risk tools", () => {
    const probe = String.raw`
import assert from "node:assert/strict";
import { registerMcpProfile, getMcpSurfaceToolNames, isCatalogToolEnabled } from "./server/tools.ts";
import { tools } from "./lib/factories.ts";

registerMcpProfile("extended");
assert.ok(tools.from_geo_json, "extended compatibility should retain the legacy definition");
assert.equal(tools.from_geo_json.enabled, false);
assert.equal(isCatalogToolEnabled("from_geo_json"), false);
for (const phase of ["geometry", "texturing", "animation"]) {
  assert.equal(getMcpSurfaceToolNames("extended", phase).includes("from_geo_json"), false);
}
assert.equal(getMcpSurfaceToolNames("extended", "geometry").includes("risky_eval"), false);
console.log("DISABLED_HIGH_RISK_TOOLS_PASS");
`;

    const result = Bun.spawnSync({
      cmd: [process.execPath, "--eval", probe],
      cwd: new URL("..", import.meta.url).pathname,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 15_000,
    });
    const output = result.stdout.toString();
    expect(result.exitCode, result.stderr.toString() || output).toBe(0);
    expect(output).toContain("DISABLED_HIGH_RISK_TOOLS_PASS");
  }, 20_000);

  test("runtime prompt registry excludes maintainer-only references", async () => {
    const source = await readFile(
      new URL("../server/prompts.ts", import.meta.url),
      "utf8"
    );

    expect(source).toContain('createPrompt("bedrock_entity_workflow"');
    expect(source).not.toContain('createPrompt("blockbench_native_apis"');
    expect(source).not.toContain('createPrompt("blockbench_code_eval_safety"');
  });
});
