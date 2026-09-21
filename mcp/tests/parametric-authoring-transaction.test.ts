import { describe, expect, test } from "bun:test";
import type { AuthoringRecipe, CompiledCubePlacement } from "@/lib/authoringRecipe/contracts";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";
import { applyAuthoringRecipeIncrementalAtomic } from "@/lib/authoringRecipe/transaction";
import { fingerprintAuthoringRecipeNativeSnapshot, type AuthoringRecipeNativeSnapshot } from "@/lib/authoringRecipe/nativeState";

function recipe(spacing = 2, count = 4): AuthoringRecipe {
  return { schema: 1, compiler_version: 1, id: "fixture", name: "Fixture", prototypes: [{ id: "cube", name: "cube", size: [1,1,1] }], patterns: [{ kind: "LINEAR", id: "line", prototype_id: "cube", count, axis: "X", spacing }] };
}

function snapshotFromRecipe(value: AuthoringRecipe): AuthoringRecipeNativeSnapshot {
  return { schema: 1, recipe_id: value.id, cubes: compileAuthoringRecipe(value).placements.map((placement,index) => ({ uuid: "uuid-" + placement.id + "-" + index, recipe_id: value.id, instance_id: placement.id, name: placement.name, from: [...placement.from], to: [...placement.to], origin: [...placement.origin], rotation: [...placement.rotation], inflate: placement.inflate })) };
}

function fakeAdapter(initial: AuthoringRecipeNativeSnapshot) {
  let native = structuredClone(initial);
  let committed = false;
  let cancelled = false;
  return {
    adapter: {
      readOwned: () => structuredClone(native),
      beginUndo: (_ids: readonly string[]) => {},
      remove: (instanceId: string) => { native.cubes = native.cubes.filter((cube) => cube.instance_id !== instanceId); },
      upsert: (placement: CompiledCubePlacement, existingUuid: string | null, recipeId: string) => {
        const state = { uuid: existingUuid ?? "created-" + placement.id, recipe_id: recipeId, instance_id: placement.id, name: placement.name, from: [...placement.from] as [number,number,number], to: [...placement.to] as [number,number,number], origin: [...placement.origin] as [number,number,number], rotation: [...placement.rotation] as [number,number,number], inflate: placement.inflate };
        const index = native.cubes.findIndex((cube) => cube.instance_id === placement.id);
        if (index >= 0) native.cubes[index] = state; else native.cubes.push(state);
        return state.uuid;
      },
      restore: (snapshot: AuthoringRecipeNativeSnapshot) => { native = structuredClone(snapshot); },
      commitUndo: () => { committed = true; },
      cancelUndo: () => { cancelled = true; },
    },
    get state() { return native; },
    get committed() { return committed; },
    get cancelled() { return cancelled; },
  };
}

