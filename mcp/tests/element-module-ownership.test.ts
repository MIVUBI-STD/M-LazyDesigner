import { describe, expect, test } from "bun:test";

describe("element module ownership", () => {
  test("element facade aggregates focused owners only", async () => {
    const [facade, mutation, hierarchy, discovery, shared] = await Promise.all([
      Bun.file("server/tools/element.ts").text(),
      Bun.file("server/tools/element-mutation.ts").text(),
      Bun.file("server/tools/element-hierarchy.ts").text(),
      Bun.file("server/tools/element-discovery.ts").text(),
      Bun.file("server/tools/element-shared.ts").text(),
    ]);

    expect(facade).not.toContain("createTool(");
    expect(facade).not.toContain("Undo.initEdit");
    expect(facade).toContain("registerRemoveElementTool();");
    expect(facade).toContain("registerAddGroupTool();");
    expect(facade).toContain("registerListOutlineTool();");
    expect(facade).toContain("registerElementMutationTools();");
    expect(facade).toContain("registerElementDiscoveryTools();");
    expect(facade).toContain("registerElementHierarchyTools();");

    expect(mutation).toContain("export function registerElementMutationTools");
    expect(hierarchy).toContain("export function registerElementHierarchyTools");
    expect(discovery).toContain("export function registerElementDiscoveryTools");
    expect(shared).toContain("export function resolveUniqueDestructiveElement");
  });

  test("facade registrar order preserves the original element surface order", async () => {
    const facade = await Bun.file("server/tools/element.ts").text();
    const order = [
      "registerRemoveElementTool();",
      "registerAddGroupTool();",
      "registerListOutlineTool();",
      "registerElementMutationTools();",
      "registerElementDiscoveryTools();",
      "registerElementHierarchyTools();",
    ].map((marker) => facade.indexOf(marker));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
