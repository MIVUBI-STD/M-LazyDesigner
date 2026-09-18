/// <reference types="blockbench-types" />

import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL } from "@/lib/constants";
import { runPaintStroke } from "@/lib/paintStroke";
import { getAndActivateTexture, setBarItemValues } from "@/lib/util";
import {
  blendModeEnum,
  brushSizeSchema,
  coordinateSchema,
  copyBrushModeEnum,
  drawShapeEnum,
  fillModeEnum,
  hexColorSchema,
  opacitySchema,
  requiredHexColorSchema,
  textureIdOptionalSchema,
} from "@/lib/zodObjects";
import {
  getRuntimePainter,
  normalizeTexturePixelRegion,
  requirePixelsWithinTexture,
  texturePixelRectToUvTag,
} from "./paint-shared";

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


export const paintPrimitiveToolDocs: ToolSpec[] = [
  {
      name: "paint_fill_tool",
      description: "Uses the fill/bucket tool to fill areas with color.",
      annotations: {
        title: "Paint Fill Tool",
        destructiveHint: true,
      },
      parameters: paintFillToolParameters,
      status: STATUS_EXPERIMENTAL,
    },
  {
      name: "draw_shape_tool",
      description: "Draws geometric shapes on textures.",
      annotations: {
        title: "Draw Shape Tool",
        destructiveHint: true,
      },
      parameters: drawShapeToolParameters,
      status: STATUS_EXPERIMENTAL,
    },
  {
      name: "gradient_tool",
      description: "Applies gradients to textures.",
      annotations: {
        title: "Gradient Tool",
        destructiveHint: true,
      },
      parameters: gradientToolParameters,
      status: STATUS_EXPERIMENTAL,
    },
  {
      name: "color_picker_tool",
      description:
        "Picks a color into the active color slot; pick_opacity also mutates brush opacity state.",
      annotations: {
        title: "Color Picker Tool",
      },
      parameters: colorPickerToolParameters,
      status: STATUS_EXPERIMENTAL,
    },
  {
      name: "copy_brush_tool",
      description: "Uses the copy/clone brush to copy texture areas.",
      annotations: {
        title: "Copy Brush Tool",
        destructiveHint: true,
      },
      parameters: copyBrushToolParameters,
      status: STATUS_EXPERIMENTAL,
    }
];

