import { describe, expect, test } from "bun:test";
import {
  isMaterialPersistenceReceipt,
  materialPersistenceReceipt,
} from "@/lib/receipts/materialMutation";

describe("shared material persistence receipt contract", () => {
  test("accepts verified saved file state", () => {
    const receipt = materialPersistenceReceipt({
      operation: "save",
      scope: "material_persistence_only",
      material: { uuid: "material-a", name: "metal" },
      file_path: "/tmp/material.texture_set.json",
      saved: true,
      file_exists: true,
    });

    expect(isMaterialPersistenceReceipt(receipt)).toBe(true);
  });

  test("rejects unverified or incomplete persistence state", () => {
    expect(
      isMaterialPersistenceReceipt({
        operation: "save",
        scope: "material_persistence_only",
        material: { uuid: "material-a", name: "metal" },
        file_path: "/tmp/material.texture_set.json",
        saved: true,
        file_exists: false,
      })
    ).toBe(false);

    expect(
      isMaterialPersistenceReceipt({
        operation: "save",
        scope: "material_persistence_only",
      })
    ).toBe(false);
  });

  test("direct save producer and Control share the persistence receipt owner", async () => {
    const producer = await Bun.file("server/tools/texture/materials.ts").text();
    const control = await Bun.file("gateway/control/delta/receipts.ts").text();

    expect(producer).toContain("materialPersistenceReceipt({");
    expect(control).toContain("isMaterialPersistenceReceipt");
    expect(control).toContain(
      "save_material_config: materialPersistenceReceiptComplete"
    );
  });
});