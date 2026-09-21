import { describe, expect, test } from "bun:test";
import { toolManifest } from "../build/docs-manifest";
import { manifestEntriesForCapability } from "../gateway/capabilities/manifest";

describe("branch schema and semantic manifest consistency", () => {
  test("first-class runtime branches have matching semantic branch identities", () => {
    const tools = toolManifest.flatMap((group) => group.tools);

    for (const tool of tools) {
      if (!tool.branches) continue;

      const manifest = manifestEntriesForCapability(tool.name);
      const expectedValues = Object.keys(tool.branches.schemas).sort();
      const actualValues = manifest
        .filter(
          (entry) =>
            entry.branch?.field === tool.branches!.discriminator
        )
        .map((entry) => entry.branch!.value)
        .sort();

      for (const value of expectedValues) {
        expect(
          manifest.some(
            (entry) =>
              entry.branch?.field === tool.branches!.discriminator &&
              entry.branch.value === value
          ),
          `${tool.name} branch ${tool.branches.discriminator}=${value}`
        ).toBe(true);
      }

      expect(actualValues).toEqual(expectedValues);
    }
  });
});
