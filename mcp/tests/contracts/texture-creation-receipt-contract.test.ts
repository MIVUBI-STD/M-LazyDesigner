import { describe, expect, test } from "bun:test";
import {
  isTextureCreationReceipt,
  textureCreationReceiptSchema,
} from "@/lib/receipts/textureCreation";

describe("create_texture native identity receipt", () => {
  const observed = {
    texture: {
      uuid: "texture-a",
      name: "base.png",
      bitmap: { width: 64, height: 64, display_height: 64 },
      logical_uv: { width: 64, height: 64 },
    },
  };

  test("accepts blank/template producer's texture inventory shape", () => {
    expect(isTextureCreationReceipt(observed)).toBe(true);
    expect(textureCreationReceiptSchema.parse(observed).texture.uuid)
      .toBe("texture-a");
  });

  test("rejects a success label, absent native identity or unreadable bitmap", () => {
    for (const value of [
      undefined,
      { status: "success" },
      { texture: { name: "base.png", bitmap: { width: 64, height: 64 } } },
      { texture: { uuid: "texture-a", name: "", bitmap: { width: 64, height: 64 } } },
      { texture: { uuid: "texture-a", name: "base.png" } },
      { texture: { uuid: "texture-a", name: "base.png", bitmap: { width: 0, height: 64 } } },
      { texture: { uuid: "texture-a", name: "base.png", bitmap: { width: Infinity, height: 64 } } },
    ]) {
      expect(isTextureCreationReceipt(value)).toBe(false);
    }
  });

  test("native blank and template paths both report textureInventoryEntry", async () => {
    const producer = await Bun.file("server/tools/texture/create.ts").text();
    expect(producer).toContain("textureInventoryEntry(templateTexture)");
    expect(producer).toContain("textureInventoryEntry(texture)");
  });
});
