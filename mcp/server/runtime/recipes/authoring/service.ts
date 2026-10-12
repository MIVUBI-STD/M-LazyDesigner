/// <reference types="blockbench-types" />

import { createHash } from "node:crypto";
import { createAuthoringRecipeService } from "@/lib/authoringRecipe/service";
import {
  assertAuthoringRecipeNativeMatchesCompiled,
  fingerprintAuthoringRecipeNativeSnapshot,
} from "@/lib/authoringRecipe/nativeState";
import { resolveSemanticIdentity } from "@/lib/authoringRecipe/semanticIdentity";
import {
  findAuthoringRecipeInStore,
  parseAuthoringRecipeStore,
} from "@/lib/authoringRecipe/store";
import { readBlockbenchAuthoringRecipeOwnedState, createBlockbenchAuthoringRecipeApplyAdapter } from "./runtime";
import {
  readAuthoringRecipeStoreProperty,
} from "./ownership";

export function createBlockbenchAuthoringRecipeService() {
  return createAuthoringRecipeService({
    readOwned: readBlockbenchAuthoringRecipeOwnedState,
    readStoredRecipe: (recipeId) => {
      if (!Project) {
        throw new Error(
          "Stored recipe planning requires an open Blockbench project."
        );
      }
      const store = parseAuthoringRecipeStore(
        readAuthoringRecipeStoreProperty(Project)
      );
      return findAuthoringRecipeInStore(store, recipeId);
    },
    createApplyAdapter: createBlockbenchAuthoringRecipeApplyAdapter,
  });
}

/**
 * Canonical native evidence for opt-in recipe-owned correspondence captures.
 * The caller supplies exact UUIDs, never element names or inferred part IDs.
 * This reads native-owned state and saved recipe from the same current project.
 * It does not store evidence or promise that unrelated model/texture geometry
 * is unchanged.
 */

/**
 * Opt-in capture-only evidence identity. Do not alter the recipe source
 * fingerprint: native Undo uses it independently of visual capture.
 */
function captureDependencyFingerprint(ownedUuids: ReadonlySet<string>): string {
  // A reference view can include geometry outside the saved recipe.
  // Authoring/Undo remains recipe-scoped; visual capture must see the Cube scene.
  const scene = Cube.all ?? [];
  if (typeof Mesh !== "undefined" && Mesh.all?.length) {
    throw new Error("PART_CORRESPONDENCE_NON_CUBE_SCENE_UNSUPPORTED");
  }
  const cubeIds = new Set(scene.map((cube) => cube.uuid));
  if (cubeIds.size !== scene.length || [...ownedUuids].some((id) => !cubeIds.has(id))) {
    throw new Error("PART_CORRESPONDENCE_NATIVE_TARGET_SCOPE_CHANGED");
  }
  const finiteVec = (value: unknown): value is number[] =>
    Array.isArray(value) && value.length === 3 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n));
  const scoped = scene.map((cube) => {
      const groups: unknown[] = [];
      const visited = new Set<object>();
      let parent: unknown = cube.parent;
      while (parent != null && parent !== "root") {
        if (typeof parent !== "object" || visited.has(parent)) {
          throw new Error("PART_CORRESPONDENCE_PARENT_HIERARCHY_INVALID");
        }
        visited.add(parent);
        const group = parent as { uuid?: unknown; origin?: unknown;
          rotation?: unknown; parent?: unknown; visibility?: boolean; export?: boolean };
        if (typeof group.uuid !== "string" || !group.uuid ||
            !finiteVec(group.origin) || !finiteVec(group.rotation)) {
          throw new Error("PART_CORRESPONDENCE_PARENT_HIERARCHY_INVALID");
        }
        groups.push({
          uuid: group.uuid, origin: [...group.origin], rotation: [...group.rotation],
          visibility: group.visibility !== false, export: group.export !== false,
        });
        parent = group.parent;
      }
      if (!cube.uuid || !finiteVec(cube.from) || !finiteVec(cube.to) ||
          !finiteVec(cube.origin) || !finiteVec(cube.rotation) ||
          !Number.isFinite(cube.inflate ?? 0)) {
        throw new Error("PART_CORRESPONDENCE_SCENE_GEOMETRY_INVALID");
      }
      const faces = Object.entries(cube.faces ?? {})
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([id, face]) => ({
          id, uv: face.uv ? [...face.uv] : null,
          rotation: face.rotation ?? 0, texture: face.texture ?? null,
          enabled: face.enabled !== false,
        }));
      return {
        uuid: cube.uuid, name: cube.name,
        from: [...cube.from], to: [...cube.to], origin: [...cube.origin],
        rotation: [...cube.rotation], inflate: cube.inflate ?? 0,
        recipe_owned: ownedUuids.has(cube.uuid),
        groups, faces, visibility: cube.visibility !== false,
        export: cube.export !== false, box_uv: cube.box_uv ?? null,
        autouv: cube.autouv ?? null,
        uv_offset: cube.uv_offset ? [...cube.uv_offset] : null,
        mirror_uv: cube.mirror_uv ?? null,
      };
    }).sort((l, r) => l.uuid.localeCompare(r.uuid));
  const textures = (Project.textures ?? Texture.all) as Texture[];
  const bitmaps = textures.map((texture) => {
    if (!texture.uuid || typeof texture.getDataURL !== "function") {
      throw new Error("PART_CORRESPONDENCE_TEXTURE_UNREADABLE");
    }
    const url = texture.getDataURL();
    if (typeof url !== "string" ||
        !/^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+$/i.test(url)) {
      throw new Error("PART_CORRESPONDENCE_TEXTURE_UNREADABLE");
    }
    const bytes = Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
    if (!bytes.length) throw new Error("PART_CORRESPONDENCE_TEXTURE_UNREADABLE");
    return { uuid: texture.uuid, width: texture.width, height: texture.height,
      sha256: createHash("sha256").update(bytes).digest("hex") };
  }).sort((l, r) => l.uuid.localeCompare(r.uuid));
  if (new Set(bitmaps.map((x) => x.uuid)).size !== bitmaps.length) {
    throw new Error("PART_CORRESPONDENCE_TEXTURE_IDENTITY_AMBIGUOUS");
  }
  return "sha256:" + createHash("sha256").update(JSON.stringify({
    all_native_cubes: scoped, bitmaps,
    logical_uv: [Project.texture_width ?? null, Project.texture_height ?? null],
    view_mode: Project.view_mode ?? null,
  })).digest("hex");
}

