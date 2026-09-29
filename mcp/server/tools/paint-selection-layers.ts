/// <reference types="blockbench-types" />

import {
  recordCurrentCapabilitySemanticHistoryEffect,
  recordCurrentSemanticHistoryEffect,
} from "@/lib/semanticHistory";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL } from "@/lib/constants";
import {
  textureLayerManagementParameters,
  textureSelectionParameters,
} from "@/server/tools/paint/selectionLayerSchema";
export {
  textureLayerManagementParameters,
  textureSelectionParameters,
} from "@/server/tools/paint/selectionLayerSchema";
import { morphBinaryMaskRound } from "@/lib/texture/binaryMaskMorphology";
import { ellipseSelectionPredicate, rectangleSelectionPredicate } from "@/lib/texture/selectionPlanning";
import { getAndActivateTexture, resolvePaintTexture } from "@/lib/util";
import {
  applyLayerMetadataBatchPlan,
  layerContinuationState,
  requireLayerBlendModeChange,
  requireLayerMove,
  requireLayerOpacityChange,
  requireLayerRename,
  preflightLayerMetadataBatch,
  resolveManagedTextureLayer,
  textureLayerContinuationState,
} from "@/server/tools/paint/layerState";



function refreshLayerInterface(updateConditions = false): void {
  updateInterfacePanels();
  if (updateConditions) BARS.updateConditions();
}

export const paintSelectionLayerToolDocs: ToolSpec[] = [
  {
        name: "texture_selection",
        description: "Mutates texture selections for painting.",
        annotations: {
          title: "Texture Selection",
          destructiveHint: true,
        },
        parameters: textureSelectionParameters,
        status: STATUS_EXPERIMENTAL,
      },
  {
        name: "texture_layer_management",
        description: "Mutates texture layers with explicit identity and scoped Undo.",
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
      
                  if (selection.is_custom) {
                    const selectionArray = selection.array;
                    if (!selectionArray) {
                      throw new Error("Custom texture selection has no backing matrix.");
                    }
                    selection.array = morphBinaryMaskRound(
                      selectionArray,
                      selection.width,
                      selection.height,
                      selectionRadius,
                      signedRadius < 0 ? "contract" : "expand"
                    );
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
                    applyMask(rectangleSelectionPredicate(coordinates));
                    break;
                  }
      
                  case "select_ellipse": {
                    if (!coordinates) {
                      throw new Error("Coordinates required for ellipse selection.");
                    }
                    applyMask(ellipseSelectionPredicate(coordinates));
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
              updates,
            }) {
              const requiresEditorLayerSelection =
                action === "create_layer" || action === "duplicate_layer";
              const texture = requiresEditorLayerSelection
                ? getAndActivateTexture(texture_id)
                : resolvePaintTexture(texture_id);
              const layer =
                action === "create_layer" ||
                action === "flatten_layers" ||
                action === "batch_metadata"
                  ? null
                  : resolveManagedTextureLayer(texture, layer_id!);

              if (action === "batch_metadata") {
                const plan = preflightLayerMetadataBatch(
                  texture,
                  updates as LayerMetadataBatchUpdate[]
                );
                const undoAspects: UndoAspects = plan.orderChange
                  ? { textures: [texture] }
                  : { layers: plan.resolved.map(({ layer }) => layer) };
                Undo.initEdit(undoAspects);
                try {
                  applyLayerMetadataBatchPlan(texture, plan);

                  if (plan.visualChange) {
                    texture.updateChangesAfterEdit();
                  } else {
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
                  }

                  Undo.finishEdit("Layer management: batch_metadata");
                  if (plan.visualChange) {
                    recordCurrentCapabilitySemanticHistoryEffect(
                      "texture_layer_management",
                      { workspace_projection: true, acceptance_gates: true }
                    );
                  } else {
                    recordCurrentSemanticHistoryEffect([], {
                      workspace_projection: true,
                      acceptance_gates: false,
                    });
                  }
                  refreshLayerInterface(plan.orderChange);
                  return {
                    content: [
                      {
                        type: "text" as const,
                        text: `Applied ${plan.resolved.length} layer metadata update(s) in one transaction.`,
                      },
                    ],
                    structuredContent: {
                      operation: action,
                      update_count: plan.resolved.length,
                      recomposed: plan.visualChange,
                      texture: textureLayerContinuationState(texture),
                      changes: plan.resolved.map(({ layer }, index) => ({
                        layer_uuid: layer.uuid,
                        before: plan.previous[index].state,
                        after: layerContinuationState(texture, layer),
                      })),
                    },
                  };
                } catch (error) {
                  Undo.cancelEdit(true);
                  Canvas.updateAll();
                  refreshLayerInterface(plan.orderChange);
                  throw error;
                }
              }

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
                  recordCurrentCapabilitySemanticHistoryEffect("texture_layer_management", { workspace_projection: true, acceptance_gates: true });
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
                  recordCurrentCapabilitySemanticHistoryEffect("texture_layer_management", { workspace_projection: true, acceptance_gates: true });
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
                  recordCurrentCapabilitySemanticHistoryEffect("texture_layer_management", { workspace_projection: true, acceptance_gates: true });
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
                  recordCurrentCapabilitySemanticHistoryEffect("texture_layer_management", { workspace_projection: true, acceptance_gates: true });
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
                requireLayerOpacityChange(target, opacity!);
                Undo.initEdit({ layers: [target] });
                try {
                  target.opacity = opacity!;
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                  recordCurrentCapabilitySemanticHistoryEffect("texture_layer_management", { workspace_projection: true, acceptance_gates: true });
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
                requireLayerBlendModeChange(target, blend_mode!);
                Undo.initEdit({ layers: [target] });
                try {
                  target.blend_mode = blend_mode!;
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                  recordCurrentCapabilitySemanticHistoryEffect("texture_layer_management", { workspace_projection: true, acceptance_gates: true });
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
                const currentIndex = requireLayerMove(
                  texture,
                  target,
                  target_index!
                );
                Undo.initEdit({ textures: [texture] });
                try {
                  texture.layers.remove(target);
                  texture.layers.splice(target_index!, 0, target);
                  texture.updateChangesAfterEdit();
                  Undo.finishEdit(`Layer management: ${action}`);
                  recordCurrentCapabilitySemanticHistoryEffect("texture_layer_management", { workspace_projection: true, acceptance_gates: true });
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
                const previousName = requireLayerRename(
                  texture,
                  target,
                  layer_name!
                );
                Undo.initEdit({ layers: [target] });
                try {
                  target.name = layer_name!;
                  Undo.finishEdit(`Layer management: ${action}`);
                  recordCurrentSemanticHistoryEffect([], {"workspace_projection":true,"acceptance_gates":false});
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
                  recordCurrentCapabilitySemanticHistoryEffect("texture_layer_management", { workspace_projection: true, acceptance_gates: true });
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
