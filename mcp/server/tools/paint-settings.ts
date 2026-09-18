/// <reference types="blockbench-types" />

import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL } from "@/lib/constants";
import { setBarItemValues } from "@/lib/util";
import { generateTexturePalette, texturePaletteParameters } from "@/lib/texturePalette";
import { resolveCoreTexture } from "@/lib/coreIdentity";
import { axisEnum, brushModifierEnum, coordinateSchema } from "@/lib/zodObjects";
import { getRuntimePainter } from "./paint-shared";

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


export const paintSettingsToolDoc: ToolSpec = {
      name: "paint_settings",
      description: "Configures paint settings, hue-shifted palette or texture preview filtering/wrapping. Palette defaults to preview; append/replace updates native colors. Preview sampler changes are not exported game settings. Neither operation paints pixels.",
      annotations: {
        title: "Paint Settings",
        destructiveHint: true,
      },
      parameters: paintSettingsParameters,
      status: STATUS_EXPERIMENTAL,
    };

export function registerPaintSettingsTool(): void {
  createTool(
          paintSettingsToolDoc.name,
          {
            ...paintSettingsToolDoc,
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
          paintSettingsToolDoc.status
        );
  }
  
  export function registerPaintStateTools(): void {
}
