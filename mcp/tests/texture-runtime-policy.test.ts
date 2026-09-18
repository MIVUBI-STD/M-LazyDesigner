import { describe, expect, test } from "bun:test";
import {
  bedrockGeometryIdentifierInputSchema,
  resolveBedrockProjectModelIdentifier,
} from "@/lib/bedrockProjectIdentity";
import {
  PAINT_TEXTURE_TRANSACTION_TOOL_NAME,
  requirePaintTransactionV1Target,
} from "@/lib/paintTransactionPolicy";
import { buildTextureEvidenceSnapshot } from "@/lib/textureEvidence";
import { buildTextureEvidenceDeliveryMetadata } from "@/lib/textureEvidenceDelivery";
import { planBedrockGeometryWrite } from "@/lib/bedrockExportIntegrity";
import { requireDirectBedrockGeometryWriteV1 } from "@/lib/bedrockExportWritePolicy";

describe("texture runtime wiring policy", () => {
  test("new Bedrock projects own deterministic native geometry identifiers", () => {
    expect(resolveBedrockProjectModelIdentifier("Small Cannon Boat")).toBe(
      "geometry.small_cannon_boat"
    );
    expect(resolveBedrockProjectModelIdentifier("ignored", "custom.boat")).toBe(
      "geometry.custom.boat"
    );
    expect(resolveBedrockProjectModelIdentifier("ignored", "Geometry.Custom_Boat")).toBe(
      "geometry.Custom_Boat"
    );
    expect(
      bedrockGeometryIdentifierInputSchema.safeParse("geometry.valid_model").success
    ).toBe(true);
    expect(
      bedrockGeometryIdentifierInputSchema.safeParse("geometry.bad-model").success
    ).toBe(false);
    expect(() => resolveBedrockProjectModelIdentifier("🚗🚗")).toThrow(
      "explicit model_identifier"
    );
  });

  test("exact paint transaction v1 has one domain-specific name and fails closed on layered textures", () => {
    expect(PAINT_TEXTURE_TRANSACTION_TOOL_NAME).toBe("paint_texture_transaction");
    expect(
      requirePaintTransactionV1Target({
        texture_uuid: "base-uuid",
        texture_name: "base",
        layers_enabled: false,
      }).texture_uuid
    ).toBe("base-uuid");
    expect(() =>
      requirePaintTransactionV1Target({
        texture_uuid: "layered-uuid",
        texture_name: "layered",
        layers_enabled: true,
      })
    ).toThrow("native Painter tools");
  });

  test("focused texture delivery keeps PNG image payload separate from compact metadata", async () => {
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      255, 255, 255, 255,
    ]);
    const snapshot = await buildTextureEvidenceSnapshot(pixels, 2, 2, {
      region: { x: 1, y: 0, width: 1, height: 2 },
    });
    const metadata = buildTextureEvidenceDeliveryMetadata({
      inspection: snapshot.inspection,
      revision: snapshot.revision,
      bitmap: snapshot.bitmap,
      region: snapshot.region,
      source_byte_length: snapshot.byte_length,
      uv_width: 128,
      uv_height: 128,
    });

    expect(metadata.logical_uv).toEqual([64, 0, 128, 128]);
    expect(metadata.image).toMatchObject({
      delivery: "content.image",
      mime_type: "image/png",
      width: 1,
      height: 2,
    });
    expect("rgba" in metadata).toBe(false);
    expect(JSON.stringify(metadata)).not.toContain("rgba");
  });

  test("Bedrock geometry v1 writes only new or explicitly owned single-geometry files", () => {
    expect(
      requireDirectBedrockGeometryWriteV1(
        planBedrockGeometryWrite({
          destination_exists: false,
          overwrite_requested: false,
          expected_identifier: "geometry.fixture",
        })
      ).action
    ).toBe("CREATE_NEW");

    const single = {
      "minecraft:geometry": [
        { description: { identifier: "geometry.fixture" }, bones: [] },
      ],
    };
    expect(
      requireDirectBedrockGeometryWriteV1(
        planBedrockGeometryWrite({
          destination_exists: true,
          overwrite_requested: true,
          existing_document: single,
          expected_identifier: "geometry.fixture",
        })
      ).action
    ).toBe("REPLACE_SINGLE");

    const multi = {
      "minecraft:geometry": [
        { description: { identifier: "geometry.fixture" }, bones: [] },
        { description: { identifier: "geometry.other" }, bones: [] },
      ],
    };
    expect(() =>
      requireDirectBedrockGeometryWriteV1(
        planBedrockGeometryWrite({
          destination_exists: true,
          overwrite_requested: true,
          existing_document: multi,
          expected_identifier: "geometry.fixture",
        })
      )
    ).toThrow("refuses direct writes to multi-geometry files");
  });
});
