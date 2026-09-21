import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./index.ts", import.meta.url), "utf8");

describe("Gateway index boundary", () => {
  test("does not hardcode transition capability names", () => {
    expect(source).not.toContain('capability === "create_project"');
    expect(source).not.toContain('capability === "switch_authoring_phase"');
  });

  test("does not route vanilla support by capability name", () => {
    expect(source).not.toContain("VANILLA_ENTITY_REFERENCE_CAPABILITY");
    expect(source).not.toContain("VanillaEntityReferenceProvider");
    expect(source).toContain("LocalCapabilityRegistry");
  });

  test("keeps capability discovery progressive and bounded", () => {
    expect(source).toContain('.max(8)');
    expect(source).toContain('z.enum(["input", "full"]).default("input")');
    expect(source).toContain('detail === "full"');
    expect(source).toContain('inputSchema: projection.inputSchema');
  });

  test("projects status instead of spreading raw backend status", () => {
    expect(source).toContain("projectGatewayStatus(status)");
    expect(source).not.toContain("...status,\n          control");
  });
});
