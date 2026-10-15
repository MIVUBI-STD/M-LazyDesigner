/**
 * Read-only, operation-scoped feature gates for native Blockbench APIs.
 *
 * Feature presence is not exact-version/native acceptance evidence. It only
 * determines whether one operation may execute safely on the active editor.
 * Keep any branch-specific Undo, state and postcondition checks at the owner.
 */

/** Blockbench 5.2 native IK source/pole links are stored on NullObject properties. */
export function supportsNativeIkControllerLinks(properties: unknown): boolean {
  return properties !== null && typeof properties === "object"
    && "ik_source" in properties && "ik_pole" in properties;
}

/** Native flatten preserves the editor's blend/alpha semantics. Never simulate
 * it by concatenating pixels if Blockbench changes/removes the method. */
export function supportsNativeTextureFlatten(texture: unknown): texture is { flatten(): void } {
  if (texture === null || (typeof texture !== "object" && typeof texture !== "function")) {
    return false;
  }
  return typeof (texture as { flatten?: unknown }).flatten === "function";
}
