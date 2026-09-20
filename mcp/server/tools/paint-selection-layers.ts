/// <reference types="blockbench-types" />

import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL } from "@/lib/constants";
import { getAndActivateTexture, resolvePaintTexture } from "@/lib/util";
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
  layer_id: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Required for layer-targeted actions: exact layer UUID or unique exact layer name inside the resolved texture."
    ),
  layer_name: z.string().min(1).optional().describe("Layer name for create/rename."),
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
}).superRefine((value, ctx) => {
  const needsLayer = value.action !== "create_layer" && value.action !== "flatten_layers";
  if (needsLayer && !value.layer_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["layer_id"],
      message: `layer_id is required for ${value.action}; editor selection is not a semantic target.`,
    });
  }
  if (value.action === "rename_layer" && !value.layer_name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["layer_name"],
      message: "layer_name is required for rename_layer.",
    });
  }
  if (value.action === "set_opacity" && value.opacity === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["opacity"],
      message: "opacity is required for set_opacity.",
    });
  }
  if (value.action === "set_blend_mode" && !value.blend_mode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["blend_mode"],
      message: "blend_mode is required for set_blend_mode.",
    });
  }
  if (value.action === "move_layer" && value.target_index === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["target_index"],
      message: "target_index is required for move_layer.",
    });
  }
});


type ManagedTextureLayer = TextureLayer & {
  parent_uuid?: string;
};

function resolveManagedTextureLayer(
  texture: Texture,
  reference: string
): ManagedTextureLayer {
  const layers = (texture.layers ?? []).filter(
    (layer): layer is ManagedTextureLayer => layer instanceof TextureLayer
  );
  const uuidMatch = layers.find((layer) => layer.uuid === reference);
  if (uuidMatch) return uuidMatch;

  const nameMatches = layers.filter((layer) => layer.name === reference);
  if (nameMatches.length === 1) return nameMatches[0];
  if (nameMatches.length > 1) {
    throw new Error(
      `Texture layer name "${reference}" is ambiguous inside texture "${texture.name}". Pass the exact layer UUID.`
    );
  }
  throw new Error(
    `Texture layer "${reference}" was not found inside texture "${texture.name}".`
  );
}

function layerContinuationState(texture: Texture, layer: ManagedTextureLayer) {
  return {
    uuid: layer.uuid,
    name: layer.name,
    index: texture.layers.indexOf(layer),
    opacity: layer.opacity,
    blend_mode: layer.blend_mode,
    width: layer.width,
    height: layer.height,
    offset: Array.isArray(layer.offset) ? [...layer.offset] : null,
    parent_uuid: layer.parent_uuid || null,
  };
}

function textureLayerContinuationState(texture: Texture) {
  return {
    uuid: texture.uuid,
    name: texture.name,
    layers_enabled: texture.layers_enabled === true,
    layer_count: texture.layers.length,
    selected_layer_uuid: texture.selected_layer?.uuid ?? null,
  };
}

