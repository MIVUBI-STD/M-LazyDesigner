/// <reference types="blockbench-types" />

import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL } from "@/lib/constants";
import { getAndActivateTexture, setBarItemValues } from "@/lib/util";
import { generateTexturePalette, texturePaletteParameters } from "@/lib/texturePalette";
import { resolveCoreTexture } from "@/lib/coreIdentity";
import {
  axisEnum,
  brushModifierEnum,
  coordinateSchema,
  textureIdOptionalSchema,
} from "@/lib/zodObjects";
import { getRuntimePainter } from "./paint-shared";

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
function requirePixelsWithinTexture(
  texture: Texture,
  points: Array<{ x: number; y: number }>
): void {
  for (const point of points) {
    if (
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      point.x < 0 ||
      point.y < 0 ||
      point.x >= texture.width ||
      point.y >= texture.height
    ) {
      throw new Error(
        `Coordinate (${point.x}, ${point.y}) is outside texture "${texture.name}" (${texture.width}x${texture.height}). Use in-bounds pixel coordinates.`
      );
    }
  }
}

export const paintFillToolParameters = z.object({
  texture_id: textureIdOptionalSchema,
  x: z.number().describe("X coordinate to start fill."),
  y: z.number().describe("Y coordinate to start fill."),
  color: hexColorSchema.describe("Fill color as hex string."),
  opacity: opacitySchema.describe("Fill opacity (0-255)."),
  fill_mode: fillModeEnum
    .optional()
    .default("color_connected")
    .describe("Fill mode."),
  blend_mode: blendModeEnum.optional().describe("Fill blend mode."),
});

export const drawShapeToolParameters = z.object({
  texture_id: textureIdOptionalSchema,
  shape: drawShapeEnum.describe("Shape to draw. '_h' suffix means hollow."),
  start: coordinateSchema.extend({
    x: z.number().describe("Start X coordinate."),
    y: z.number().describe("Start Y coordinate."),
  }),
  end: coordinateSchema.extend({
    x: z.number().describe("End X coordinate."),
    y: z.number().describe("End Y coordinate."),
  }),
  color: hexColorSchema.describe("Shape color as hex string."),
  line_width: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .describe("Line width for hollow shapes."),
  opacity: opacitySchema.describe("Shape opacity (0-255)."),
  blend_mode: blendModeEnum.optional().describe("Shape blend mode."),
});

export const gradientToolParameters = z.object({
  texture_id: textureIdOptionalSchema,
  start: coordinateSchema.extend({
    x: z.number().describe("Gradient start X coordinate."),
    y: z.number().describe("Gradient start Y coordinate."),
  }),
  end: coordinateSchema.extend({
    x: z.number().describe("Gradient end X coordinate."),
    y: z.number().describe("Gradient end Y coordinate."),
  }),
  start_color: requiredHexColorSchema.describe("Start color as hex string."),
  end_color: requiredHexColorSchema.describe("End color as hex string."),
  opacity: opacitySchema.describe("Gradient opacity (0-255)."),
  blend_mode: blendModeEnum.optional().describe("Gradient blend mode."),
});

export const colorPickerToolParameters = z.object({
  texture_id: textureIdOptionalSchema,
  x: z.number().describe("X coordinate to pick color from."),
  y: z.number().describe("Y coordinate to pick color from."),
  set_as_secondary: z
    .boolean()
    .optional()
    .default(false)
    .describe("Set as secondary color instead of primary."),
  pick_opacity: z
    .boolean()
    .optional()
    .default(false)
    .describe("Also pick and apply the pixel's opacity."),
});