export function readRecipePartCaptureScope(
  recipeId: string,
  requestedCubeUuids: readonly string[]
) {
  if (!Project || !Project.uuid) {
    throw new Error("PART_CORRESPONDENCE_PROJECT_REQUIRED");
  }
  if (!recipeId.trim() ||
      requestedCubeUuids.length > 64 ||
      new Set(requestedCubeUuids).size !== requestedCubeUuids.length) {
    throw new Error("PART_CORRESPONDENCE_TARGET_SCOPE_INVALID");
  }
  const projectUuid = Project.uuid;
  const store = parseAuthoringRecipeStore(
    readAuthoringRecipeStoreProperty(Project)
  );
  const recipe = findAuthoringRecipeInStore(store, recipeId);
  if (!recipe) {
    throw new Error("PART_CORRESPONDENCE_RECIPE_NOT_STORED: only saved recipe-owned Cubes can be attested.");
  }
  const native = readBlockbenchAuthoringRecipeOwnedState(recipeId);
  assertAuthoringRecipeNativeMatchesCompiled(native, recipe);
  const requested = new Set(requestedCubeUuids);
  const matched = native.cubes.filter((cube) => requested.has(cube.uuid));
  const resolution = matched.length
    ? resolveSemanticIdentity(recipe, native, {
        instance_ids: matched.map((cube) => cube.instance_id),
      })
    : {
        recipe_id: recipeId,
        selected_by: "INSTANCE_IDS" as const,
        count: 0,
        identities: [],
      };
  return {
    project_uuid: projectUuid,
    recipe_id: recipeId,
    native_snapshot_fingerprint: fingerprintAuthoringRecipeNativeSnapshot(native),
    capture_dependency_fingerprint: captureDependencyFingerprint(
      new Set(native.cubes.map((cube) => cube.uuid))
    ),
    identities: resolution,
    native_scope: "RECIPE_OWNED_CUBES_ONLY" as const,
    requested_count: requestedCubeUuids.length,
    verified_count: matched.length,
  };
}
