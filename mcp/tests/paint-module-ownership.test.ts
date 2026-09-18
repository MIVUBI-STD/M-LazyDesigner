import { describe, expect, test } from "bun:test";

describe("paint module ownership", () => {
  test("paint facade aggregates focused capability owners only", async () => {
    const [facade, primitives, brush, state, shared] = await Promise.all([
      Bun.file("server/tools/paint.ts").text(),
      Bun.file("server/tools/paint-primitives.ts").text(),
      Bun.file("server/tools/paint-brush.ts").text(),
      Bun.file("server/tools/paint-state.ts").text(),
      Bun.file("server/tools/paint-shared.ts").text(),
    ]);

    expect(facade).not.toContain("createTool(");
    expect(facade).not.toContain("Undo.initEdit");
    expect(facade).toContain("registerPaintPrimitiveTools();");
    expect(facade).toContain("registerPaintEraserTool();");
    expect(facade).toContain("registerPaintSettingsTool();");
    expect(facade).toContain("registerPaintBrushTools();");
    expect(facade).toContain("registerPaintStateTools();");

    expect(primitives).toContain("export function registerPaintPrimitiveTools");
    expect(brush).toContain("export function registerPaintEraserTool");
    expect(brush).toContain("export function registerPaintBrushTools");
    expect(state).toContain("export function registerPaintSettingsTool");
    expect(state).toContain("export function registerPaintStateTools");
    expect(shared).toContain("export function normalizeTexturePixelRegion");
  });

  test("facade registrar order preserves the original paint surface order", async () => {
    const facade = await Bun.file("server/tools/paint.ts").text();
    const order = [
      "registerPaintPrimitiveTools();",
      "registerPaintEraserTool();",
      "registerPaintSettingsTool();",
      "registerPaintBrushTools();",
      "registerPaintStateTools();",
    ].map((marker) => facade.indexOf(marker));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
