export const ENTITY_RENDER_PROFILE_NAMES = [
  "opaque",
  "opaque_nocull",
  "cutout",
  "translucent",
  "color_mask",
  "emissive_mask",
  "emissive_translucent",
  "emissive_translucent_one_sided",
  "emissive_layer",
  "glint",
  "cutout_glint",
  "custom",
] as const;

export type EntityRenderProfile = (typeof ENTITY_RENDER_PROFILE_NAMES)[number];

export type EntityAlphaSemantics =
  | "unused"
  | "cutout_opacity"
  | "blended_opacity"
  | "color_mask"
  | "emissive_mask"
  | "emissive_and_translucent"
  | "layered_emissive"
  | "unknown_custom";

export type EntityRenderTextureFormat =
  | "standard"
  | "tga_required"
  | "layered_png_required"
  | "unknown_custom";

export type EntityRenderCulling =
  | "material_defined"
  | "disabled"
  | "enabled"
  | "unknown_custom";

export type EntityRenderProfileContract = {
  domain: "minecraft_entity_render_material";
  render_profile: EntityRenderProfile;
  minecraft_material_code: string;
  vanilla: boolean;
  alpha_semantics: EntityAlphaSemantics;
  texture_format: EntityRenderTextureFormat;
  culling: EntityRenderCulling;
  verification: "known_vanilla" | "unverified_custom";
};

type KnownRenderProfileContract = Omit<
  EntityRenderProfileContract,
  "domain" | "minecraft_material_code" | "vanilla" | "verification"
>;

const KNOWN_ENTITY_RENDER_MATERIALS: Record<string, KnownRenderProfileContract> = {
  entity: {
    render_profile: "opaque",
    alpha_semantics: "unused",
    texture_format: "standard",
    culling: "material_defined",
  },
  entity_nocull: {
    render_profile: "opaque_nocull",
    alpha_semantics: "unused",
    texture_format: "standard",
    culling: "disabled",
  },
  entity_alphatest: {
    render_profile: "cutout",
    alpha_semantics: "cutout_opacity",
    texture_format: "standard",
    culling: "material_defined",
  },
  entity_alphablend: {
    render_profile: "translucent",
    alpha_semantics: "blended_opacity",
    texture_format: "standard",
    culling: "material_defined",
  },
  entity_change_color: {
    render_profile: "color_mask",
    alpha_semantics: "color_mask",
    texture_format: "standard",
    culling: "disabled",
  },
  entity_emissive: {
    render_profile: "emissive_mask",
    alpha_semantics: "emissive_mask",
    texture_format: "tga_required",
    culling: "material_defined",
  },
  entity_emissive_alpha: {
    render_profile: "emissive_translucent",
    alpha_semantics: "emissive_and_translucent",
    texture_format: "tga_required",
    culling: "disabled",
  },
  entity_emissive_alpha_one_sided: {
    render_profile: "emissive_translucent_one_sided",
    alpha_semantics: "emissive_and_translucent",
    texture_format: "tga_required",
    culling: "enabled",
  },
  entity_emissive_layer: {
    render_profile: "emissive_layer",
    alpha_semantics: "layered_emissive",
    texture_format: "layered_png_required",
    culling: "material_defined",
  },
  entity_glint: {
    render_profile: "glint",
    alpha_semantics: "unused",
    texture_format: "standard",
    culling: "material_defined",
  },
  entity_alphatest_glint: {
    render_profile: "cutout_glint",
    alpha_semantics: "cutout_opacity",
    texture_format: "standard",
    culling: "material_defined",
  },
};

const PROFILE_TO_MATERIAL = new Map<EntityRenderProfile, string>(
  Object.entries(KNOWN_ENTITY_RENDER_MATERIALS).map(([code, contract]) => [
    contract.render_profile,
    code,
  ])
);

export const VANILLA_ENTITY_RENDER_MATERIAL_CODES = Object.freeze(
  Object.keys(KNOWN_ENTITY_RENDER_MATERIALS)
);

export function inspectEntityRenderMaterialCode(
  materialCode: string
): EntityRenderProfileContract {
  const code = materialCode.trim();
  if (!code) {
    throw new Error("Minecraft entity material code must be non-empty.");
  }

  const known = KNOWN_ENTITY_RENDER_MATERIALS[code];
  if (known) {
    return {
      domain: "minecraft_entity_render_material",
      ...known,
      minecraft_material_code: code,
      vanilla: true,
      verification: "known_vanilla",
    };
  }

  return {
    domain: "minecraft_entity_render_material",
    render_profile: "custom",
    minecraft_material_code: code,
    vanilla: false,
    alpha_semantics: "unknown_custom",
    texture_format: "unknown_custom",
    culling: "unknown_custom",
    verification: "unverified_custom",
  };
}

export function minecraftMaterialCodeForRenderProfile(
  profile: EntityRenderProfile,
  customMaterialCode?: string
): string {
  if (profile === "custom") {
    const code = customMaterialCode?.trim() ?? "";
    if (!code) {
      throw new Error(
        "Custom render_profile requires an explicit minecraft_material_code."
      );
    }
    return code;
  }

  const code = PROFILE_TO_MATERIAL.get(profile);
  if (!code) {
    throw new Error(`No Vanilla entity material code is mapped to ${profile}.`);
  }
  return code;
}
