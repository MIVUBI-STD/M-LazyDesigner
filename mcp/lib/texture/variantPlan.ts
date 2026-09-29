import { z } from "zod";
import { textureIdSchema } from "@/lib/zodObjects";

/**
 * Public variant-creation contract used by the runtime create_texture adapter.
 * The legacy blank/template schema remains authoritative for existing creation
 * modes while this strict branch owns type=variant requests.
 */
export const createTextureVariantParameters = z
  .object({
    type: z.literal("variant"),
    name: z.string().min(1).describe("Non-empty variant texture name."),
    source_texture_id: textureIdSchema
      .min(1)
      .describe("Established base-color atlas UUID/ID/unique exact name to duplicate."),
    group: z
      .string()
      .min(1)
      .describe("Explicit non-material TextureGroup UUID or unique exact name for the variant."),
  })
  .strict();

export type TextureVariantSource = {
  uuid: string;
  name: string;
  width: number;
  height: number;
  role: "base_color_candidate" | "explicit_variant" | "pbr_support";
};

export type TextureVariantGroup = {
  uuid: string;
  name: string;
  is_material: boolean;
};

export type TextureVariantPlanInput = {
  source: TextureVariantSource;
  base_color_candidates: readonly TextureVariantSource[];
  target_group: TextureVariantGroup;
  requested_name: string;
  existing_texture_names: readonly string[];
};

function requirePositiveBitmapDimension(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive safe integer.`);
  }
}

/**
 * Pure preflight for public variant-from-base creation. The plan keeps one
 * established base atlas authoritative and requires an explicit non-material
 * group for the variant, matching the production-role semantics.
 */
export function planTextureVariantFromBase(input: TextureVariantPlanInput) {
  const requestedName = input.requested_name.trim();
  if (!requestedName) {
    throw new Error("Texture variant requires a non-empty requested name.");
  }
  if (input.existing_texture_names.includes(requestedName)) {
    throw new Error(
      `Texture name "${requestedName}" already exists; variant creation must remain deterministic.`
    );
  }

  requirePositiveBitmapDimension(input.source.width, "Variant source width");
  requirePositiveBitmapDimension(input.source.height, "Variant source height");

  if (input.source.role !== "base_color_candidate") {
    throw new Error(
      `Variant source "${input.source.name}" (${input.source.uuid}) is not the base-color atlas.`
    );
  }
  if (
    input.base_color_candidates.length !== 1 ||
    input.base_color_candidates[0]?.uuid !== input.source.uuid
  ) {
    throw new Error(
      `Variant-from-base requires exactly one established base-color atlas matching the source; found ${input.base_color_candidates.length}.`
    );
  }
  if (input.target_group.is_material) {
    throw new Error(
      `Variant target group "${input.target_group.name}" must be a non-material TextureGroup so the production base role is preserved.`
    );
  }

  return {
    source_texture_uuid: input.source.uuid,
    source_texture_name: input.source.name,
    requested_name: requestedName,
    target_group_uuid: input.target_group.uuid,
    target_group_name: input.target_group.name,
    bitmap: {
      width: input.source.width,
      height: input.source.height,
    },
    resulting_role: "explicit_variant" as const,
    preserves_base_role: true as const,
    mapping_contract: "same_bitmap_dimensions_and_existing_uv_mapping" as const,
  };
}
