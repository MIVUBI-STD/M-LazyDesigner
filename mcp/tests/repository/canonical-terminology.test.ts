import { describe, expect, test } from "bun:test";

describe("canonical architecture terminology", () => {
  test("Authoring Stage is the internal owner and phase is compatibility-only", async () => {
    expect(await Bun.file("lib/capabilities/authoringPhase.ts").text()).toBe(
      'export * from "./authoringStage";\n'
    );

    const stage = await Bun.file("lib/capabilities/authoringStage.ts").text();
    expect(stage).toContain("MCP_AUTHORING_STAGES");
    expect(stage).toContain("McpAuthoringStage");
    expect(stage).toContain("getActiveMcpAuthoringStage");
    expect(stage).toContain("Compatibility aliases");
  });

  test("capability classification metadata uses stage, not an internal phase field", async () => {
    const manifest = await Bun.file("lib/capabilities/manifest.ts").text();
    expect(manifest).toContain("stage?: McpToolStageCategory");
    expect(manifest).toContain("capabilityStageByName");
    expect(manifest).not.toContain("phase?: McpTool");
  });

  test("canonical vocabulary remains the single terminology owner", async () => {
    const vocabulary = await Bun.file("../docs/04-system/canonical-vocabulary.md").text();
    expect(vocabulary).toContain("one concept → one canonical term");
    expect(vocabulary).toContain("**Stage**");
    expect(vocabulary).toContain("**Runtime Surface**");
    expect(vocabulary).toContain("**Capability**");
    expect(vocabulary).toContain("**Tool**");
    expect(vocabulary).toContain("**Registration Profile**");
  });
});
