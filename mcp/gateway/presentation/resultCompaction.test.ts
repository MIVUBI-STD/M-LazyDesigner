import { describe, expect, test } from "bun:test";
import { compactGatewayCapabilityContent } from "./resultCompaction";

describe("Gateway result-compaction information preservation", () => {
  const warning = [
    { type: "text", text: "WARNING: UV seam is UNVERIFIED. Do not finalize." },
  ];

  test("receipt_only preserves warning, blocker and pending-save information", () => {
    for (const text of [
      warning[0].text,
      "BLOCKED: a required reference is missing.",
      "Artifact pending: not saved to a .bbmodel.",
    ]) {
      const content = [{ type: "text", text }];
      expect(compactGatewayCapabilityContent(
        "modify_group", { after: { uuid: "bone" } }, content, "receipt_only"
      )).toEqual(content);
    }
  });

  test("inspect_elements preserves warning text despite its summary shortcut", () => {
    expect(compactGatewayCapabilityContent(
      "inspect_elements", { uuid: "a", name: "arm", type: "group" },
      warning, "focused_read", true
    )).toEqual(warning);
  });

  test("manage_cubes preserves warnings and multi-item image evidence", () => {
    expect(compactGatewayCapabilityContent(
      "manage_cubes", { execution: "applied", modified: 1 },
      warning, "visual"
    )).toEqual(warning);
    const mixed = [
      { type: "text", text: "Applied." },
      { type: "image", data: "fixture", mimeType: "image/png" },
    ];
    expect(compactGatewayCapabilityContent(
      "manage_cubes", { execution: "applied", modified: 1 },
      mixed, "visual"
    )).toEqual(mixed);
  });

  test("normal successful result is still compact", () => {
    expect(compactGatewayCapabilityContent(
      "modify_group", { after: { uuid: "bone" } },
      [{ type: "text", text: "Updated bone." }], "receipt_only"
    )).toEqual([{ type: "text", text: "Receipt complete." }]);
    expect(compactGatewayCapabilityContent(
      "manage_cubes", { execution: "applied", modified: 1 },
      [{ type: "text", text: "Modified cube." }], "visual"
    )).toEqual([{ type: "text", text: "Cube mutation applied; use structured receipt." }]);
  });
});
