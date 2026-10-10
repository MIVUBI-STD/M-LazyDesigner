import { afterEach, describe, expect, test } from "bun:test";
import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";
import {
  emptyAuthoringRecipeStore,
  serializeAuthoringRecipeStore,
  upsertAuthoringRecipeStore,
} from "@/lib/authoringRecipe/store";
import { readRecipePartCaptureScope } from "@/server/runtime/recipes/authoring/service";

const runtime = globalThis as unknown as {
  Project: unknown;
  Cube: unknown;
};
const previousProject = runtime.Project;
const previousCube = runtime.Cube;

function recipe(): AuthoringRecipe {
  return {
    schema: 1, compiler_version: 1,
    id: "reference-seats", name: "Reference Seats",
    prototypes: [{
      id: "seat", name: "Seat", size: [3, 1, 3], semantic_group: "seat",
    }],
    patterns: [{
      kind: "LINEAR", id: "seats", prototype_id: "seat",
      count: 2, axis: "X", spacing: 3, semantic_group: "seat",
    }],
  };
}

function setNativeScene() {
  const source = recipe();
  const cubes = compileAuthoringRecipe(source).placements.map((placement, index) => ({
    uuid: "native-cube-" + index,
    name: placement.name,
    from: [...placement.from], to: [...placement.to],
    origin: [...placement.origin], rotation: [...placement.rotation],
    inflate: placement.inflate,
    lazydesigner_recipe_id: source.id,
    lazydesigner_recipe_instance_id: placement.id,
  }));
  const serialized = serializeAuthoringRecipeStore(
    upsertAuthoringRecipeStore(emptyAuthoringRecipeStore(), source)
  );
  runtime.Project = {
    uuid: "editor-project-1",
    lazydesigner_authoring_recipe_store: serialized,
  };
  runtime.Cube = { all: cubes };
  return { source, cubes };
}

afterEach(() => {
  runtime.Project = previousProject;
  runtime.Cube = previousCube;
});

describe("current recipe-owned part evidence uses one native identity owner", () => {
  test("resolves exact native Cube UUIDs to independently compiled instance IDs", () => {
    const { source } = setNativeScene();
    const result = readRecipePartCaptureScope(source.id, ["native-cube-0", "native-cube-1"]);
    expect(result.project_uuid).toBe("editor-project-1");
    expect(result.recipe_id).toBe("reference-seats");
    expect(result.native_scope).toBe("RECIPE_OWNED_CUBES_ONLY");
    expect(result.requested_count).toBe(2);
    expect(result.verified_count).toBe(2);
    expect(result.native_snapshot_fingerprint).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.identities.identities.map((item) => ({
      native_uuid: item.native_uuid, instance_id: item.instance_id,
    }))).toEqual([
      { native_uuid: "native-cube-0", instance_id: "seats:0" },
      { native_uuid: "native-cube-1", instance_id: "seats:1" },
    ]);
  });

  test("unknown native UUIDs are not invented or mistaken for missing geometry", () => {
    const { source } = setNativeScene();
    const subset = readRecipePartCaptureScope(source.id, ["native-cube-0", "foreign-cube"]);
    expect(subset.verified_count).toBe(1);
    expect(subset.identities.identities.map((item) => item.native_uuid))
      .toEqual(["native-cube-0"]);
    const none = readRecipePartCaptureScope(source.id, []);
    expect(none.verified_count).toBe(0);
    expect(none.identities.count).toBe(0);
  });

  test("stale native geometry and missing persisted recipe fail before image capture", () => {
    const { source, cubes } = setNativeScene();
    cubes[0]!.from[0] += 1;
    expect(() => readRecipePartCaptureScope(source.id, ["native-cube-0"]))
      .toThrow("RECIPE_NATIVE_STATE_MISMATCH");
    setNativeScene();
    runtime.Project = { uuid: "editor-project-1" };
    expect(() => readRecipePartCaptureScope(source.id, ["native-cube-0"]))
      .toThrow("PART_CORRESPONDENCE_RECIPE_NOT_STORED");
  });
});
