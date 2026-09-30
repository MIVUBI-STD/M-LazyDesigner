import { describe, expect, test } from "bun:test";
import {
  isMaterialMutationReceipt,
  materialMutationReceipt,
} from "@/lib/receipts/materialMutation";

const validMaterial = {
  name: "metal",
  uuid: "material-a",
  is_material: true,
  channels: {
    color: { name: "base.png", uuid: "texture-a" },
    normal: null,
    height: null,
    mer: null,
  },
  config: {
    color_value: [255, 255, 255, 255],
    mer_value: [0, 0, 255],
    subsurface_value: 0,
    saved: false,
  },
};

describe("shared material mutation receipt contract", () => {
  test("accepts final continuation state for every material mutation operation", () => {
    for (const operation of [
      "create",
      "configure",
      "assign_channel",
      "import_texture_set",
    ] as const) {
      expect(
        isMaterialMutationReceipt({
          operation,
          ...(operation === "import_texture_set"
            ? { source_path: "/tmp/demo.texture_set.json" }
            : {}),
          material: validMaterial,
        })
      ).toBe(true);
    }
  });

  test("rejects incomplete identities and malformed final config", () => {
    expect(
      isMaterialMutationReceipt({
        operation: "configure",
        material: {
          ...validMaterial,
          channels: {
            ...validMaterial.channels,
            color: { name: "base.png", uuid: "" },
          },
        },
      })
    ).toBe(false);

    expect(
      isMaterialMutationReceipt({
        operation: "configure",
        material: {
          ...validMaterial,
          config: {
            ...validMaterial.config,
            color_value: [255, 255, 255],
          },
        },
      })
    ).toBe(false);
  });

  test("producer helper validates the same contract used by Control", () => {
    const receipt = materialMutationReceipt({
      operation: "create",
      material: validMaterial,
    });

    expect(receipt.material.uuid).toBe("material-a");
    expect(isMaterialMutationReceipt(receipt)).toBe(true);
  });

  test("Runtime material producer uses the shared receipt owner", async () => {
    const source = await Bun.file("server/tools/texture/materials.ts").text();
    expect(source).toContain(
      'from "@/lib/receipts/materialMutation"'
    );
    expect(
      source.match(/structuredContent: materialMutationReceipt\(/g)?.length ?? 0
    ).toBe(4);
  });
});