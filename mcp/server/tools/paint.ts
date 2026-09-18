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
  paintSettingsToolDoc,
  registerPaintSettingsTool,
} from "./paint-settings";
export { paintSettingsParameters } from "./paint-settings";

import {
  paintSelectionLayerToolDocs,
  registerPaintSelectionLayerTools,
} from "./paint-selection-layers";
export {
  textureLayerManagementParameters,
  textureSelectionParameters,
} from "./paint-selection-layers";

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
  paintSettingsToolDoc,
  ...paintBrushToolDocs.slice(1),
  ...paintSelectionLayerToolDocs,
];

export function registerPaintTools(): void {
  registerPaintPrimitiveTools();
  registerPaintEraserTool();
  registerPaintSettingsTool();
  registerPaintBrushTools();
  registerPaintSelectionLayerTools();
}
