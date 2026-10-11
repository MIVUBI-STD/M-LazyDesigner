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

  test("catches authored broken links without treating fenced code as navigation", async () => {
    const source: Record<string,string> = {
      "docs/04-system/index.md": [
        "# Index", "[Present](present.md)", "[Missing](missing.md)",
        "~~~md", "[Code example](ignored.md)", "~~~",
      ].join("\n"),
      "docs/04-system/present.md": "# Present",
    };
    const result = await buildDataInventory(Object.keys(source), async path => Buffer.from(source[path]!));
    expect(result.broken_document_links).toEqual([{
      source: "docs/04-system/index.md", line: 3, label: "Missing",
      target: "docs/04-system/missing.md",
    }]);
  });

  test("checks known fixture consumers against tracked paths", async () => {
    const fixture = "mcp/tests/fixtures/agent-permission-cases.json";
    const consumer = "mcp/tests/repository/agent-permission-preflight.test.ts";
    const missing = await buildDataInventory([fixture], async () => Buffer.from("{}"));
    expect(missing.fixture_consumer_issues).toEqual([{
      fixture, reason: "MISSING_CONSUMER", consumer,
    }]);
    const valid = await buildDataInventory([fixture, consumer], async () => Buffer.from("{}"));
    expect(valid.fixture_consumer_issues).toEqual([]);
  });

  test("identifies multi-hop root facades without treating them as broken", async () => {
    const sources: Record<string,string> = {
      "mcp/lib/legacy.ts": 'export * from "./intermediate";',
      "mcp/lib/intermediate.ts": 'export * from "./domain/owner";',
      "mcp/lib/domain/owner.ts": "export const x = true;",
    };
    const result = await buildDataInventory(Object.keys(sources), async path => Buffer.from(sources[path]!));
    expect(result.unresolved_aliases).toEqual([]);
    expect(result.alias_chains).toEqual(["mcp/lib/legacy.ts"]);
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
