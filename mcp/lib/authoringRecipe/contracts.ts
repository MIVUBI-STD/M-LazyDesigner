export const AUTHORING_RECIPE_SCHEMA_VERSION = 1 as const;
export const AUTHORING_RECIPE_COMPILER_VERSION = 1 as const;

export type RecipeVec3 = [number, number, number];

export type RecipeCubePrototype = {
  id: string;
  name: string;
  size: RecipeVec3;
  origin?: RecipeVec3;
  rotation?: RecipeVec3;
  inflate?: number;
  semantic_group?: string;
};

export type RecipeInstance = {
  id: string;
  prototype_id: string;
  translation: RecipeVec3;
  rotation: RecipeVec3;
  scale: RecipeVec3;
  semantic_group?: string;
};

export type LinearPattern = {
  kind: "LINEAR";
  id: string;
  prototype_id: string;
  count: number;
  axis: "X" | "Y" | "Z";
  spacing: number;
  start?: RecipeVec3;
  semantic_group?: string;
};

export type GridPattern = {
  kind: "GRID";
  id: string;
  prototype_id: string;
  counts: [number, number];
  axes: ["X" | "Y" | "Z", "X" | "Y" | "Z"];
  spacing: [number, number];
  start?: RecipeVec3;
  semantic_group?: string;
};

export type RadialPattern = {
  kind: "RADIAL";
  id: string;
  prototype_id: string;
  count: number;
  axis: "X" | "Y" | "Z";
  radius: number;
  center?: RecipeVec3;
  rotate_with_pattern?: boolean;
  semantic_group?: string;
};

export type RecipePattern = LinearPattern | GridPattern | RadialPattern;

export type AuthoringRecipe = {
  schema: typeof AUTHORING_RECIPE_SCHEMA_VERSION;
  compiler_version: typeof AUTHORING_RECIPE_COMPILER_VERSION;
  id: string;
  name: string;
  prototypes: RecipeCubePrototype[];
  patterns: RecipePattern[];
};

export type CompiledCubePlacement = {
  id: string;
  name: string;
  prototype_id: string;
  from: RecipeVec3;
  to: RecipeVec3;
  origin: RecipeVec3;
  rotation: RecipeVec3;
  inflate: number;
  semantic_group?: string;
  source_pattern_id: string;
  instance_index: number;
};

export type AuthoringRecipeMetrics = {
  prototype_count: number;
  pattern_count: number;
  instance_count: number;
  realized_cube_count: number;
  unique_geometry_count: number;
  repeated_instance_count: number;
};

export type CompiledAuthoringRecipe = {
  schema: 1;
  compiler_version: number;
  recipe_id: string;
  placements: CompiledCubePlacement[];
  metrics: AuthoringRecipeMetrics;
};
