/// <reference types="blockbench-types" />

import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL } from "@/lib/constants";
import { getAndActivateTexture } from "@/lib/util";
import { textureIdOptionalSchema } from "@/lib/zodObjects";

const textureLayerBlendModeEnum = z.enum([
  "default",
  "set_opacity",
  "color",
  "multiply",
  "add",
  "darken",
  "lighten",
  "screen",
  "overlay",
  "difference",
  "alpha_mask",
]);

/**
 * Pixel operations reject out-of-bounds coordinates instead of letting the
 * native painter silently clip/wrap/ignore them while still reporting success.
 */

export const textureSelectionParameters = z.object({
  action: z
    .enum([
      "select_rectangle",
      "select_ellipse",
      "select_all",
      "clear_selection",
      "invert_selection",
      "expand_selection",
      "contract_selection",
    ])
    .describe("Selection action to perform."),
  texture_id: textureIdOptionalSchema,
  coordinates: z
    .object({
      x1: z.number().describe("Start X coordinate."),
      y1: z.number().describe("Start Y coordinate."),
      x2: z.number().describe("End X coordinate."),
      y2: z.number().describe("End Y coordinate."),
    })
    .optional()
    .describe("Selection area coordinates."),
  radius: z
    .number()
    .optional()
    .describe("Radius for expand/contract operations."),
  mode: z
    .enum(["create", "add", "subtract", "intersect"])
    .optional()
    .default("create")
    .describe("Selection mode."),
});

export const textureLayerManagementParameters = z.object({
  action: z
    .enum([
      "create_layer",
      "delete_layer",
      "duplicate_layer",
      "merge_down",
      "set_opacity",
      "set_blend_mode",
      "move_layer",
      "rename_layer",
      "flatten_layers",
    ])
    .describe("Layer management action."),
  texture_id: textureIdOptionalSchema,
  layer_name: z.string().optional().describe("Name of the layer."),
  opacity: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Layer opacity percentage."),
  blend_mode: textureLayerBlendModeEnum.optional().describe("Layer blend mode."),
  target_index: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("0-based final layer index."),
});


export const paintSelectionLayerToolDocs: ToolSpec[] = [
  {
        name: "texture_selection",
        description:
          "Creates, modifies, or manipulates texture selections for painting.",
        annotations: {
          title: "Texture Selection",
          destructiveHint: true,
        },
        parameters: textureSelectionParameters,
        status: STATUS_EXPERIMENTAL,
      },
  {
        name: "texture_layer_management",
        description: "Creates, manages, and manipulates texture layers.",
        annotations: {
          title: "Texture Layer Management",
          destructiveHint: true,
        },
        parameters: textureLayerManagementParameters,
        status: STATUS_EXPERIMENTAL,
      }
];

