import {
  textureEvidenceRegionSchema,
  textureEvidenceRegionToLogicalUv,
  textureRevisionSchema,
} from "@/lib/texture/evidence";

export type TextureEvidenceDeliveryInput = {
  inspection: "full_atlas" | "region";
  revision: string;
  bitmap: { width: number; height: number };
  region: { x: number; y: number; width: number; height: number };
  source_byte_length: number;
  uv_width: number;
  uv_height: number;
};

/**
 * Machine-readable evidence metadata intentionally excludes raw RGBA. Runtime
 * wiring should encode only the requested crop as PNG and deliver it through one
 * MCP image content item while structuredContent carries this compact receipt.
 */
export function buildTextureEvidenceDeliveryMetadata(
  input: TextureEvidenceDeliveryInput
) {
  const revision = textureRevisionSchema.parse(input.revision);
  const region = textureEvidenceRegionSchema.parse(input.region);
  if (!Number.isSafeInteger(input.source_byte_length) || input.source_byte_length <= 0) {
    throw new Error("Texture evidence delivery requires a positive source byte length.");
  }

  const logicalUv = textureEvidenceRegionToLogicalUv(
    region,
    input.bitmap.width,
    input.bitmap.height,
    input.uv_width,
    input.uv_height
  );

  return {
    inspection: input.inspection,
    revision,
    bitmap: input.bitmap,
    region,
    logical_uv: logicalUv,
    image: {
      delivery: "content.image" as const,
      mime_type: "image/png" as const,
      width: region.width,
      height: region.height,
      source_byte_length: input.source_byte_length,
    },
  };
}