describe("Parametric authoring atomic affected-only transaction", () => {
  test("updates only changed instances and preserves UUID ownership", async () => {
    const previous = recipe(2,4);
    const next = recipe(3,4);
    const initial = snapshotFromRecipe(previous);
    const fake = fakeAdapter(initial);
    const receipt = await applyAuthoringRecipeIncrementalAtomic(previous,next,fingerprintAuthoringRecipeNativeSnapshot(initial),fake.adapter);
    expect(receipt.execution).toBe("applied");
    expect(receipt.updated_instance_ids).toEqual(["line:1","line:2","line:3"]);
    expect(receipt.created_instance_ids).toEqual([]);
    expect(receipt.preserved_instance_ids).toEqual(["line:0"]);
    expect(fake.committed).toBe(true);
    expect(fake.state.cubes.find((cube) => cube.instance_id === "line:2")?.uuid).toContain("uuid-line:2");
  });

  test("count increase creates only new instances; count reduction removes only deleted instances", async () => {
    const base = recipe(2,3);
    const larger = recipe(2,5);
    let fake = fakeAdapter(snapshotFromRecipe(base));
    let beforeFingerprint = fingerprintAuthoringRecipeNativeSnapshot(fake.state);
    const grow = await applyAuthoringRecipeIncrementalAtomic(base,larger,beforeFingerprint,fake.adapter);
    expect(grow.created_instance_ids).toEqual(["line:3","line:4"]);
    expect(grow.updated_instance_ids).toEqual([]);
    const grownState = structuredClone(fake.state);
    fake = fakeAdapter(grownState);
    beforeFingerprint = fingerprintAuthoringRecipeNativeSnapshot(grownState);
    const shrink = await applyAuthoringRecipeIncrementalAtomic(larger,base,beforeFingerprint,fake.adapter);
    expect(shrink.removed_instance_ids).toEqual(["line:3","line:4"]);
    expect(shrink.updated_instance_ids).toEqual([]);
  });

  test("stale or manually edited native state is rejected before Undo", async () => {
    const previous = recipe();
    const next = recipe(3);
    const initial = snapshotFromRecipe(previous);
    const fake = fakeAdapter(initial);
    const expected = fingerprintAuthoringRecipeNativeSnapshot(initial);
    fake.state.cubes[1].from = [99,0,0];
    let began = false;
    const adapter = { ...fake.adapter, beginUndo: () => { began = true; } };
    await expect(applyAuthoringRecipeIncrementalAtomic(previous,next,expected,adapter)).rejects.toThrow(/STALE_RECIPE_PLAN/);
    expect(began).toBe(false);
  });

  test("partial failure restores exact before-state and cancels transaction", async () => {
    const previous = recipe();
    const next = recipe(3);
    const initial = snapshotFromRecipe(previous);
    let native = structuredClone(initial);
    let cancelled = false;
    await expect(applyAuthoringRecipeIncrementalAtomic(previous,next,fingerprintAuthoringRecipeNativeSnapshot(initial),{
      readOwned: () => structuredClone(native),
      beginUndo: () => {},
      remove: () => {},
      upsert: (placement) => { native.cubes[0].from = [...placement.from]; throw new Error("fixture failure"); },
      restore: (snapshot) => { native = structuredClone(snapshot); },
      cancelUndo: () => { cancelled = true; },
    })).rejects.toThrow("fixture failure");
    expect(cancelled).toBe(true);
    expect(native).toEqual(initial);
  });

  test("semantic-only recipe change avoids Undo while invalidating dependent intelligence", async () => {
    const previous: AuthoringRecipe = {
      schema: 1,
      compiler_version: 1,
      id: "semantic",
      name: "Semantic",
      prototypes: [{
        id: "part",
        name: "part",
        size: [1,1,1],
        semantic_group: "BODY",
      }],
      patterns: [{
        kind: "LINEAR",
        id: "part",
        prototype_id: "part",
        count: 1,
        axis: "X",
        spacing: 0,
      }],
    };
    const next = structuredClone(previous);
    next.prototypes[0].semantic_group = "IDENTITY";
    const initial = snapshotFromRecipe(previous);
    let began = false;
    const fake = fakeAdapter(initial);
    const receipt = await applyAuthoringRecipeIncrementalAtomic(
      previous,
      next,
      fingerprintAuthoringRecipeNativeSnapshot(initial),
      {
        ...fake.adapter,
        beginUndo: () => { began = true; },
      }
    );
    expect(receipt.execution).toBe("metadata_only");
    expect(receipt.affected_count).toBe(0);
    expect(receipt.recipe_affected_count).toBe(1);
    expect(receipt.metadata_only_instance_ids).toEqual(["part:0"]);
    expect(receipt.invalidates).toEqual({
      geometry_structure: false,
      uv_mapping: true,
      texture_appearance: true,
      animation_motion: true,
    });
    expect(began).toBe(false);
  });

  test("no-op recipe update avoids Undo and all invalidation", async () => {
    const same = recipe();
    const initial = snapshotFromRecipe(same);
    let began = false;
    const fake = fakeAdapter(initial);
    const receipt = await applyAuthoringRecipeIncrementalAtomic(same,structuredClone(same),fingerprintAuthoringRecipeNativeSnapshot(initial),{ ...fake.adapter, beginUndo: () => { began = true; } });
    expect(receipt.execution).toBe("unchanged");
    expect(receipt.affected_count).toBe(0);
    expect(receipt.recipe_affected_count).toBe(0);
    expect(Object.values(receipt.invalidates).every((value) => value === false)).toBe(true);
    expect(began).toBe(false);
  });
});
