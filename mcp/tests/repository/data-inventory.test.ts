import { describe, expect, test } from "bun:test";
import { buildDataInventory, classifyDataSourcePath, compatibilityAliasTarget } from "../../scripts/development/data-inventory";

describe("read-only data-source inventory", () => {
  test("separates authored sources from user assets", () => {
    expect(classifyDataSourcePath("docs/04-system/README.md")).toBe("DOCUMENT");
    expect(classifyDataSourcePath("docs/05-operations/next-action.md")).toBe("OPERATIONS");
    expect(classifyDataSourcePath(".agents/skills/lazydesigner-modelling/SKILL.md")).toBe("SKILL");
    expect(classifyDataSourcePath("mcp/tests/fixtures/golden-task-cases.json")).toBe("TEST_FIXTURE");
    expect(classifyDataSourcePath("workspace/active/lift/lift.bbmodel")).toBeNull();
  });
  test("recognizes only pure root compatibility wrappers", () => {
    expect(compatibilityAliasTarget("mcp/lib/assetDependencyGraph.ts",
      'export * from "./authoring/assetDependencyGraph";')).toBe("mcp/lib/authoring/assetDependencyGraph.ts");
    expect(compatibilityAliasTarget("mcp/lib/real.ts", "export const real = 1;")).toBeNull();
    expect(compatibilityAliasTarget("mcp/lib/nested/facade.ts", 'export * from "../real";')).toBeNull();
  });
  test("does not read workspace and detects dangling alias by tracked identity", async () => {
    const source: Record<string,string> = {
      "docs/04-system/README.md": "# Source\n",
      "mcp/lib/alias.ts": 'export * from "./domain/owner";',
    };
    const reads: string[] = [];
    const result = await buildDataInventory(
      ["workspace/active/asset.bbmodel", ...Object.keys(source)].reverse(),
      async path => { reads.push(path); return Buffer.from(source[path]!); },
    );
    expect(reads).toEqual(["docs/04-system/README.md", "mcp/lib/alias.ts"]);
    expect(result.tracked_workspace_file_count).toBe(1);
    expect(result.entries[0]!.sha256).toHaveLength(64);
    expect(result.unresolved_aliases).toEqual(["mcp/lib/alias.ts"]);
  });
  test("resolves valid alias without crawling implementation", async () => {
    const source: Record<string,string> = {
      "mcp/lib/alias.ts": 'export * from "./domain/owner";',
      "mcp/lib/domain/owner.ts": "export const owner = 1;",
    };
    const result = await buildDataInventory(Object.keys(source), async path => Buffer.from(source[path]!));
    expect(result.unresolved_aliases).toEqual([]);
    expect(result.entries).toHaveLength(1);
  });
});
