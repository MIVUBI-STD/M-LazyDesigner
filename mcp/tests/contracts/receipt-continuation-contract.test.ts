import { describe, expect, test } from "bun:test";
import { CAPABILITY_CORE_MANIFEST } from "@/lib/capabilities/manifest";
import {
  CONTINUATION_RECEIPT_CAPABILITIES,
  receiptSupportsContinuation,
  resultCandidates,
  cubeStateNeutral,
} from "@/gateway/control/delta/receipts";

describe("continuation receipt registry", () => {
  test("MCP wrapper has one authoritative structuredContent candidate", () => {
    const contradictory = {
      execution: "unchanged",
      structuredContent: { execution: "applied", name: "new-model" },
    };
    expect(resultCandidates(contradictory)).toEqual([
      { execution: "applied", name: "new-model" },
    ]);
    expect(cubeStateNeutral(contradictory)).toBe(false);
    expect(resultCandidates({
      execution: "applied",
      structuredContent: { execution: "unchanged" },
    })).toEqual([{ execution: "unchanged" }]);
    expect(cubeStateNeutral({
      execution: "applied", structuredContent: { execution: "unchanged", updates: [] },
    })).toBe(true);
    expect(resultCandidates({ execution: "unchanged", structuredContent: null }))
      .toEqual([]);
    expect(cubeStateNeutral({ execution: "unchanged", structuredContent: null }))
      .toBe(false);
    expect(resultCandidates({ execution: "unchanged" }))
      .toEqual([{ execution: "unchanged" }]);
  });

  test("registry capabilities are canonical and verification-relevant", () => {
    expect(CONTINUATION_RECEIPT_CAPABILITIES.length).toBeGreaterThan(0);

    for (const capability of CONTINUATION_RECEIPT_CAPABILITIES) {
      const entry = CAPABILITY_CORE_MANIFEST.get(capability);
      expect(entry, capability).toBeDefined();
      expect(entry?.stage, capability).toBeDefined();
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