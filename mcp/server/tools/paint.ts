/// <reference types="blockbench-types" />

import type { ToolSpec } from "@/lib/factories";
import {
  paintPrimitiveToolDocs,
  registerPaintPrimitiveTools,
} from "./paint-primitives";
export {
  colorPickerToolParameters,
  copyBrushToolParameters,
  drawShapeToolParameters,
  gradientToolParameters,
  paintFillToolParameters,
} from "./paint-primitives";

import {
  paintBrushToolDocs,
  registerPaintBrushTools,
  registerPaintEraserTool,
} from "./paint-brush";
export {
  createBrushPresetParameters,
  eraserToolParameters,
  loadBrushPresetParameters,
  paintWithBrushParameters,
} from "./paint-brush";

import {
  paintStateToolDocs,
  registerPaintSettingsTool,
  registerPaintStateTools,
} from "./paint-state";
export {
  paintSettingsParameters,
  textureLayerManagementParameters,
  textureSelectionParameters,
} from "./paint-state";

export {
  exactPixelBounds,
  getRuntimePainter,
  isExactPixelAuthoringRequest,
  normalizeTexturePixelRegion,
  requirePaintCoordinates,
  requirePixelsWithinTexture,
  requireTextureCoordinatesWithinBounds,
  texturePixelRectToUvTag,
} from "./paint-shared";

export const paintToolDocs: ToolSpec[] = [
  ...paintPrimitiveToolDocs,
  paintBrushToolDocs[0],
  paintStateToolDocs[0],
  ...paintBrushToolDocs.slice(1),
  ...paintStateToolDocs.slice(1),
];

export function registerPaintTools(): void {
  registerPaintPrimitiveTools();
  registerPaintEraserTool();
  registerPaintSettingsTool();
  registerPaintBrushTools();
  registerPaintStateTools();
}
