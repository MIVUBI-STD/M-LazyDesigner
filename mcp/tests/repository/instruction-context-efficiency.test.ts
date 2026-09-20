import { describe, expect, test } from "bun:test";

async function text(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("repository instruction/context efficiency", () => {
  test("persistent repository instruction files stay bounded without losing core safety semantics", async () => {
    const [root, mcp] = await Promise.all([
      text("../AGENTS.md"),
      text("AGENTS.md"),
    ]);

    expect(root.length).toBeLessThan(9_500);
    expect(mcp.length).toBeLessThan(9_000);

    for (const invariant of [
      "Capability/intelligence loss is forbidden as an efficiency technique",
      "structuredContent",
      "Cost to Accepted Result",
      "persistent Gateway",
      "not auto-retried",
      "Tests are evidence",
    ]) {
      expect(mcp).toContain(invariant);
    }
  });

  test("prompt-cache contract keeps common prefix, stage extension, dynamic tail and compaction distinct", async () => {
    const contract = await text("../docs/04-system/prompt-cache-and-compaction.md");

    for (const invariant of [
      "CROSS-STAGE COMMON PREFIX CANDIDATE",
      "STAGE-STABLE EXTENSION",
      "DYNAMIC TAIL",
      "measure:model-context",
      "continuationCheckpoint.ts",
      "response | compaction",
      "map:development",
      "benchmark:zero-waste-total",
      "Never sum static-prefix bytes and dynamic bytes",
    ]) {
      expect(contract).toContain(invariant);
    }
    expect(contract).toContain("does not own arbitrary Codex/chat history");
    expect(contract).toContain("Quality PASS");
  });

  test("static instruction owners stay on Repository Verify rather than forcing executable MCP CI", async () => {
    const [repositoryWorkflow, mcpWorkflow] = await Promise.all([
      text("../.github/workflows/repository-verify.yml"),
      text("../.github/workflows/mcp-verify.yml"),
    ]);

    expect(repositoryWorkflow).toContain('"AGENTS.md"');
    expect(repositoryWorkflow).toContain('"mcp/AGENTS.md"');
    expect(repositoryWorkflow).toContain('"docs/**"');
    expect(mcpWorkflow).toContain('"!mcp/AGENTS.md"');
    expect(mcpWorkflow).not.toContain('"AGENTS.md"');
    expect(mcpWorkflow).not.toContain('"docs/04-system/prompt-cache-and-compaction.md"');
  });
});
