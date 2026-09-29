import {
  inspectEntityRenderMaterialCode,
  minecraftMaterialCodeForRenderProfile,
  type EntityRenderProfile,
  type EntityRenderProfileContract,
} from "./renderProfile";

export type TextureAlphaEvidence = {
  pixels: Uint8ClampedArray;
  render_profile?: EntityRenderProfile;
  minecraft_material_code?: string;
};

function resolveContract(input: TextureAlphaEvidence): EntityRenderProfileContract {
  if (input.minecraft_material_code) {
    return inspectEntityRenderMaterialCode(input.minecraft_material_code);
  }
  if (!input.render_profile) {
    throw new Error(
      "Render-aware alpha analysis requires render_profile or minecraft_material_code."
    );
  }
  return inspectEntityRenderMaterialCode(
    minecraftMaterialCodeForRenderProfile(input.render_profile)
  );
}

function ratio(value: number, total: number): number {
  return total === 0 ? 0 : Number((value / total).toFixed(4));
}

export function analyzeRenderAwareAlpha(input: TextureAlphaEvidence) {
  if (input.pixels.length % 4 !== 0) {
    throw new Error("RGBA evidence length must be divisible by four.");
  }
  const contract = resolveContract(input);
  const total = input.pixels.length / 4;
  let transparent = 0;
  let intermediate = 0;
  let opaque = 0;
  for (let offset = 3; offset < input.pixels.length; offset += 4) {
    const alpha = input.pixels[offset];
    if (alpha === 0) transparent += 1;
    else if (alpha === 255) opaque += 1;
    else intermediate += 1;
  }

  const reasons: string[] = [];
  let state: "ready" | "review_required" | "unverified" = "ready";
  let interpretation = "alpha_semantics_defined_by_render_profile";

  switch (contract.alpha_semantics) {
    case "unused":
      interpretation = "alpha_not_expected_to_control_rendering";
      if (transparent + intermediate > 0) {
        reasons.push("UNUSED_ALPHA_NONOPAQUE_REVIEW");
        state = "review_required";
      }
      break;
    case "cutout_opacity":
      interpretation = "alpha_controls_cutout_opacity";
      if (intermediate > 0) {
        reasons.push("CUTOUT_INTERMEDIATE_ALPHA_REVIEW");
        state = "review_required";
      }
      break;
    case "blended_opacity":
      interpretation = "alpha_controls_blended_opacity";
      break;
    case "color_mask":
      interpretation = "alpha_is_color_mask_not_opacity";
      break;
    case "emissive_mask":
      interpretation = "alpha_is_emissive_intensity_not_opacity";
      break;
    case "emissive_and_translucent":
      interpretation = "alpha_participates_in_emissive_and_translucent_rendering";
      break;
    case "layered_emissive":
      interpretation = "emissive_behavior_comes_from_layered_png_not_flat_alpha_inference";
      break;
    default:
      interpretation = "custom_material_alpha_semantics_unknown";
      reasons.push("CUSTOM_ALPHA_SEMANTICS_UNVERIFIED");
      state = "unverified";
      break;
  }

  return {
    domain: "minecraft_entity_render_material" as const,
    render_profile: contract.render_profile,
    minecraft_material_code: contract.minecraft_material_code,
    alpha_semantics: contract.alpha_semantics,
    texture_format: contract.texture_format,
    state,
    reasons,
    interpretation,
    alpha_distribution: {
      transparent_ratio: ratio(transparent, total),
      intermediate_ratio: ratio(intermediate, total),
      opaque_ratio: ratio(opaque, total),
    },
    note:
      "Alpha evidence is interpreted only through the bound Minecraft render profile; intermediate alpha is not inherently transparency or an error.",
  };
}
