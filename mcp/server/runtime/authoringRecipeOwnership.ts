/// <reference types="blockbench-types" />

export const RECIPE_ID_PROPERTY = "lazydesigner_recipe_id";
export const RECIPE_INSTANCE_ID_PROPERTY = "lazydesigner_recipe_instance_id";

export type AuthoringRecipeCubeOwnership = {
  recipe_id: string;
  instance_id: string;
};

type DeletableProperty = { delete(): void };

let recipeIdProperty: DeletableProperty | null = null;
let recipeInstanceProperty: DeletableProperty | null = null;

function validateIdentity(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string") throw new Error(label + " must be a string.");
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error(label + " is invalid.");
  }
  return normalized;
}

function staleCubeProperty(name: string): DeletableProperty | null {
  const ctor = Cube as typeof Cube & { properties?: Record<string, DeletableProperty> };
  return ctor.properties?.[name] ?? null;
}

export function registerAuthoringRecipeOwnershipProperties(): void {
  if (recipeIdProperty || recipeInstanceProperty) return;
  // A previous hot-reload generation may have registered the same private
  // property before this module state existed. Remove only our namespaced
  // owners, then recreate them under the current plugin generation.
  staleCubeProperty(RECIPE_ID_PROPERTY)?.delete();
  staleCubeProperty(RECIPE_INSTANCE_ID_PROPERTY)?.delete();
  recipeIdProperty = new Property(Cube, "string", RECIPE_ID_PROPERTY, {
    default: "",
    export: false,
  }) as unknown as DeletableProperty;
  recipeInstanceProperty = new Property(Cube, "string", RECIPE_INSTANCE_ID_PROPERTY, {
    default: "",
    export: false,
  }) as unknown as DeletableProperty;
}

export function unregisterAuthoringRecipeOwnershipProperties(): void {
  recipeInstanceProperty?.delete();
  recipeIdProperty?.delete();
  recipeInstanceProperty = null;
  recipeIdProperty = null;
}

export function readAuthoringRecipeCubeOwnership(
  cube: unknown
): AuthoringRecipeCubeOwnership | null {
  if (!cube || typeof cube !== "object" || Array.isArray(cube)) {
    throw new Error("Recipe ownership requires a Cube-like object.");
  }
  const record = cube as Record<string, unknown>;
  const rawRecipe = record[RECIPE_ID_PROPERTY];
  const rawInstance = record[RECIPE_INSTANCE_ID_PROPERTY];
  const recipeEmpty = rawRecipe === undefined || rawRecipe === null || rawRecipe === "";
  const instanceEmpty = rawInstance === undefined || rawInstance === null || rawInstance === "";
  if (recipeEmpty && instanceEmpty) return null;
  if (recipeEmpty !== instanceEmpty) {
    throw new Error("Recipe ownership is incomplete; recipe and instance identity must be authored together.");
  }
  return {
    recipe_id: validateIdentity(rawRecipe, "Recipe ownership recipe_id", 128),
    instance_id: validateIdentity(rawInstance, "Recipe ownership instance_id", 256),
  };
}

export function authoringRecipeOwnershipPatch(
  ownership: AuthoringRecipeCubeOwnership
): Record<string, string> {
  return {
    [RECIPE_ID_PROPERTY]: validateIdentity(ownership.recipe_id, "Recipe ownership recipe_id", 128),
    [RECIPE_INSTANCE_ID_PROPERTY]: validateIdentity(ownership.instance_id, "Recipe ownership instance_id", 256),
  };
}
