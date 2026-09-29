export const PAINT_TEXTURE_TRANSACTION_TOOL_NAME =
  "paint_texture_transaction" as const;

export type PaintTransactionV1Target = {
  texture_uuid: string;
  texture_name: string;
  layers_enabled: boolean;
};

/**
 * Exact bounded paint transaction v1 deliberately targets only the non-layered
 * base editable bitmap. A composited RGBA revision cannot safely identify which
 * native layer should receive a mutation, so layered artistic work stays with
 * Blockbench's existing Painter tools until a separate layer-aware contract is
 * explicitly designed and proved.
 */
export function requirePaintTransactionV1Target(
  target: PaintTransactionV1Target
): PaintTransactionV1Target {
  if (!target.texture_uuid.trim() || !target.texture_name.trim()) {
    throw new Error("Paint transaction v1 requires explicit texture identity.");
  }
  if (target.layers_enabled) {
    throw new Error(
      `Paint transaction v1 supports only a non-layered base editable bitmap; texture "${target.texture_name}" has layers enabled. Use native Painter tools for layered authoring.`
    );
  }
  return target;
}