export function registerPaintSelectionLayerTools(): void {
  createTool(
          paintSelectionLayerToolDocs[0].name,
          {
            ...paintSelectionLayerToolDocs[0],
            parameters: textureSelectionParameters,
            async execute({ action, texture_id, coordinates, radius, mode }) {
              const texture = getAndActivateTexture(texture_id);
      
              if (action === "invert_selection") {
                Undo.initSelection({ texture_selection: true });
                try {
                  const selection = texture.selection;
                  if (selection.is_custom) {
                    const selectionArray = selection.array;
                    if (!selectionArray) {
                      throw new Error("Custom texture selection has no backing matrix.");
                    }
                    selection.forEachPixel((x, y, value, index) => {
                      selectionArray[index] = value ? 0 : 1;
                    });
                  } else {
                    selection.setOverride(!selection.override);
                  }
                  UVEditor.updateSelectionOutline();
                  Undo.finishSelection("Invert selection");
                } catch (error) {
                  Undo.cancelSelection(true);
                  UVEditor.updateSelectionOutline();
                  throw error;
                }
      
                return `Applied ${action} to texture "${texture.name}"`;
              }
      
              if (action === "expand_selection" || action === "contract_selection") {
                if (radius === undefined) {
                  throw new Error(
                    `Radius required for ${action === "expand_selection" ? "expand" : "contract"} selection.`
                  );
                }
      
                const signedRadius =
                  action === "contract_selection" ? -Math.abs(radius) : Math.abs(radius);
                if (signedRadius === 0) {
                  return `Applied ${action} to texture "${texture.name}"`;
                }
      
                Undo.initSelection({ texture_selection: true });
                try {
                  const selection = texture.selection;
                  const selectionRadius = Math.abs(signedRadius);
                  const radiusSquared = signedRadius ** 2;
      
                  if (selection.is_custom) {
                    const selectionArray = selection.array;
                    if (!selectionArray) {
                      throw new Error("Custom texture selection has no backing matrix.");
                    }
                    const selectionCopy = selectionArray.slice();
                    const expectedValue = signedRadius < 0 ? 0 : 1;
      
                    selection.forEachPixel((x, y, value, index) => {
                      if (value === expectedValue) return;
                      for (
                        let offsetX = -selectionRadius;
                        offsetX <= selectionRadius;
                        offsetX++
                      ) {
                        for (
                          let offsetY = -selectionRadius;
                          offsetY <= selectionRadius;
                          offsetY++
                        ) {
                          if (offsetX ** 2 + offsetY ** 2 > radiusSquared) continue;
                          if (selection.get(x + offsetX, y + offsetY) === expectedValue) {
                            selectionCopy[index] = expectedValue;
                            return;
                          }
                        }
                      }
                    });
                    selection.array = selectionCopy;
                  } else if (selection.override === true && signedRadius < 0) {
                    selection.setOverride(null);
                    const selectionArray = selection.array;
                    if (!selectionArray) {
                      throw new Error("Texture selection matrix is unavailable.");
                    }
                    selection.forEachPixel((x, y, value, index) => {
                      const selected =
                        x >= selectionRadius &&
                        y >= selectionRadius &&
                        x < selection.width - selectionRadius &&
                        y < selection.height - selectionRadius;
                      selectionArray[index] = selected ? 1 : 0;
                    });
                  }
      
                  UVEditor.updateSelectionOutline();
                  Undo.finishSelection(
                    action === "expand_selection" ? "Expand selection" : "Contract selection"
                  );
                } catch (error) {
                  Undo.cancelSelection(true);
                  UVEditor.updateSelectionOutline();
                  throw error;
                }
      
                return `Applied ${action} to texture "${texture.name}"`;
              }
      
              const selection = texture.selection;
      
              const applyMask = (
                predicate: (x: number, y: number) => boolean
              ) => {
                const previousOverride = selection.override;
                selection.activate();
                selection.setOverride(null);
                const selectionArray = selection.array;
                if (!selectionArray) {
                  throw new Error("Texture selection matrix is unavailable.");
                }
      
                if (previousOverride === true) selectionArray.fill(1);
                if (previousOverride === false) selectionArray.fill(0);
      
                selection.forEachPixel((x, y, value, index) => {
                  const inside = predicate(x, y);
                  switch (mode) {
                    case "create":
                      selectionArray[index] = inside ? 1 : 0;
                      break;
                    case "add":
                      if (inside) selectionArray[index] = 1;
                      break;
                    case "subtract":
                      if (inside) selectionArray[index] = 0;
                      break;
                    case "intersect":
                      if (!inside) selectionArray[index] = 0;
                      break;
                  }
                });
              };
      
              Undo.initSelection({ texture_selection: true });
              try {
                switch (action) {
                  case "select_rectangle": {
                    if (!coordinates) {
                      throw new Error("Coordinates required for rectangle selection.");
                    }
                    const minX = Math.floor(Math.min(coordinates.x1, coordinates.x2));
                    const maxX = Math.ceil(Math.max(coordinates.x1, coordinates.x2));
                    const minY = Math.floor(Math.min(coordinates.y1, coordinates.y2));
                    const maxY = Math.ceil(Math.max(coordinates.y1, coordinates.y2));
                    applyMask((x, y) => x >= minX && x < maxX && y >= minY && y < maxY);
                    break;
                  }
      
                  case "select_ellipse": {
                    if (!coordinates) {
                      throw new Error("Coordinates required for ellipse selection.");
                    }
                    const centerX = (coordinates.x1 + coordinates.x2) / 2;
                    const centerY = (coordinates.y1 + coordinates.y2) / 2;
                    const radiusX = Math.abs(coordinates.x2 - coordinates.x1) / 2;
                    const radiusY = Math.abs(coordinates.y2 - coordinates.y1) / 2;
                    if (radiusX === 0 || radiusY === 0) {
                      throw new Error("Ellipse selection requires non-zero width and height.");
                    }
                    applyMask((x, y) => {
                      const dx = (x + 0.5 - centerX) / radiusX;
                      const dy = (y + 0.5 - centerY) / radiusY;
                      return dx * dx + dy * dy <= 1;
                    });
                    break;
                  }
      
                  case "select_all":
                    selection.setOverride(true);
                    break;
      
                  case "clear_selection":
                    selection.clear();
                    break;
      
                  default:
                    throw new Error(`Unsupported texture selection action: ${action}`);
                }
      
                UVEditor.updateSelectionOutline();
                Undo.finishSelection("Texture selection");
              } catch (error) {
                Undo.cancelSelection(true);
                UVEditor.updateSelectionOutline();
                throw error;
              }
      
              return `Applied ${action} to texture "${texture.name}"`;
            },
          },
          paintSelectionLayerToolDocs[0].status
        );
      
        createTool(
          paintSelectionLayerToolDocs[1].name,
          {
            ...paintSelectionLayerToolDocs[1],
            parameters: textureLayerManagementParameters,
            async execute({
              action,
              texture_id,
              layer_name,
              opacity,
              blend_mode,
              target_index,
            }) {
              const texture = getAndActivateTexture(texture_id);
      
              Undo.initEdit({
                textures: [texture],
                layers: texture.layers,
                bitmap: true,
              });
      
              if (action === "create_layer") {
                let result = "";
      
                try {
                  if (!texture.layers_enabled) {
                    texture.activateLayers(false);
                  }
                  const newLayer = new TextureLayer(
                    {
                      name: layer_name || `Layer ${texture.layers.length + 1}`,
                    },
                    texture
                  );
                  newLayer.setSize(texture.width, texture.height);
                  newLayer.addForEditing();
                  result = `Created layer "${newLayer.name}"`;
      
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  updateInterfacePanels();
                  throw error;
                }
      
                updateInterfacePanels();
                return result;
              }
      
              if (action === "delete_layer") {
                let result = "";
      
                try {
                  if (!TextureLayer.selected) {
                    throw new Error("No layer selected.");
                  }
                  const layerToDelete = TextureLayer.selected;
                  layerToDelete.remove(false);
                  result = `Deleted layer "${layerToDelete.name}"`;
      
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  updateInterfacePanels();
                  throw error;
                }
      
                updateInterfacePanels();
                return result;
              }
      
              if (action === "duplicate_layer") {
                let result = "";
      
                try {
                  if (!TextureLayer.selected) {
                    throw new Error("No layer selected.");
                  }
                  const layerToDuplicate = TextureLayer.selected;
                  const layerCopy = layerToDuplicate.getUndoCopy(
                    true
                  ) as ConstructorParameters<typeof TextureLayer>[0];
                  layerCopy.name = `${layerToDuplicate.name} copy`;
                  const duplicatedLayer = new TextureLayer(layerCopy, texture);
                  duplicatedLayer.addForEditing();
                  result = `Duplicated layer "${duplicatedLayer.name}"`;
      
                  texture.updateLayerChanges(true);
                  Undo.finishEdit(`Layer management: ${action}`);
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  updateInterfacePanels();
                  throw error;
                }
      
                updateInterfacePanels();
                return result;
              }
      
              if (action === "merge_down") {
                let result = "";
      
                try {
                  if (!TextureLayer.selected) {
                    throw new Error("No layer selected.");
                  }
                  TextureLayer.selected.mergeDown(false);
                  result = "Merged layer down";
      
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  updateInterfacePanels();
                  throw error;
                }
      
                updateInterfacePanels();
                return result;
              }
      
              if (action === "set_opacity") {
                let result = "";
      
                try {
                  if (!TextureLayer.selected) {
                    throw new Error("No layer selected.");
                  }
                  if (opacity === undefined) {
                    throw new Error("Opacity value required.");
                  }
                  TextureLayer.selected.opacity = opacity;
                  result = `Set layer opacity to ${opacity}%`;
      
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  updateInterfacePanels();
                  throw error;
                }
      
                updateInterfacePanels();
                return result;
              }
      
              if (action === "set_blend_mode") {
                let result = "";
      
                try {
                  if (!TextureLayer.selected) {
                    throw new Error("No layer selected.");
                  }
                  if (!blend_mode) {
                    throw new Error("Blend mode required.");
                  }
                  TextureLayer.selected.blend_mode = blend_mode;
                  result = `Set layer blend mode to ${blend_mode}`;
      
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  updateInterfacePanels();
                  throw error;
                }
      
                updateInterfacePanels();
                return result;
              }
      
              if (action === "move_layer") {
                let result = "";
      
                try {
                  if (!TextureLayer.selected) {
                    throw new Error("No layer selected.");
                  }
                  if (target_index === undefined) {
                    throw new Error("Target index required.");
                  }
                  if (target_index >= texture.layers.length) {
                    throw new Error(
                      `Target index ${target_index} is out of range for ${texture.layers.length} layers.`
                    );
                  }
      
                  const layerToMove = TextureLayer.selected;
                  texture.layers.remove(layerToMove);
                  texture.layers.splice(target_index, 0, layerToMove);
                  result = `Moved layer to position ${target_index}`;
      
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  updateInterfacePanels();
                  throw error;
                }
      
                updateInterfacePanels();
                return result;
              }
      
              if (action === "rename_layer") {
                let result = "";
      
                try {
                  if (!TextureLayer.selected) {
                    throw new Error("No layer selected.");
                  }
                  if (!layer_name) {
                    throw new Error("New layer name required.");
                  }
                  const oldName = TextureLayer.selected.name;
                  TextureLayer.selected.name = layer_name;
                  result = `Renamed layer from "${oldName}" to "${layer_name}"`;
      
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  updateInterfacePanels();
                  throw error;
                }
      
                updateInterfacePanels();
                return result;
              }
      
              if (action === "flatten_layers") {
                let result = "";
      
                try {
                  if (!texture.layers_enabled) {
                    throw new Error("Texture has no layers to flatten.");
                  }
                  // Composite all layer canvases onto the base bitmap before disabling layers.
                  // Previous implementation emptied layers without merging, losing painted pixels (DEFECT-LOCAL-2).
                  const layersSnapshot = [...texture.layers] as Array<TextureLayer & { canvas: HTMLCanvasElement; opacity?: number; offset?: [number, number] }>;
                  const anyTexture = texture as unknown as { flatten?: () => void };
                  if (typeof anyTexture.flatten === "function") {
                    anyTexture.flatten();
                  } else {
                    const off = document.createElement("canvas");
                    off.width = texture.width;
                    off.height = texture.height;
                    const offCtx = off.getContext("2d")!;
                    offCtx.clearRect(0, 0, off.width, off.height);
                    // Preserve base bitmap before overlaying layers — previous fallback drew only layers, losing pre-flatten pixels.
                    const baseCanvas = (texture as unknown as { canvas: HTMLCanvasElement }).canvas;
                    if (baseCanvas) {
                      offCtx.globalAlpha = 1;
                      offCtx.globalCompositeOperation = "source-over";
                      offCtx.drawImage(baseCanvas, 0, 0);
                    }
                    for (const layer of layersSnapshot) {
                      const layerCanvas = (layer as unknown as { canvas: HTMLCanvasElement }).canvas;
                      if (!layerCanvas) continue;
                      const opacity = (layer as unknown as { opacity?: number }).opacity;
                      offCtx.globalAlpha = opacity !== undefined ? opacity / 100 : 1;
                      offCtx.globalCompositeOperation = "source-over";
                      const offset = (layer as unknown as { offset?: [number, number] }).offset ?? [0, 0];
                      offCtx.drawImage(layerCanvas, offset[0], offset[1]);
                    }
                    offCtx.globalAlpha = 1;
                    texture.layers_enabled = false;
                    texture.selected_layer = null;
                    texture.layers.empty();
                    // @ts-ignore - texture.edit is available in Blockbench runtime
                    texture.edit(
                      (canvas, env) => {
                        env.ctx.clearRect(0, 0, canvas.width, canvas.height);
                        env.ctx.drawImage(off, 0, 0);
                      },
                      { no_undo: true }
                    );
                  }
                  if (texture.layers_enabled) {
                    texture.layers_enabled = false;
                    texture.selected_layer = null;
                    texture.layers.empty();
                  }
                  result = "Flattened all layers";
      
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  updateInterfacePanels();
                  throw error;
                }
      
                UVEditor.vue.layer = null;
                updateInterfacePanels();
                BARS.updateConditions();
                return result;
              }
      
              throw new Error(`Unsupported texture layer action: ${action}`);
            },
          },
          paintSelectionLayerToolDocs[1].status
        );
}
