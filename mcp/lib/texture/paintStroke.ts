/** Native Painter owns Undo; failed strokes must never pass its commit branch. */
export function runPaintStroke(stroke: () => void): void {
  const painter = Painter as unknown as BlockbenchRuntimePainter & {
    paint_stroke_canceled?: boolean;
    brushChanges: boolean;
    current: Record<string, unknown>;
    currentPixel: number[];
    editing_area?: unknown;
  };
  if (Undo.current_save) throw new Error("Finish the active Undo edit before painting.");
  try {
    stroke();
    if (painter.paint_stroke_canceled) throw new Error("Native Painter canceled the stroke.");
    painter.stopPaintTool();
    if (Undo.current_save) throw new Error("Native Painter did not finish the stroke.");
  } catch (error) {
    try {
      if (Undo.current_save) Undo.cancelEdit(true);
    } finally {
      // Canceled stop releases PointerTarget before returning, without onStrokeEnd/finishEdit.
      painter.paint_stroke_canceled = true;
      try {
        painter.stopPaintTool();
      } finally {
        delete painter.paint_stroke_canceled;
        painter.brushChanges = false;
        painter.current = {};
        painter.currentPixel = [-1, -1];
        delete painter.editing_area;
      }
    }
    throw error;
  }
}
