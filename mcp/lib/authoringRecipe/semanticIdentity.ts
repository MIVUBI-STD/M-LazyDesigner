import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";
import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import type { AuthoringRecipeNativeSnapshot } from "@/lib/authoringRecipe/nativeState";
import { assertAuthoringRecipeNativeMatchesCompiled } from "@/lib/authoringRecipe/nativeState";
import type { SemanticGeometryTarget } from "@/lib/authoringRecipe/semanticEdit";

export type CompactSemanticIdentity = {
  instance_id: string;
  native_uuid: string;
  prototype_id: string;
  semantic_group?: string;
  source_pattern_id: string;
  instance_index: number;
};

export type SemanticIdentityResolution = {
  recipe_id: string;
  selected_by: "INSTANCE_IDS" | "PROTOTYPE_ID" | "SEMANTIC_GROUP";
  count: number;
  identities: CompactSemanticIdentity[];
};

const MAX_IDENTITY_RESULTS = 64;

function selector(target: SemanticGeometryTarget): SemanticIdentityResolution["selected_by"] {
  const active = [
    target.instance_ids && target.instance_ids.length > 0 ? "INSTANCE_IDS" : null,
    target.prototype_id ? "PROTOTYPE_ID" : null,
    target.semantic_group ? "SEMANTIC_GROUP" : null,
  ].filter(Boolean) as SemanticIdentityResolution["selected_by"][];

  if (active.length !== 1) {
    throw new Error("Semantic identity resolution requires exactly one target selector.");
  }
  return active[0];
}

export function resolveSemanticIdentity(
  recipe: AuthoringRecipe,
  native: AuthoringRecipeNativeSnapshot,
  target: SemanticGeometryTarget
): SemanticIdentityResolution {
  assertAuthoringRecipeNativeMatchesCompiled(native, recipe);
  const selectedBy = selector(target);
  const compiled = compileAuthoringRecipe(recipe);
  const nativeByInstance = new Map(native.cubes.map((cube) => [cube.instance_id, cube]));

  let placements = compiled.placements;
  if (selectedBy === "INSTANCE_IDS") {
    const ids = new Set(target.instance_ids);
    placements = placements.filter((placement) => ids.has(placement.id));
    if (placements.length !== ids.size) {
      throw new Error("Semantic identity resolution references missing owned instances.");
    }
  } else if (selectedBy === "PROTOTYPE_ID") {
    placements = placements.filter((placement) => placement.prototype_id === target.prototype_id);
  } else {
    placements = placements.filter((placement) => placement.semantic_group === target.semantic_group);
  }

  if (placements.length === 0) {
    throw new Error("Semantic identity resolution matched no owned instances.");
  }
  if (placements.length > MAX_IDENTITY_RESULTS) {
    throw new Error(
      `Semantic identity resolution exceeds the ${MAX_IDENTITY_RESULTS}-result budget; narrow the semantic target.`
    );
  }

  const identities = placements
    .map((placement): CompactSemanticIdentity => {
      const owned = nativeByInstance.get(placement.id);
      if (!owned) {
        throw new Error("Semantic identity resolution lost native ownership for " + placement.id + ".");
      }
      return {
        instance_id: placement.id,
        native_uuid: owned.uuid,
        prototype_id: placement.prototype_id,
        semantic_group: placement.semantic_group,
        source_pattern_id: placement.source_pattern_id,
        instance_index: placement.instance_index,
      };
    })
    .sort((a, b) => a.instance_id.localeCompare(b.instance_id));

  return {
    recipe_id: recipe.id,
    selected_by: selectedBy,
    count: identities.length,
    identities,
  };
}
