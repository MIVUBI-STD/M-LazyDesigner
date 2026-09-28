import { describe, expect, test } from "bun:test";
import {
  recordCurrentCapabilitySemanticHistoryEffectIfAdvanced,
  semanticHistoryEffectForEntry,
} from "@/lib/semanticHistory";

describe("native-owned semantic history annotation", () => {
  test("does not annotate a previous entry when native Undo did not advance", () => {
    const g = globalThis as any;
    const oldUndo = g.Undo;
    try {
      const previous = { action: "previous" };
      g.Undo = { index: 1, history: [previous] };
      expect(
        recordCurrentCapabilitySemanticHistoryEffectIfAdvanced(
          "paint_fill_tool",
          1
        )
      ).toBe(false);
      expect(semanticHistoryEffectForEntry(previous)).toBeNull();
    } finally {
      g.Undo = oldUndo;
    }
  });

  test("annotates the new native Undo entry after history advances", () => {
    const g = globalThis as any;
    const oldUndo = g.Undo;
    try {
      const previous = { action: "previous" };
      const current = { action: "paint" };
      g.Undo = { index: 2, history: [previous, current] };
      expect(
        recordCurrentCapabilitySemanticHistoryEffectIfAdvanced(
          "paint_fill_tool",
          1
        )
      ).toBe(true);
      expect(semanticHistoryEffectForEntry(previous)).toBeNull();
      expect(semanticHistoryEffectForEntry(current)).toMatchObject({
        stale: ["TEXTURE_APPEARANCE"],
        workspace_projection: true,
        acceptance_gates: true,
      });
    } finally {
      g.Undo = oldUndo;
    }
  });

  test("eraser and native brush paths use guarded semantic history", async () => {
    const brush = await Bun.file("server/tools/paint-brush.ts").text();

    expect(brush).toContain(
      'runSemanticNativePaintStroke("eraser_tool"'
    );
    expect(brush).toContain(
      'runSemanticNativePaintStroke("paint_with_brush"'
    );
    expect(brush).toContain(
      "recordCurrentCapabilitySemanticHistoryEffectIfAdvanced"
    );
  });

  test("Painter and texture-set import use guarded native history annotation", async () => {
    const paint = await Bun.file("server/tools/paint-primitives.ts").text();
    const materials = await Bun.file("server/tools/texture-materials.ts").text();
    for (const capability of [
      "paint_fill_tool",
      "draw_shape_tool",
      "gradient_tool",
      "copy_brush_tool",
    ]) {
      expect(paint).toContain(`runSemanticPaintStroke("${capability}"`);
    }
    expect(materials).toContain(
      "recordCurrentCapabilitySemanticHistoryEffectIfAdvanced"
    );
    expect(materials).toContain('"import_texture_set"');
  });
});
