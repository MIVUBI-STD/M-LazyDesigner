import { describe, expect, test } from "bun:test";
import { createProjectParameters } from "@/server/tools/project";
import { createAnimationParameters } from "@/server/tools/animation";
import {
  findElementsByCriteriaParameters,
  selectAllOfTypeParameters,
} from "@/server/tools/element";
import {
  addTextureGroupParameters,
  createPbrMaterialParameters,
  createTextureParameters,
} from "@/server/tools/texture";
import { readFile } from "node:fs/promises";
import {
  animationIdOptionalSchema,
  boneNameSchema,
  cubeIdOptionalSchema,
  cubeIdSchema,
  elementIdSchema,
  textureIdOptionalSchema,
  textureIdSchema,
} from "@/lib/zodObjects";
import {
  resolveTextureIdentity,
  resolveUuidOrUniqueName,
} from "@/lib/coreIdentity";

type Item = { uuid: string; name: string };
type TextureItem = Item & { id: string };

const options = {
  kind: "Cube",
  notFoundHint: "Inspect first.",
};

describe("P1.3 core identity ownership", () => {
  test("identity-bearing create tools reject empty names", () => {
    expect(createProjectParameters.safeParse({ name: "" }).success).toBe(false);
    expect(createTextureParameters.safeParse({ name: "" }).success).toBe(false);
    expect(addTextureGroupParameters.safeParse({ name: "" }).success).toBe(false);
    expect(createPbrMaterialParameters.safeParse({ name: "" }).success).toBe(false);
    expect(
      createAnimationParameters.safeParse({ name: "", bones: {} }).success
    ).toBe(false);
  });

  test("authored texture pixel dimensions are integer-valued", () => {
    expect(
      createTextureParameters.safeParse({ name: "skin", width: 16.5, height: 16 }).success
    ).toBe(false);
    expect(
      createTextureParameters.safeParse({ name: "skin", width: 16, height: 32.25 }).success
    ).toBe(false);
    expect(
      createTextureParameters.safeParse({ name: "skin", width: 16, height: 32 }).success
    ).toBe(true);
  });

  test("required explicit references reject the empty string", () => {
    for (const schema of [
      elementIdSchema,
      textureIdSchema,
      boneNameSchema,
      cubeIdSchema,
    ]) {
      expect(schema.safeParse("").success).toBe(false);
      expect(schema.safeParse("target").success).toBe(true);
    }
  });

  test("optional explicit Group scopes reject the empty string", () => {
    expect(findElementsByCriteriaParameters.safeParse({ parent_group: "" }).success).toBe(false);
    expect(findElementsByCriteriaParameters.safeParse({}).success).toBe(true);
    expect(
      selectAllOfTypeParameters.safeParse({ type: "cube", parent_group: "" }).success
    ).toBe(false);
    expect(selectAllOfTypeParameters.safeParse({ type: "cube" }).success).toBe(true);
  });

  test("optional explicit discovery name filters reject empty strings", () => {
    expect(findElementsByCriteriaParameters.safeParse({ name_pattern: "" }).success).toBe(false);
    expect(findElementsByCriteriaParameters.safeParse({ name_contains: "" }).success).toBe(false);
    expect(findElementsByCriteriaParameters.safeParse({ name_pattern: "arm.*" }).success).toBe(true);
    expect(findElementsByCriteriaParameters.safeParse({ name_contains: "arm" }).success).toBe(true);
    expect(findElementsByCriteriaParameters.safeParse({}).success).toBe(true);
  });

  test("discovery Cube size bounds are finite and ordered", () => {
    expect(
      findElementsByCriteriaParameters.safeParse({
        min_size: [0, 1, 2],
        max_size: [3, 4, 5],
      }).success
    ).toBe(true);
    expect(
      findElementsByCriteriaParameters.safeParse({ min_size: [0, Number.POSITIVE_INFINITY, 2] }).success
    ).toBe(false);
    expect(
      findElementsByCriteriaParameters.safeParse({
        min_size: [4, 1, 2],
        max_size: [3, 4, 5],
      }).success
    ).toBe(false);
    expect(findElementsByCriteriaParameters.safeParse({ min_size: [4, 1, 2] }).success).toBe(true);
  });

  test("optional identity fallbacks require omission rather than empty references", () => {
    for (const schema of [textureIdOptionalSchema, animationIdOptionalSchema, cubeIdOptionalSchema]) {
      expect(schema.safeParse("").success).toBe(false);
      expect(schema.safeParse(undefined).success).toBe(true);
      expect(schema.safeParse("target").success).toBe(true);
    }
    expect(
      createTextureParameters.safeParse({ name: "skin", fill_color: "#ffffff", layer_name: "" }).success
    ).toBe(false);
    expect(
      createTextureParameters.safeParse({ name: "skin", fill_color: "#ffffff", layer_name: "base" }).success
    ).toBe(true);
  });

  test("UUID wins before exact unique name and names never prefix-match", () => {
    const items: Item[] = [
      { uuid: "cube-1", name: "arm" },
      { uuid: "cube-2", name: "cube-1" },
      { uuid: "cube-3", name: "arm_long" },
    ];

    expect(resolveUuidOrUniqueName(items, "cube-1", options)).toEqual(items[0]);
    expect(resolveUuidOrUniqueName(items, "arm_long", options)).toEqual(items[2]);
    expect(() => resolveUuidOrUniqueName(items, "arm_", options)).toThrow(
      'Cube "arm_" not found.'
    );
  });

  test("ambiguous exact names fail instead of selecting the first item", () => {
    const items: Item[] = [
      { uuid: "a", name: "leg" },
      { uuid: "b", name: "leg" },
    ];

    expect(() => resolveUuidOrUniqueName(items, "leg", options)).toThrow(
      'Cube name "leg" is ambiguous.'
    );
  });

  test("texture identity is UUID then unique ID then unique name", () => {
    const textures: TextureItem[] = [
      { uuid: "tex-u1", id: "albedo", name: "Stone" },
      { uuid: "tex-u2", id: "normal", name: "Normal" },
      { uuid: "tex-u3", id: "tex-u1", name: "Other" },
    ];

    expect(resolveTextureIdentity(textures, "tex-u1", "List textures.")).toEqual(
      textures[0]
    );
    expect(resolveTextureIdentity(textures, "normal", "List textures.")).toEqual(
      textures[1]
    );
    expect(resolveTextureIdentity(textures, "Other", "List textures.")).toEqual(
      textures[2]
    );
  });

  test("ambiguous texture IDs and names fail deterministically", () => {
    const textures: TextureItem[] = [
      { uuid: "a", id: "shared", name: "Stone" },
      { uuid: "b", id: "shared", name: "Stone" },
    ];

    expect(() => resolveTextureIdentity(textures, "shared", "List textures.")).toThrow(
      'Texture ID "shared" is ambiguous.'
    );
    expect(() => resolveTextureIdentity(textures, "Stone", "List textures.")).toThrow(
      'Texture name "Stone" is ambiguous.'
    );
  });

  test("retained core callers consume shared identity ownership", async () => {
    const [cubes, elementShared, textureAssignment, textureCreate, textureRead, animationShared, materialInstances, util] = await Promise.all([
      readFile(new URL("../server/tools/cubes.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/tools/element-shared.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/tools/texture-assignment.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/tools/texture-create.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/tools/texture-read.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/tools/animation-shared.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/tools/material-instances.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/util.ts", import.meta.url), "utf8"),
    ]);

    expect(cubes).toContain("resolveCoreCube, resolveCoreGroup");
    expect(cubes).toContain("return resolveCoreGroup(");
    expect(cubes).not.toContain("resolveCoreTexture");
    expect(elementShared).toContain("resolveCoreGroup");
    expect(elementShared).toContain("resolveCoreTexture");
    expect(textureAssignment).toContain("resolveCoreTexture(");
    expect(textureCreate).toContain("resolveCoreTexture(");
    expect(textureRead).toContain("resolveCoreTexture(");
    expect(animationShared).toContain("resolveCoreAnimation");
    expect(animationShared).toContain("resolveCoreGroup");
    expect(materialInstances).toContain("return resolveCoreCube(");
    expect(materialInstances).not.toContain("findElementOrThrow");
    expect(util).toContain("const texture = resolveCoreTexture(");
    expect(util).not.toContain("export function findGroupOrThrow");
    expect(util).not.toContain("export function findElementOrThrow");
    expect(util).not.toContain("export function findTextureOrThrow");
  });

  test("identity-returning core mutations expose structured continuation state", async () => {
    const [cubes, hierarchy, mutation, elementShared, project] = await Promise.all([
      readFile(new URL("../server/tools/cubes.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/tools/element-hierarchy.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/tools/element-mutation.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/tools/element-shared.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/tools/project.ts", import.meta.url), "utf8"),
    ]);

    expect(cubes).toContain("structuredContent: result");
    expect(cubes).toContain("added: cubes.length");
    expect(cubes).toContain("before,");
    expect(cubes).toContain("after,");
    expect(cubes).toContain("geometry_effect: geometryEffect");
    expect(cubes).not.toContain("cube: after,");

    expect(hierarchy).toContain("structuredContent: result");
    expect(hierarchy).toContain("function groupContinuationState");
    expect(hierarchy).toContain("group: groupContinuationState(created[0])");
    expect(mutation).toContain("structuredContent: result");
    expect(elementShared).toContain("function elementContinuationState");
    expect(elementShared).toContain('if (element instanceof Locator) return "locator";');
    expect(elementShared).toContain('if (element instanceof NullObject) return "null_object";');

    const duplicateStart = mutation.indexOf("createTool(elementMutationToolDocs[1].name");
    const renameStart = mutation.indexOf("createTool(elementMutationToolDocs[2].name", duplicateStart);
    const duplicateBlock = mutation.slice(duplicateStart, renameStart);
    const renameBlock = mutation.slice(renameStart);
    for (const block of [duplicateBlock, renameBlock]) {
      expect(block).toContain("elementContinuationState");
      expect(block).toContain("structuredContent: result");
    }

    expect(project).toContain("structuredContent: result");
    expect(project).toContain("currentProjectLifecycle()");
    expect(project).toContain("export_path: Project.export_path ?? null");
    expect(project).toContain("export_codec: Project.export_codec ?? null");
    expect(project).toContain("saved: Project.saved === true");
  });
});