function refreshLayerInterface(updateConditions = false): void {
  updateInterfacePanels();
  if (updateConditions) BARS.updateConditions();
}

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
        description: "Creates and mutates texture layers by explicit texture/layer identity with action-scoped Undo and compact continuation receipts.",
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
                    selection.forEachPixel((_x, _y, value, index) => {
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
                    selection.forEachPixel((x, y, _value, index) => {
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
      
                selection.forEachPixel((x, y, _value, index) => {
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
              layer_id,
              layer_name,
              opacity,
              blend_mode,
              target_index,
            }) {
              const requiresEditorLayerSelection =
                action === "create_layer" || action === "duplicate_layer";
              const texture = requiresEditorLayerSelection
                ? getAndActivateTexture(texture_id)
                : resolvePaintTexture(texture_id);
              const layer =
                action === "create_layer" || action === "flatten_layers"
                  ? null
                  : resolveManagedTextureLayer(texture, layer_id!);

              if (action === "create_layer") {
                Undo.initEdit({ textures: [texture], bitmap: true });
                try {
                  if (!texture.layers_enabled) texture.activateLayers(false);
                  const newLayer = new TextureLayer(
                    { name: layer_name || `Layer ${texture.layers.length + 1}` },
                    texture
                  ) as ManagedTextureLayer;
                  newLayer.setSize(texture.width, texture.height);
                  newLayer.addForEditing();
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                  refreshLayerInterface(true);
                  return {
                    content: [{ type: "text" as const, text: `Created layer "${newLayer.name}".` }],
                    structuredContent: {
                      operation: action,
                      texture: textureLayerContinuationState(texture),
                      layer: layerContinuationState(texture, newLayer),
                    },
                  };
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  refreshLayerInterface(true);
                  throw error;
                }
              }

              if (action === "delete_layer") {
                const target = layer!;
                const removed = layerContinuationState(texture, target);
                Undo.initEdit({ textures: [texture], bitmap: true });
                try {
                  target.remove(false);
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                  refreshLayerInterface(true);
                  return {
                    content: [{ type: "text" as const, text: `Deleted layer "${removed.name}".` }],
                    structuredContent: {
                      operation: action,
                      texture: textureLayerContinuationState(texture),
                      removed_layer: removed,
                    },
                  };
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  refreshLayerInterface(true);
                  throw error;
                }
              }

              if (action === "duplicate_layer") {
                const source = layer!;
                const layerCopy = source.getUndoCopy(
                  true
                ) as ConstructorParameters<typeof TextureLayer>[0];
                layerCopy.name = `${source.name} copy`;
                Undo.initEdit({ textures: [texture], bitmap: true });
                try {
                  const duplicatedLayer = new TextureLayer(
                    layerCopy,
                    texture
                  ) as ManagedTextureLayer;
                  duplicatedLayer.addForEditing();
                  texture.updateLayerChanges(true);
                  Undo.finishEdit(`Layer management: ${action}`);
                  refreshLayerInterface(true);
                  return {
                    content: [{ type: "text" as const, text: `Duplicated layer "${source.name}".` }],
                    structuredContent: {
                      operation: action,
                      texture: textureLayerContinuationState(texture),
                      source_layer_uuid: source.uuid,
                      layer: layerContinuationState(texture, duplicatedLayer),
                    },
                  };
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  refreshLayerInterface(true);
                  throw error;
                }
              }

              if (action === "merge_down") {
                const source = layer!;
                const sourceIndex = texture.layers.indexOf(source);
                const down = texture.layers[sourceIndex - 1];
                if (!(down instanceof TextureLayer)) {
                  throw new Error(
                    `Layer "${source.name}" has no pixel layer directly below it to merge into.`
                  );
                }
                const sourceReceipt = layerContinuationState(texture, source);
                Undo.initEdit({ textures: [texture], bitmap: true });
                try {
                  source.mergeDown(false);
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                  refreshLayerInterface(true);
                  return {
                    content: [{ type: "text" as const, text: `Merged layer "${source.name}" down.` }],
                    structuredContent: {
                      operation: action,
                      texture: textureLayerContinuationState(texture),
                      merged_layer: sourceReceipt,
                      layer: layerContinuationState(texture, down as ManagedTextureLayer),
                    },
                  };
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  refreshLayerInterface(true);
                  throw error;
                }
              }

              if (action === "set_opacity") {
                const target = layer!;
                if (target.opacity === opacity) {
                  throw new Error(
                    `Layer "${target.name}" already has opacity ${opacity}%; no authored change is required.`
                  );
                }
                Undo.initEdit({ layers: [target] });
                try {
                  target.opacity = opacity!;
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                  refreshLayerInterface();
                  return {
                    content: [{ type: "text" as const, text: `Set layer opacity to ${opacity}%.` }],
                    structuredContent: {
                      operation: action,
                      texture: textureLayerContinuationState(texture),
                      layer: layerContinuationState(texture, target),
                    },
                  };
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  refreshLayerInterface();
                  throw error;
                }
              }

              if (action === "set_blend_mode") {
                const target = layer!;
                if (target.blend_mode === blend_mode) {
                  throw new Error(
                    `Layer "${target.name}" already uses blend mode ${blend_mode}; no authored change is required.`
                  );
                }
                Undo.initEdit({ layers: [target] });
                try {
                  target.blend_mode = blend_mode!;
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                  refreshLayerInterface();
                  return {
                    content: [{ type: "text" as const, text: `Set layer blend mode to ${blend_mode}.` }],
                    structuredContent: {
                      operation: action,
                      texture: textureLayerContinuationState(texture),
                      layer: layerContinuationState(texture, target),
                    },
                  };
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  refreshLayerInterface();
                  throw error;
                }
              }

              if (action === "move_layer") {
                const target = layer!;
                const currentIndex = texture.layers.indexOf(target);
                if (target_index! >= texture.layers.length) {
                  throw new Error(
                    `Target index ${target_index} is out of range for ${texture.layers.length} layers.`
                  );
                }
                if (currentIndex === target_index) {
                  throw new Error(
                    `Layer "${target.name}" is already at index ${target_index}; no authored change is required.`
                  );
                }
                Undo.initEdit({ textures: [texture] });
                try {
                  texture.layers.remove(target);
                  texture.layers.splice(target_index!, 0, target);
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                  refreshLayerInterface();
                  return {
                    content: [{ type: "text" as const, text: `Moved layer to position ${target_index}.` }],
                    structuredContent: {
                      operation: action,
                      texture: textureLayerContinuationState(texture),
                      previous_index: currentIndex,
                      layer: layerContinuationState(texture, target),
                    },
                  };
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  refreshLayerInterface();
                  throw error;
                }
              }

              if (action === "rename_layer") {
                const target = layer!;
                if (target.name === layer_name) {
                  throw new Error(
                    `Layer already has the exact name "${layer_name}"; no authored change is required.`
                  );
                }
                const collision = texture.layers.some(
                  (candidate) =>
                    candidate !== target &&
                    candidate.name.toLowerCase() === layer_name!.toLowerCase()
                );
                if (collision) {
                  throw new Error(
                    `Layer name "${layer_name}" collides case-insensitively inside texture "${texture.name}".`
                  );
                }
                const previousName = target.name;
                Undo.initEdit({ layers: [target] });
                try {
                  target.name = layer_name!;
                  Undo.finishEdit(`Layer management: ${action}`);
                  const syncTexture = texture as Texture & {
                    sync_to_project?: string;
                    syncToOtherProject?: () => unknown;
                  };
                  if (
                    syncTexture.sync_to_project &&
                    typeof syncTexture.syncToOtherProject === "function"
                  ) {
                    syncTexture.syncToOtherProject();
                  }
                  refreshLayerInterface();
                  return {
                    content: [{ type: "text" as const, text: `Renamed layer "${previousName}" to "${target.name}".` }],
                    structuredContent: {
                      operation: action,
                      texture: textureLayerContinuationState(texture),
                      previous_name: previousName,
                      layer: layerContinuationState(texture, target),
                    },
                  };
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  refreshLayerInterface();
                  throw error;
                }
              }

              if (action === "flatten_layers") {
                if (!texture.layers_enabled) {
                  throw new Error("Texture has no layers to flatten.");
                }
                const nativeTexture = texture as Texture & { flatten?: () => void };
                if (typeof nativeTexture.flatten !== "function") {
                  throw new Error(
                    "Native Blockbench texture.flatten() is unavailable. Refusing approximate fallback because layer blend/alpha-mask semantics could be lost."
                  );
                }
                const flattenedLayerCount = texture.layers.length;
                Undo.initEdit({ textures: [texture], bitmap: true });
                try {
                  nativeTexture.flatten();
                  if (texture.layers_enabled) {
                    throw new Error(
                      "Native texture flatten returned without disabling layer state."
                    );
                  }
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                  UVEditor.vue.layer = null;
                  refreshLayerInterface(true);
                  return {
                    content: [{ type: "text" as const, text: `Flattened ${flattenedLayerCount} layer(s).` }],
                    structuredContent: {
                      operation: action,
                      texture: textureLayerContinuationState(texture),
                      flattened_layer_count: flattenedLayerCount,
                      native_flatten: true,
                    },
                  };
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  refreshLayerInterface(true);
                  throw error;
                }
              }

              throw new Error(`Unsupported texture layer action: ${action}`);
            },
          },
          paintSelectionLayerToolDocs[1].status
        );
}
