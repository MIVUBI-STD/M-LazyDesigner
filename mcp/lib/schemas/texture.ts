import { z } from "zod";
import {
  coordinateSchema,
  hexColorSchema,
} from "./common";

export const blendModeEnum = z.enum([
  "default", "set_opacity", "color", "behind", "multiply", "add",
  "screen", "overlay", "difference",
]);
export const layerBlendModeEnum = z.enum([
  "normal", "multiply", "screen", "overlay", "soft_light", "hard_light",
  "color_dodge", "color_burn", "darken", "lighten", "difference", "exclusion",
]);
export const brushShapeEnum = z.enum(["square", "circle"]);
export const fillModeEnum = z.enum(["color", "color_connected", "face", "element", "selected_elements", "selection"]);
export const drawShapeEnum = z.enum(["rectangle", "rectangle_h", "ellipse", "ellipse_h"]);
export const copyBrushModeEnum = z.enum(["copy", "sample", "pattern"]);
export const brushModifierEnum = z.enum(["none", "pressure", "tilt"]);
export const pbrChannelEnum = z.enum(["color", "normal", "height", "mer"]);
export const renderModeEnum = z.enum(["default", "emissive", "additive", "layered"]);
export const renderSidesEnum = z.enum(["auto", "front", "double"]);

export const opacitySchema = z.number().min(0).max(255).optional().describe("Opacity (0-255).");
export const brushSizeSchema = z.number().min(1).max(100).optional().describe("Brush size.");
export const brushSoftnessSchema = z.number().min(0).max(100).optional().describe("Brush softness percentage.");

export const brushSettingsSchema = z.object({
  size: brushSizeSchema,
  opacity: opacitySchema,
  softness: brushSoftnessSchema,
  shape: brushShapeEnum.optional().describe("Brush shape."),
  color: hexColorSchema.describe("Brush color as hex string."),
  blend_mode: blendModeEnum.optional().describe("Brush blend mode."),
}).optional().describe("Brush settings to apply.");

export { coordinateSchema };
