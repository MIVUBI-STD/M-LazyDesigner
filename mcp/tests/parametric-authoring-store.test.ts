import { describe, expect, test } from "bun:test";
import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import {
  emptyAuthoringRecipeStore, findAuthoringRecipeInStore, fingerprintAuthoringRecipeStore, parseAuthoringRecipeStore, removeAuthoringRecipeFromStore, serializeAuthoringRecipeStore, upsertAuthoringRecipeStore,
} from "@/lib/authoringRecipe/store";
import { PROJECT_RECIPE_STORE_PROPERTY, authoringRecipeStorePropertyPatch, readAuthoringRecipeStoreProperty } from "@/server/runtime/authoringRecipeOwnership";

function recipe(id: string, count = 3): AuthoringRecipe {
  return { schema: 1, compiler_version: 1, id, name: id, prototypes: [{ id: "cube", name: "cube", size: [1,1,1] }], patterns: [{ kind: "LINEAR", id: "line", prototype_id: "cube", count, axis: "X", spacing: 2 }] };
}

describe("Parametric recipe project store", () => {
  test("store is deterministic, versioned and round-trips compact recipe source", () => {
    let store = emptyAuthoringRecipeStore();
    store = upsertAuthoringRecipeStore(store,recipe("b"));
    store = upsertAuthoringRecipeStore(store,recipe("a"));
    const serialized = serializeAuthoringRecipeStore(store);
    expect(parseAuthoringRecipeStore(serialized).recipes.map((item) => item.id)).toEqual(["a","b"]);
    expect(fingerprintAuthoringRecipeStore(parseAuthoringRecipeStore(serialized))).toBe(fingerprintAuthoringRecipeStore(store));
    expect(findAuthoringRecipeInStore(store,"a")?.patterns[0]).toMatchObject({ count: 3 });
  });

  test("upsert replaces one recipe without retaining revision history and removal is bounded", () => {
    let store = upsertAuthoringRecipeStore(emptyAuthoringRecipeStore(),recipe("asset",3));
    store = upsertAuthoringRecipeStore(store,recipe("asset",5));
    expect(store.recipes).toHaveLength(1);
    expect(findAuthoringRecipeInStore(store,"asset")?.patterns[0]).toMatchObject({ count: 5 });
    store = removeAuthoringRecipeFromStore(store,"asset");
    expect(store.recipes).toEqual([]);
  });

  test("malformed or oversized stores fail closed", () => {
    expect(() => parseAuthoringRecipeStore("{bad")).toThrow(/invalid JSON/);
    expect(() => parseAuthoringRecipeStore("x".repeat(262145))).toThrow(/bounded serialized size/);
  });

  test("project property patch is private persistence data, not a second tool surface", () => {
    const serialized = serializeAuthoringRecipeStore(upsertAuthoringRecipeStore(emptyAuthoringRecipeStore(),recipe("asset")));
    const patch = authoringRecipeStorePropertyPatch(serialized);
    expect(patch).toEqual({ [PROJECT_RECIPE_STORE_PROPERTY]: serialized });
    expect(readAuthoringRecipeStoreProperty(patch)).toBe(serialized);
  });
});
