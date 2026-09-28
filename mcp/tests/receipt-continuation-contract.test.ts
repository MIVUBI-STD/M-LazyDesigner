import { describe, expect, test } from "bun:test";
import { CAPABILITY_CORE_MANIFEST } from "@/lib/capabilities/manifest";
import {
  CONTINUATION_RECEIPT_CAPABILITIES,
  receiptSupportsContinuation,
} from "@/gateway/control/delta/receipts";

describe("continuation receipt registry", () => {
  test("registry capabilities are canonical and verification-relevant", () => {
    expect(CONTINUATION_RECEIPT_CAPABILITIES.length).toBeGreaterThan(0);

    for (const capability of CONTINUATION_RECEIPT_CAPABILITIES) {
      const entry = CAPABILITY_CORE_MANIFEST.get(capability);
      expect(entry, capability).toBeDefined();
      expect(entry?.phase, capability).toBeDefined();
      expect(entry?.verificationClass, capability).not.toBe("not_applicable");
    }
  });

  test("unknown capabilities fail closed instead of inheriting a receipt validator", () => {
    expect(
      receiptSupportsContinuation("future_unknown_tool", {
        execution: "applied",
      })
    ).toBe(false);
  });

  test("representative shared contracts are discoverable through one registry", () => {
    expect(CONTINUATION_RECEIPT_CAPABILITIES).toEqual(
      expect.arrayContaining([
        "create_project",
        "manage_material",
        "manage_animation_controller",
        "manage_particle",
        "manage_render_profile",
        "remove_element",
        "bone_rigging",
      ])
    );
  });

  test("registry declaration replaces capability switch routing", async () => {
    const source = await Bun.file("gateway/control/delta/receipts.ts").text();
    const receiptSection = source.slice(
      source.indexOf("const CONTINUATION_RECEIPT_VALIDATORS")
    );

    expect(receiptSection).not.toContain("switch (capability)");
    expect(receiptSection).toContain(
      "CONTINUATION_RECEIPT_VALIDATORS[capability]"
    );
  });
});
