import { describe, expect, test } from "bun:test";
import { focusedGetTextureParameters } from "@/lib/textureEvidence";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("texture render-aware alpha runtime", () => {
  test("get_texture keeps render-aware alpha as opt-in evidence on the existing tool", async () => {
    const [runtime, bootstrap, prelocal] = await Promise.all([
      source("server/tools/texture-alpha-runtime.ts"),
      source("server/runtime/bootstrap.ts"),
      source("server/tools/prelocal-wiring.ts"),
    ]);

    expect(focusedGetTextureParameters.parse({ render_profile: "translucent" }).render_profile).toBe("translucent");
    expect(focusedGetTextureParameters.parse({ minecraft_material_code: "entity_emissive" }).minecraft_material_code).toBe("entity_emissive");
    expect(runtime).toContain('runtimeDefinition("get_texture")');
    expect(runtime).toContain("if (!intent) return result");
    expect(runtime).toContain("region_only: true");
    expect(runtime).not.toContain("createTool(");
    expect(bootstrap).toContain("wireTextureAlphaRuntime();");
    expect(prelocal).toContain("focusedGetTextureParameters.shape");
  });

  test("alpha wrapper rejects ambiguous/custom profile shorthand instead of guessing", async () => {
    const runtime = await source("server/tools/texture-alpha-runtime.ts");
    expect(runtime).toContain("render_profile or minecraft_material_code, not both");
    expect(runtime).toContain("Custom render evidence requires minecraft_material_code");
    expect(runtime).toContain("render_alpha");
  });

  test("render-profile file bind uses a staged paired transaction with rollback", async () => {
    const tool = await source("server/tools/render-profile.ts");
    expect(tool).toContain("writeRenderResourceBatchAtomic");
    expect(tool).toContain("Stage and verify every output before any target file is moved");
    expect(tool).toContain("Preserve every existing target before committing the first replacement");
    expect(tool).toContain("rollbackStagedWrites");
    expect(tool).toContain('state: writes.length > 1 ? "paired_atomic"');
    expect(tool).toContain("result.binding.changed.client_entity_slot");
    expect(tool).toContain("result.binding.changed.render_controller_assignment");
  });
});
