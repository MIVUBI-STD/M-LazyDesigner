import { describe, expect, test } from "bun:test";

describe("MCP CI semantic snapshot planning", () => {
  test("affected CI compares the previous semantic registry when available", async () => {
    const workflow = await Bun.file("../.github/workflows/mcp-verify.yml").text();

    expect(workflow).toContain("git worktree add --detach");
    expect(workflow).toContain("snapshot-semantic-registry.ts");
    expect(workflow).toContain("--previous-semantic-snapshot");
    expect(workflow).toContain(
      "path-based planner remains authoritative"
    );
  });
});
