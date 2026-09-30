import { z } from "zod";

export const vector2Schema = z.array(z.number()).length(2).describe("2D vector [x, y].");
export const vector3Schema = z.array(z.number()).length(3).describe("3D vector [x, y, z].");
export const axisEnum = z.enum(["x", "y", "z"]);
export const axisWithAllEnum = axisEnum.or(z.literal("all"));
export const selectionActionEnum = z.enum(["select", "add", "remove", "toggle"]);
export const projectionEnum = z.enum(["unset", "orthographic", "perspective"]);

export const colorSchema = z.union([
  z.array(z.number().min(0).max(255)).length(4).describe("RGBA [R, G, B, A]"),
  z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/, "Hex color #RRGGBB or #RRGGBBAA"),
  z.string().regex(/^[a-z]{3,20}$/, "Named color (lowercase)"),
]);

export const hexColorPattern = /^#[A-Fa-f0-9]{6}(?:[A-Fa-f0-9]{2})?$/;
export const requiredHexColorSchema = z.string().regex(hexColorPattern, {
  message: "Hex color in #RRGGBB or #RRGGBBAA form.",
}).describe("Color as hex string (#RRGGBB or #RRGGBBAA, e.g., #FF0000).");
export const hexColorSchema = z.string().regex(hexColorPattern, {
  message: "Hex color in #RRGGBB or #RRGGBBAA form.",
}).optional().describe("Color as hex string (#RRGGBB or #RRGGBBAA, e.g., #FF0000).");

export const timeRangeSchema = z.object({
  start: z.number().describe("Start time in seconds."),
  end: z.number().describe("End time in seconds."),
});

export const coordinateSchema = z.object({
  x: z.number().describe("X coordinate."),
  y: z.number().describe("Y coordinate."),
});

export const mouseButtonEnum = z.enum(["left", "right"]);
export const size2dSchema = z.array(z.number()).length(2).describe("Size [width, height].");