export const copyBrushToolParameters = z.object({
  texture_id: textureIdOptionalSchema,
  source: coordinateSchema.extend({
    x: z.number().describe("Source X coordinate to copy from."),
    y: z.number().describe("Source Y coordinate to copy from."),
  }),
  target: coordinateSchema.extend({
    x: z.number().describe("Target X coordinate to paste to."),
    y: z.number().describe("Target Y coordinate to paste to."),
  }),
  brush_size: brushSizeSchema.describe("Copy brush size."),
  opacity: opacitySchema.describe("Copy opacity (0-255)."),
  mode: copyBrushModeEnum.optional().default("copy").describe("Copy brush mode."),
});

export const eraserToolParameters = z.object({
  texture_id: textureIdOptionalSchema,
  coordinates: z
    .array(
      coordinateSchema.extend({
        x: z.number().describe("X coordinate to erase at."),
        y: z.number().describe("Y coordinate to erase at."),
      })
    )
    .describe("Array of coordinates to erase at."),
  brush_size: brushSizeSchema.describe("Eraser brush size."),
  opacity: opacitySchema.describe("Eraser opacity (0-255)."),
  softness: brushSoftnessSchema.describe("Eraser softness percentage."),
  shape: brushShapeEnum.optional().describe("Eraser shape."),
  connect_strokes: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether to connect erase strokes with lines."),
});

export const paintSettingsParameters = z.object({
  texture_preview: z.object({
    texture_id: z.string().min(1),
    filtering: z.enum(["nearest","linear"]).optional(),
    wrapping: z.enum(["clamp","repeat"]).optional(),
  }).strict().refine(value=>value.filtering!==undefined||value.wrapping!==undefined,"Specify filtering or wrapping.").optional().describe("Current texture GPU preview only; not pixel data, exported sampler state, or persistent plugin preferences."),
  palette: texturePaletteParameters.optional().describe("Generate a stepped hue-shifted palette; preview is default. Does not paint or grade texture art."),
  mirror_painting: z
    .object({
      enabled: z.boolean().describe("Enable mirror painting."),
      axis: z.array(axisEnum).optional().describe("Mirror axes."),
      texture: z.boolean().optional().describe("Enable texture mirroring."),
      texture_center: coordinateSchema
        .extend({
          x: z.number().describe("X coordinate of texture mirror center."),
          y: z.number().describe("Y coordinate of texture mirror center."),
        })
        .optional()
        .describe("Texture mirror center."),
    })
    .optional()
    .describe("Mirror painting settings."),
  lock_alpha: z
    .boolean()
    .optional()
    .describe("Lock alpha channel while painting."),
  pixel_perfect: z
    .boolean()
    .optional()
    .describe("Enable pixel perfect drawing."),
  paint_side_restrict: z
    .boolean()
    .optional()
    .describe("Restrict painting to current face side."),
  color_erase_mode: z
    .boolean()
    .optional()
    .describe("Enable color erase mode."),
  brush_opacity_modifier: brushModifierEnum
    .optional()
    .describe("Brush opacity modifier for stylus."),
  brush_size_modifier: brushModifierEnum
    .optional()
    .describe("Brush size modifier for stylus."),
  paint_with_stylus_only: z
    .boolean()
    .optional()
    .describe("Only allow painting with stylus input."),
  pick_color_opacity: z
    .boolean()
    .optional()
    .describe("Pick opacity when using color picker."),
  pick_combined_color: z
    .boolean()
    .optional()
    .describe("Pick combined layer colors."),
});


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