export function registerPaintPrimitiveTools(): void {
  createTool(
      paintPrimitiveToolDocs[0].name,
      {
        ...paintPrimitiveToolDocs[0],
        parameters: paintFillToolParameters,
        async execute({
          texture_id,
          x,
          y,
          color,
          opacity,
          fill_mode,
          blend_mode,
        }) {
          const texture = getAndActivateTexture(texture_id);
          requirePixelsWithinTexture(texture, [{ x, y }]);
  
          // Native sliders are scoped to the selected tool.
          // @ts-ignore
          BarItems.fill_tool.select();
          setBarItemValues({
            ...(opacity === undefined ? {} : {slider_brush_opacity:opacity}),
            ...(fill_mode === undefined ? {} : {fill_mode}),
            ...(blend_mode === undefined ? {} : {blend_mode}),
          });
          if (color) {
            ColorPanel.set(color, false, false);
          }
  
          // Perform fill
          runPaintStroke(() => {
            getRuntimePainter().startPaintTool(texture, x, y, {}, { shiftKey: false });
          });
          Canvas.updateAll();
  
          return `Filled area at (${x}, ${y}) on texture "${texture.name}"`;
        },
      },
      paintPrimitiveToolDocs[0].status
    );
  
    createTool(
      paintPrimitiveToolDocs[1].name,
      {
        ...paintPrimitiveToolDocs[1],
        parameters: drawShapeToolParameters,
        async execute({
          texture_id,
          shape,
          start,
          end,
          color,
          line_width,
          opacity,
          blend_mode,
        }) {
          const texture = getAndActivateTexture(texture_id);
          if (getRuntimePainter().mirror_painting) {
            throw new Error(
              "draw_shape_tool bounded region authoring requires mirror painting to be disabled so no mirrored write can escape the reported bounds."
            );
          }
          const region = normalizeTexturePixelRegion(
            start,
            end,
            texture.width,
            texture.display_height,
            "draw_shape_tool"
          );
          const uvTag = texturePixelRectToUvTag(
            region.rect,
            texture.width,
            texture.display_height,
            texture.getUVWidth(),
            texture.getUVHeight(),
            "draw_shape_tool"
          );
  
          // @ts-ignore
          BarItems.draw_shape_tool.select();
          setBarItemValues({draw_shape_type:shape,
            ...(opacity === undefined ? {} : {slider_brush_opacity:opacity}),
            ...(line_width === undefined ? {} : {slider_brush_size:line_width}),
            ...(blend_mode === undefined ? {} : {blend_mode}),
          });
          if (color) {
            ColorPanel.set(color, false, false);
          }
  
          // Pass the bounded UV tag through Blockbench's native Painter so the
          // requested pixel rectangle clips the shape instead of allowing bleed.
          runPaintStroke(() => {
            getRuntimePainter().startPaintTool(
              texture,
              start.x,
              start.y,
              uvTag,
              { shiftKey: false }
            );
            getRuntimePainter().useShapeTool(texture, end.x, end.y, {}, uvTag);
          });
          Canvas.updateAll();
  
          const result = {
            operation: "draw_shape",
            shape,
            texture: { uuid: texture.uuid, name: texture.name, id: texture.id },
            bounded: true,
            affected_rect: region.rect,
            affected_size: region.size,
          };
          return {
            content: [
              {
                type: "text" as const,
                text: `Drew ${shape} inside texture pixel bounds [${region.rect.join(", ")}] on "${texture.name}".`,
              },
            ],
            structuredContent: result,
          };
        },
      },
      paintPrimitiveToolDocs[1].status
    );
  
    createTool(
      paintPrimitiveToolDocs[2].name,
      {
        ...paintPrimitiveToolDocs[2],
        parameters: gradientToolParameters,
        async execute({
          texture_id,
          start,
          end,
          start_color,
          end_color,
          opacity,
          blend_mode,
        }) {
          const texture = getAndActivateTexture(texture_id);
          requirePixelsWithinTexture(texture, [start, end]);
  
          // @ts-ignore
          BarItems.gradient_tool.select();
          setBarItemValues({
            ...(opacity === undefined ? {} : {slider_brush_opacity:opacity}),
            ...(blend_mode === undefined ? {} : {blend_mode}),
          });
          ColorPanel.set(start_color, false, false);
          // @ts-ignore
          ColorPanel.set(end_color, true, false); // Set as secondary color
  
  
          // Apply gradient
          runPaintStroke(() => {
            getRuntimePainter().startPaintTool(texture, start.x, start.y, {}, { shiftKey: false });
            getRuntimePainter().useGradientTool(texture, end.x, end.y, {});
          });
          Canvas.updateAll();
  
          return `Applied gradient from (${start.x}, ${start.y}) to (${end.x}, ${end.y}) on texture "${texture.name}"`;
        },
      },
      paintPrimitiveToolDocs[2].status
    );
  
    createTool(
      paintPrimitiveToolDocs[3].name,
      {
        ...paintPrimitiveToolDocs[3],
        parameters: colorPickerToolParameters,
        async execute({ texture_id, x, y, set_as_secondary, pick_opacity }) {
          const texture = getAndActivateTexture(texture_id);
          requirePixelsWithinTexture(texture, [{ x, y }]);
  
          // Pick color
          getRuntimePainter().colorPicker(texture, x, y, { button: set_as_secondary ? 2 : 0 });
  
          // Get the picked color
          const color = ColorPanel.get(false);
  
          if (pick_opacity) {
            // Read the alpha byte directly from the active texture canvas.
            const pixel = texture.ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
            const opacity = pixel[3];
  
            // Apply opacity to brush tools
            for (let id in BarItems) {
              const tool = BarItems[id];
              // @ts-ignore
              if (tool.tool_settings && tool.tool_settings.brush_opacity >= 0) {
                // @ts-ignore
                tool.tool_settings.brush_opacity = opacity;
              }
            }
  
            return `Picked color ${color} with opacity ${opacity} from (${x}, ${y}) on texture "${texture.name}"`;
          }
  
          return `Picked color ${color} from (${x}, ${y}) on texture "${texture.name}"`;
        },
      },
      paintPrimitiveToolDocs[3].status
    );
  
    createTool(
      paintPrimitiveToolDocs[4].name,
      {
        ...paintPrimitiveToolDocs[4],
        parameters: copyBrushToolParameters,
        async execute({ texture_id, source, target, brush_size, opacity, mode }) {
          const texture = getAndActivateTexture(texture_id);
          requirePixelsWithinTexture(texture, [source, target]);
  
          // Select copy brush tool
          // @ts-ignore
          BarItems.copy_brush.select();
          setBarItemValues({
            ...(brush_size === undefined ? {} : {slider_brush_size:brush_size}),
            ...(opacity === undefined ? {} : {slider_brush_opacity:opacity}),
            ...(mode === undefined ? {} : {copy_brush_mode:mode}),
          });
  
          // Set source point (Ctrl+click equivalent)
          runPaintStroke(() => {
            getRuntimePainter().startPaintTool(texture, source.x, source.y, {}, {
              ctrlOrCmd: true,
            });
  
            // Apply at target point. The native Painter lifecycle owns Undo.
            getRuntimePainter().startPaintTool(texture, target.x, target.y, {}, { shiftKey: false });
          });
          Canvas.updateAll();
  
          return `Copied from (${source.x}, ${source.y}) to (${target.x}, ${target.y}) on texture "${texture.name}"`;
        },
      },
      paintPrimitiveToolDocs[4].status
    );
}
