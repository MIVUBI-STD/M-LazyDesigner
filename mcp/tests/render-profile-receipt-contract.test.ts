import { describe, expect, test } from "bun:test";

describe("render-profile continuation receipt contract", () => {
  test("runtime source exposes compact mutation identity for write-backed operations", async () => {
    const source = await Bun.file("server/tools/render-profile.ts").text();

    expect(source).toContain('operation: "bind"');
    expect(source).toContain('operation: "set_slot"');
    expect(source).toContain("operation: request.operation");
    expect(source).toContain("bone_pattern: request.bone_pattern");
    expect(source).toContain('slot: request.operation === "assign" ? request.slot : null');
    expect(source).toContain("write_transaction");
    expect(source).toContain("client_entity_write");
    expect(source).toContain("render_controller_write");
  });

  test("set_slot computes its summary once and reuses it in the receipt", async () => {
    const source = await Bun.file("server/tools/render-profile.ts").text();

    const setSlotBlock = source.slice(
      source.indexOf('if (request.operation === "set_slot")'),
      source.indexOf("const source = readSource(request.render_controller_source)")
    );

    expect(setSlotBlock).toContain(
      "const summary = inspectEntityRenderProfileBindings(document);"
    );
    expect(setSlotBlock).toContain("summary,");
    expect(
      (setSlotBlock.match(/inspectEntityRenderProfileBindings\(document\)/g) ?? [])
        .length
    ).toBe(1);
  });
});