export const paintStateToolDocs: ToolSpec[] = [
  {
      name: "paint_settings",
      description: "Configures paint settings, hue-shifted palette or texture preview filtering/wrapping. Palette defaults to preview; append/replace updates native colors. Preview sampler changes are not exported game settings. Neither operation paints pixels.",
      annotations: {
        title: "Paint Settings",
        destructiveHint: true,
      },
      parameters: paintSettingsParameters,
      status: STATUS_EXPERIMENTAL,
    },
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

export function registerPaintStateTools(): void {
  createTool(
      paintStateToolDocs[0].name,
      {
        ...paintStateToolDocs[0],
        parameters: paintSettingsParameters,
        async execute({
          texture_preview,
          palette,
          mirror_painting,
          lock_alpha,
          pixel_perfect,
          paint_side_restrict,
          color_erase_mode,
          brush_opacity_modifier,
          brush_size_modifier,
          paint_with_stylus_only,
          pick_color_opacity,
          pick_combined_color,
        }) {
          const appliedSettings: string[] = [];
          const paletteResult = palette ? generateTexturePalette(palette) : undefined;
          const nativePalette = typeof ColorPanel === "undefined" ? undefined : (ColorPanel as unknown as {palette?: string[]}).palette;
          if (palette && palette.mode !== "preview" && !Array.isArray(nativePalette)) throw new Error("Native ColorPanel palette is unavailable.");
          const previewTexture = texture_preview ? resolveCoreTexture(texture_preview.texture_id) : undefined;
          const previewMap = previewTexture ? (previewTexture as unknown as {material?: {map?: THREE.Texture}}).material?.map : undefined;
          if (texture_preview && !previewMap) throw new Error("Texture preview material.map is unavailable; no sampler changed.");
          const three = (globalThis as unknown as {THREE?: typeof import("three")}).THREE;
          if (texture_preview && !three) throw new Error("Native THREE preview runtime is unavailable.");
          const previousSampler = previewMap ? {min_filter:previewMap.minFilter,mag_filter:previewMap.magFilter,wrap_s:previewMap.wrapS,wrap_t:previewMap.wrapT} : undefined;
          const requestedBlockbenchSettings = [
            ["paint_side_restrict", paint_side_restrict],
            ["brush_opacity_modifier", brush_opacity_modifier],
            ["brush_size_modifier", brush_size_modifier],
            ["paint_with_stylus_only", paint_with_stylus_only],
            ["pick_color_opacity", pick_color_opacity],
            ["pick_combined_color", pick_combined_color],
          ] as const;
  
          const nativeSettings = requestedBlockbenchSettings.flatMap(([id, value]) => {
            if (value === undefined) return [];
            const setting = typeof settings === "undefined" ? undefined : settings[id];
            if (!setting || typeof setting.set !== "function") throw new Error(`Blockbench setting "${id}" is unavailable.`);
            const previous = setting.value;
            if (!["boolean", "string", "number"].includes(typeof previous)) throw new Error(`Blockbench setting "${id}" cannot be safely snapshotted.`);
            return [{id, value, previous, setting}];
          });
  
          const hasMirrorOptions = mirror_painting && (mirror_painting.axis !== undefined || mirror_painting.texture !== undefined || mirror_painting.texture_center !== undefined);
          if (hasMirrorOptions && !mirror_painting.enabled) throw new Error("Mirror sub-options require mirror_painting.enabled.");
          if (hasMirrorOptions && !getRuntimePainter().mirror_painting_options) throw new Error("Native mirror options are unavailable.");
          // Native setters can mutate before throwing. Restore every attempted setter,
          // including the failing one; the control batch owns its own rollback.
          let attemptedSetting = -1;
          try {
            for (let i = 0; i < nativeSettings.length; i++) {
              attemptedSetting = i;
              const {setting, value} = nativeSettings[i];
              setting.set(value);
              if (setting.value !== value) throw new Error(`Blockbench setting "${nativeSettings[i].id}" did not apply.`);
            }
            setBarItemValues({
              ...(mirror_painting === undefined ? {} : {mirror_painting:mirror_painting.enabled}),
              ...(pixel_perfect === undefined ? {} : {pixel_perfect_drawing:pixel_perfect}),
              ...(color_erase_mode === undefined ? {} : {color_erase_mode}),
            });
          } catch (error) {
            const failures: string[] = [];
            for (let i = attemptedSetting; i >= 0; i--) {
              const {id, setting, previous} = nativeSettings[i];
              try {
                setting.set(previous);
                if (setting.value !== previous) throw new Error("Restore did not apply.");
              } catch { failures.push(id); }
            }
            if (failures.length) throw new Error(`Paint settings rollback failed: ${failures.join(", ")}. Inspect state before retrying. Cause: ${String(error)}`);
            throw error;
          }
          for (const {id, value} of nativeSettings) appliedSettings.push(`${id}: ${value}`);
          // Mirror painting
          if (mirror_painting !== undefined) {
  
  
            getRuntimePainter().mirror_painting = mirror_painting.enabled;
            appliedSettings.push(`Mirror painting: ${mirror_painting.enabled}`);
  
            if (
              mirror_painting.enabled &&
              (mirror_painting.axis ||
                mirror_painting.texture !== undefined ||
                mirror_painting.texture_center)
            ) {
              // @ts-ignore
              const options = getRuntimePainter().mirror_painting_options;
              if (mirror_painting.axis) {
                (["x", "y", "z"] as const).forEach((axis) => {
                  options[axis] = mirror_painting.axis!.includes(axis);
                });
              }
              if (mirror_painting.texture !== undefined) {
                options.texture = mirror_painting.texture;
              }
              if (mirror_painting.texture_center) {
                options.texture_center = [
                  mirror_painting.texture_center.x,
                  mirror_painting.texture_center.y,
                ];
              }
              appliedSettings.push(`Mirror options updated`);
            }
          }
  
          // Lock alpha
          if (lock_alpha !== undefined) {
            getRuntimePainter().lock_alpha = lock_alpha;
            appliedSettings.push(`Lock alpha: ${lock_alpha}`);
          }
  
          // Pixel perfect
          if (pixel_perfect !== undefined) {
  
            appliedSettings.push(`Pixel perfect: ${pixel_perfect}`);
          }
  
          // Color erase mode
          if (color_erase_mode !== undefined) {
  
            getRuntimePainter().erase_mode = color_erase_mode;
            appliedSettings.push(`Color erase mode: ${color_erase_mode}`);
          }
  
          if (texture_preview && previewMap && three) {
            if (texture_preview.filtering) {
              const filter=texture_preview.filtering==="nearest"?three.NearestFilter:three.LinearFilter;
              previewMap.minFilter=filter;previewMap.magFilter=filter;
            }
            if (texture_preview.wrapping) {
              const wrap=texture_preview.wrapping==="repeat"?three.RepeatWrapping:three.ClampToEdgeWrapping;
              previewMap.wrapS=wrap;previewMap.wrapT=wrap;
            }
            previewMap.needsUpdate=true;
          }
          const previewResult = texture_preview ? {texture_uuid:previewTexture!.uuid,...texture_preview,scope:"current_gpu_preview_only",previous:previousSampler} : undefined;
          if (palette && paletteResult) {
            if (palette.mode !== "preview") {
              const next = [...new Set([...(palette.mode === "append" ? nativePalette! : []), ...paletteResult.colors])];
              nativePalette!.splice(0, nativePalette!.length, ...next);
            }
            return {content:[{type:"text" as const,text:`Palette ${palette.mode}: ${paletteResult.colors.length} colors; ${appliedSettings.length} paint setting(s) updated.`}],structuredContent:{palette:{...paletteResult,mode:palette.mode},applied_settings:appliedSettings,texture_preview:previewResult}};
          }
          if (previewResult) return {content:[{type:"text" as const,text:"Updated texture preview sampler; texture pixels and exported game settings unchanged."}],structuredContent:{texture_preview:previewResult,applied_settings:appliedSettings}};
          return `Updated paint settings: ${appliedSettings.join(", ")}`;
        },
      },
      paintStateToolDocs[0].status
    );
  
    createTool(
      paintStateToolDocs[1].name,
      {
        ...paintStateToolDocs[1],
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
      paintStateToolDocs[1].status
    );
  
    createTool(
      paintStateToolDocs[2].name,
      {
        ...paintStateToolDocs[2],
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
      paintStateToolDocs[2].status
    );
}
