import { describe, expect, test } from "bun:test";
import {
  analyzeTextureProductionAlignment,
  type TextureProductionAlignmentInput,
} from "@/lib/textureProductionAlignment";

function texture(
  overrides: Partial<TextureProductionAlignmentInput> = {}
): TextureProductionAlignmentInput {
  return {
    uuid: "base",
    name: "base",
    role: "base_color_candidate",
    pbr_channel: "color",
    group_uuid: null,
    group_name: null,
    group_is_material: null,
    bitmap_width: 128,
    bitmap_height: 128,
    logical_uv_width: 128,
    logical_uv_height: 128,
    ...overrides,
  };
}

describe("texture production alignment", () => {
  test("base-only classic texture needs no dependent-alignment gate", () => {
    const result = analyzeTextureProductionAlignment([texture()]);
    expect(result.gate.state).toBe("not_applicable");
    expect(result.gate.reasons).toEqual([]);
    expect(result.efficiency).toEqual({
      metadata_only: true,
      extra_pixel_scan: false,
    });
  });

  test("aligned variants and PBR support are ready without another pixel scan", () => {
    const result = analyzeTextureProductionAlignment([
      texture(),
      texture({
        uuid: "variant",
        name: "variant",
        role: "explicit_variant",
        group_uuid: "variants",
        group_name: "Variants",
        group_is_material: false,
      }),
      texture({
        uuid: "normal",
        name: "normal",
        role: "pbr_support",
        pbr_channel: "normal",
        group_uuid: "mat",
        group_name: "Material",
        group_is_material: true,
      }),
      texture({
        uuid: "mer",
        name: "mer",
        role: "pbr_support",
        pbr_channel: "mer",
        group_uuid: "mat",
        group_name: "Material",
        group_is_material: true,
      }),
    ]);
    expect(result.gate.state).toBe("ready");
    expect(result.variants.mismatch_count).toBe(0);
    expect(result.pbr.alignment_mismatch_count).toBe(0);
    expect(result.pbr.channel_conflict_count).toBe(0);
  });

  test("variant and active PBR dimensions must preserve base mapping", () => {
    const result = analyzeTextureProductionAlignment([
      texture(),
      texture({
        uuid: "variant",
        name: "variant",
        role: "explicit_variant",
        bitmap_width: 256,
        bitmap_height: 256,
        group_uuid: "variants",
        group_name: "Variants",
        group_is_material: false,
      }),
      texture({
        uuid: "normal",
        name: "normal",
        role: "pbr_support",
        pbr_channel: "normal",
        logical_uv_width: 64,
        logical_uv_height: 64,
        group_uuid: "mat",
        group_name: "Material",
        group_is_material: true,
      }),
    ]);
    expect(result.gate.state).toBe("review_required");
    expect(result.gate.reasons).toEqual(
      expect.arrayContaining([
        "VARIANT_ALIGNMENT_MISMATCH",
        "PBR_ALIGNMENT_MISMATCH",
      ])
    );
    expect(result.variants.examples[0].differences).toContain(
      "bitmap_dimensions"
    );
    expect(result.pbr.alignment_examples[0].differences).toContain(
      "logical_uv_dimensions"
    );
  });

  test("material channel conflicts and invalid support grouping are explicit", () => {
    const result = analyzeTextureProductionAlignment([
      texture({
        group_uuid: "mat",
        group_name: "Material",
        group_is_material: true,
      }),
      texture({
        uuid: "normal-a",
        name: "normal-a",
        role: "pbr_support",
        pbr_channel: "normal",
        group_uuid: "mat",
        group_name: "Material",
        group_is_material: true,
      }),
      texture({
        uuid: "normal-b",
        name: "normal-b",
        role: "pbr_support",
        pbr_channel: "normal",
        group_uuid: "mat",
        group_name: "Material",
        group_is_material: true,
      }),
      texture({
        uuid: "height",
        name: "height",
        role: "pbr_support",
        pbr_channel: "height",
        group_uuid: "mat",
        group_name: "Material",
        group_is_material: true,
      }),
      texture({
        uuid: "bad-mer",
        name: "bad-mer",
        role: "pbr_support",
        pbr_channel: "mer",
        group_uuid: "variants",
        group_name: "Variants",
        group_is_material: false,
      }),
    ]);
    expect(result.gate.reasons).toEqual(
      expect.arrayContaining([
        "PBR_SUPPORT_GROUP_INVALID",
        "PBR_MATERIAL_CHANNEL_CONFLICT",
      ])
    );
    expect(result.pbr.channel_conflict_count).toBe(1);
    expect(result.pbr.conflict_examples[0]).toMatchObject({
      duplicate_channels: ["normal"],
      normal_height_conflict: true,
    });
  });

  test("detached replaced PBR support stays advisory instead of blocking current material", () => {
    const result = analyzeTextureProductionAlignment([
      texture(),
      texture({
        uuid: "old-normal",
        name: "old-normal",
        role: "pbr_support",
        pbr_channel: "normal",
        group_uuid: null,
        group_name: null,
        group_is_material: null,
      }),
      texture({
        uuid: "current-normal",
        name: "current-normal",
        role: "pbr_support",
        pbr_channel: "normal",
        group_uuid: "mat",
        group_name: "Material",
        group_is_material: true,
      }),
    ]);
    expect(result.gate.state).toBe("ready");
    expect(result.pbr.detached_support_count).toBe(1);
  });

  test("dependent textures cannot claim alignment without one resolved base atlas", () => {
    const result = analyzeTextureProductionAlignment([
      texture({
        uuid: "normal",
        name: "normal",
        role: "pbr_support",
        pbr_channel: "normal",
        group_uuid: "mat",
        group_name: "Material",
        group_is_material: true,
      }),
    ]);
    expect(result.gate.state).toBe("review_required");
    expect(result.gate.reasons).toContain(
      "DEPENDENT_BASE_ATLAS_UNRESOLVED"
    );
  });
});

describe("texture production alignment wiring", () => {
  test("runtime adds metadata alignment and exclusive manage_material without a new MCP tool", async () => {
    const [runtime, server, bootstrap] = await Promise.all([
      Bun.file("server/tools/texture-quality-runtime.ts").text(),
      Bun.file("server/server.ts").text(),
      Bun.file("server/runtime/extensions.ts").text(),
    ]);
    expect(runtime).toContain('runtimeDefinition("list_textures")');
    expect(runtime).toContain('runtimeDefinition("manage_material")');
    expect(runtime).toContain("production_alignment");
    expect(runtime).toContain("planPbrMaterialConfiguration");
    expect(runtime).toContain("planExclusivePbrMaterialAssignment");
    expect(runtime).toContain('color_texture="none"');
    expect(runtime).toContain('mer_texture="none"');
    expect(server).toContain("initializeRuntimeCapabilityWiring();");
    expect(bootstrap).toContain("apply: wireTextureQualityRuntime");
  });
});
