import { describe, expect, test } from "bun:test";
import { sourceOwnerForCapability } from "@/gateway/control";

const expectedOwners = {
  inspect_elements: "mcp/server/runtime/consolidatedTools.ts",
  manage_material: "mcp/server/runtime/consolidatedTools.ts",
  manage_material_instances: "mcp/server/runtime/consolidatedTools.ts",
  manage_animation_timeline: "mcp/server/runtime/consolidatedTools.ts",
  switch_authoring_phase: "mcp/server/runtime/phaseControl.ts",
} as const;

describe("Control canonical public source ownership", () => {
  test("public consolidated and phase capabilities route development to their actual public owner", async () => {
    for (const [capability, source] of Object.entries(expectedOwners)) {
      const owner = sourceOwnerForCapability(capability);
      expect(owner.source, capability).toBe(source);
      expect(
        await Bun.file(new URL(`../../${owner.source}`, import.meta.url)).exists(),
        owner.source
      ).toBe(true);
      if (owner.anchor_test) {
        expect(
          await Bun.file(new URL(`../../${owner.anchor_test}`, import.meta.url)).exists(),
          owner.anchor_test
        ).toBe(true);
      }
    }
  });
});
