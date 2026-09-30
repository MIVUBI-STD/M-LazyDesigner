import { describe, expect, test } from "bun:test";
import { bedrockLocatorExportKey } from "@/server/tools/geometry/locators";

describe("Bedrock locator export identity", () => {
  test("Locator and Null Object names map to native Bedrock locator keys", () => {
    expect(bedrockLocatorExportKey("locator", "hand")).toBe("hand");
    expect(bedrockLocatorExportKey("null_object", "hand")).toBe("_null_hand");
    expect(bedrockLocatorExportKey("locator", "_null_hand")).toBe(
      bedrockLocatorExportKey("null_object", "hand")
    );
  });

  test("create and parent-move preflight use parent-scoped exported keys", async () => {
    const source = await Bun.file("server/tools/geometry/locators.ts").text();
    expect(source).toContain("function assertLocatorExportKeyAvailable(");
    expect(source).toContain("parent.children.find(");
    expect(source).toContain(
      'assertLocatorExportKeyAvailable(parent, "locator", args.name)'
    );
    expect(source).toContain(
      'assertLocatorExportKeyAvailable(parent, "null_object", args.name)'
    );
    expect(source).toContain('nextParent,\n            "locator",\n            locator.name');
    expect(source).toContain('nextParent,\n            "null_object",\n            element.name');
    expect(source).not.toContain("assertOutlinerNameAvailable");
    expect(source).not.toContain("Names must remain unique across Locators");
  });

  test("public locator schemas stay unchanged during correctness hardening", async () => {
    const source = await Bun.file("server/tools/geometry/locators.ts").text();
    expect(source).toContain('action: z\n      .literal("create")');
    expect(source).toContain('action: z\n      .literal("update")');
    expect(source).toContain("export const manageLocatorParameters");
    expect(source).toContain("export const manageNullObjectParameters");
    expect(source).not.toContain("kind: z.enum");
  });
});
