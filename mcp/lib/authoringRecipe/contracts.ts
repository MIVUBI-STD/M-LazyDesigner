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

export type RecipeAnchorPosition = "MIN" | "CENTER" | "MAX";

export type RecipeAnchorConstraint = {
  kind: "ANCHOR";
  id: string;
  source_instance_id: string;
  target_instance_id: string;
  axes: Array<"X" | "Y" | "Z">;
  source_anchor: [
    RecipeAnchorPosition,
    RecipeAnchorPosition,
    RecipeAnchorPosition
  ];
  target_anchor: [
    RecipeAnchorPosition,
    RecipeAnchorPosition,
    RecipeAnchorPosition
  ];
  offset?: RecipeVec3;
};

export type RecipeConstraint = RecipeAnchorConstraint;

export type RecipeSymmetryRelation = {
  id: string;
  source_instance_id: string;
  target_instance_id: string;
  plane: {
    axis: "X" | "Y" | "Z";
    position: number;
  };
  semantic_pair?: {
    source: string;
    target: string;
  };
  uv_policy: "SHARE" | "UNIQUE";
  texture_policy: "MIRROR" | "UNIQUE";
  rig_policy: "MIRROR" | "INDEPENDENT";
};

export type CompiledSymmetryRelationship = {
  id: string;
  source_instance_id: string;
  target_instance_id: string;
  plane: RecipeSymmetryRelation["plane"];
  uv_policy: RecipeSymmetryRelation["uv_policy"];
  texture_policy: RecipeSymmetryRelation["texture_policy"];
  rig_policy: RecipeSymmetryRelation["rig_policy"];
  semantic_pair?: RecipeSymmetryRelation["semantic_pair"];
};

export type AuthoringRecipe = {
  schema: typeof AUTHORING_RECIPE_SCHEMA_VERSION;
  compiler_version: typeof AUTHORING_RECIPE_COMPILER_VERSION;
  id: string;
  name: string;
  prototypes: RecipeCubePrototype[];
  patterns: RecipePattern[];
  constraints?: RecipeConstraint[];
  symmetry?: RecipeSymmetryRelation[];
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
  symmetry_generated_count: number;
};

export type CompiledAuthoringRecipe = {
  schema: 1;
  compiler_version: number;
  recipe_id: string;
  placements: CompiledCubePlacement[];
  symmetry_relationships: CompiledSymmetryRelationship[];
  metrics: AuthoringRecipeMetrics;
};
