import { describe, expect, test } from "bun:test";

describe("canonical terminology", () => {
  test("capability manifest uses stage metadata internally", async () => {
    const source = await Bun.file("lib/capabilities/manifest.ts").text();
    expect(source).toContain("stage?: McpToolStageCategory");
    expect(source).toContain("capabilityStageByName");
    expect(source).not.toMatch(/\bphase\?:\s*McpTool/);
  });

  test("authoring Phase owner is compatibility-only", async () => {
    expect(await Bun.file("lib/capabilities/authoringPhase.ts").text()).toBe(
      'export * from "./authoringStage";\n'
    );
  });
});
