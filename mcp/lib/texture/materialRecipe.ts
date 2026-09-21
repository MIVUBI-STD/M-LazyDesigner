import { renderProceduralTexture, type PaletteRgb, type ProceduralTextureRecipe, type Rgba } from "@/lib/texture/proceduralOps";

export type MaterialRecipeKind =
  | "PAINTED_METAL"
  | "BARE_METAL"
  | "WOOD"
  | "FABRIC"
  | "PLASTIC"
  | "STONE";

export type MaterialRecipe = {
  kind: MaterialRecipeKind;
  width: number;
  height: number;
  base: Rgba;
  palette?: readonly PaletteRgb[];
  variation?: number;
  directional_shading?: {
    axis: "x" | "y";
    to: Rgba;
    strength?: number;
  };
  dither?: boolean;
  seed?: number;
};

export function compileMaterialRecipe(recipe: MaterialRecipe): ProceduralTextureRecipe {
  if (!Number.isInteger(recipe.width) || recipe.width <= 0 || !Number.isInteger(recipe.height) || recipe.height <= 0) {
    throw new Error("Material recipe dimensions must be positive integers.");
  }
  const defaults: Record<MaterialRecipeKind, number> = {
    PAINTED_METAL: 8,
    BARE_METAL: 12,
    WOOD: 10,
    FABRIC: 6,
    PLASTIC: 4,
    STONE: 14,
  };
  return {
    width: recipe.width,
    height: recipe.height,
    base: recipe.base,
    ...(recipe.directional_shading ? {
      gradient: {
        axis: recipe.directional_shading.axis,
        to: recipe.directional_shading.to,
        strength: recipe.directional_shading.strength,
      },
    } : {}),
    noise: {
      seed: recipe.seed ?? 0,
      amount: recipe.variation ?? defaults[recipe.kind],
    },
    ...(recipe.palette ? { palette: recipe.palette } : {}),
    ...(recipe.dither ? { dither: "bayer4" as const } : {}),
  };
}

export function renderMaterialRecipe(recipe: MaterialRecipe): Uint8Array {
  return renderProceduralTexture(compileMaterialRecipe(recipe));
}
