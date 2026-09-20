import { describe, expect, test } from "bun:test";
import {
  textureLayerManagementParameters,
} from "@/server/tools/paint";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("texture layer management hardening", () => {
  test("layer-targeted actions require explicit semantic identity", () => {
    for (const action of [
      "delete_layer",
      "duplicate_layer",
      "merge_down",
      "set_opacity",
      "set_blend_mode",
      "move_layer",
      "rename_layer",
    ] as const) {
      expect(
        textureLayerManagementParameters.safeParse({
          action,
          ...(action === "set_opacity" ? { opacity: 50 } : {}),
          ...(action === "set_blend_mode" ? { blend_mode: "multiply" } : {}),
          ...(action === "move_layer" ? { target_index: 0 } : {}),
          ...(action === "rename_layer" ? { layer_name: "renamed" } : {}),
        }).success,
        action
      ).toBe(false);
    }

    expect(
      textureLayerManagementParameters.safeParse({
        action: "set_opacity",
        layer_id: "layer-a",
        opacity: 50,
      }).success
    ).toBe(true);

    expect(
      textureLayerManagementParameters.safeParse({
        action: "flatten_layers",
      }).success
    ).toBe(true);
  });

  test("runtime resolves layers inside the requested texture instead of global selection", async () => {
    const paint = await source("server/tools/paint-selection-layers.ts");

    expect(paint).toContain("function resolveManagedTextureLayer(");
    expect(paint).toContain("const uuidMatch = layers.find");
    expect(paint).toContain("const nameMatches = layers.filter");
    expect(paint).toContain("Pass the exact layer UUID");
    expect(paint).not.toContain("if (!TextureLayer.selected)");
    expect(paint).not.toContain("const layerToDelete = TextureLayer.selected");
    expect(paint).not.toContain("TextureLayer.selected.mergeDown(false)");
  });

  test("Undo scopes follow native Blockbench layer semantics instead of double-snapshotting", async () => {
    const paint = await source("server/tools/paint-selection-layers.ts");

    expect(paint).not.toContain(
      "textures: [texture],\n                layers: texture.layers,\n                bitmap: true"
    );

    for (const action of ["set_opacity", "set_blend_mode", "rename_layer"]) {
      const start = paint.indexOf(`if (action === "${action}")`);
      const end = paint.indexOf("\n              if (action ===", start + 1);
      const block = paint.slice(start, end === -1 ? undefined : end);
      expect(block, action).toContain("Undo.initEdit({ layers: [target] })");
      expect(block, action).not.toContain("bitmap: true");
      expect(block, action).not.toContain("textures: [texture]");
    }

    const moveStart = paint.indexOf('if (action === "move_layer")');
    const moveEnd = paint.indexOf('if (action === "rename_layer")', moveStart);
    const move = paint.slice(moveStart, moveEnd);
    expect(move).toContain("Undo.initEdit({ textures: [texture] })");
    expect(move).not.toContain("bitmap: true");
  });

  test("flatten is native-only and fails closed when native semantics are unavailable", async () => {
    const paint = await source("server/tools/paint-selection-layers.ts");
    const start = paint.indexOf('if (action === "flatten_layers")');
    const block = paint.slice(start);

    expect(block).toContain('typeof nativeTexture.flatten !== "function"');
    expect(block).toContain("Refusing approximate fallback");
    expect(block).toContain("nativeTexture.flatten()");
    expect(block).not.toContain('document.createElement("canvas")');
    expect(block).not.toContain('globalCompositeOperation = "source-over"');
  });

  test("layer mutations return compact continuation state", async () => {
    const paint = await source("server/tools/paint-selection-layers.ts");

    for (const marker of [
      "layerContinuationState(texture",
      "textureLayerContinuationState(texture)",
      "structuredContent:",
      "removed_layer:",
      "previous_index:",
      "previous_name:",
      "flattened_layer_count:",
      "native_flatten: true",
    ]) {
      expect(paint).toContain(marker);
    }
  });

  test("no-op and ambiguity checks run before Undo", async () => {
    const paint = await source("server/tools/paint-selection-layers.ts");

    expect(paint).toContain("already has opacity");
    expect(paint).toContain("already uses blend mode");
    expect(paint).toContain("already at index");
    expect(paint).toContain("already has the exact name");
    expect(paint).toContain("collides case-insensitively");
  });
});
