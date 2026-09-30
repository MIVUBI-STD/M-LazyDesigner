import { describe, expect, test } from "bun:test";
import {
  cubeChangedFieldsFromResult,
  cubeGeometryEffect,
  cubeGeometryEffectSchema,
  cubeSemanticScopesFromChangedFields,
  cubeVisualScope,
  cubeVisualScopeFromResult,
} from "@/lib/receipts/cubeMutation";

describe("shared Cube mutation receipt contract", () => {
  test("accepts complete geometry effect and visual scope receipts", () => {
    const effect = cubeGeometryEffect({
      changed_fields: ["rotation"],
      center_delta: [0, 0, 0],
      size_delta: [0, 0, 0],
      origin_delta: [0, 0, 0],
      rotation_delta: [0, 45, 0],
      inflate_delta: 0,
      uv_offset_delta: [0, 0],
      mirror_uv_changed: false,
      autouv_changed: false,
      visibility_changed: false,
      faces_changed: false,
    });
    const scope = cubeVisualScope({
      cube_uuids: ["cube-a"],
      framing: {
        min: [-1, 0, -1],
        max: [1, 2, 1],
      },
    });

    expect(cubeGeometryEffectSchema.safeParse(effect).success).toBe(true);
    expect(cubeChangedFieldsFromResult({ geometry_effect: effect })).toEqual([
      "rotation",
    ]);
    expect(cubeVisualScopeFromResult({ visual_scope: scope })).toEqual(scope);
  });

  test("rejects malformed geometry vectors and empty visual target identity", () => {
    expect(
      cubeGeometryEffectSchema.safeParse({
        changed_fields: ["rotation"],
        center_delta: [0, 0],
        size_delta: [0, 0, 0],
        origin_delta: [0, 0, 0],
        rotation_delta: [0, 45, 0],
        inflate_delta: 0,
        uv_offset_delta: [0, 0],
        mirror_uv_changed: false,
        autouv_changed: false,
        visibility_changed: false,
        faces_changed: false,
      }).success
    ).toBe(false);

    expect(() =>
      cubeVisualScope({
        cube_uuids: [],
        framing: {
          min: [0, 0, 0],
          max: [1, 1, 1],
        },
      })
    ).toThrow();
  });

  test("changed fields map to bounded semantic scopes", () => {
    expect(cubeSemanticScopesFromChangedFields(["visibility"])).toEqual([
      "GEOMETRY_STRUCTURE",
    ]);
    expect(cubeSemanticScopesFromChangedFields(["rotation"])).toEqual([
      "GEOMETRY_STRUCTURE",
      "ANIMATION_MOTION",
    ]);
    expect(cubeSemanticScopesFromChangedFields(["uv_offset"]).sort()).toEqual([
      "GEOMETRY_STRUCTURE",
      "TEXTURE_APPEARANCE",
      "UV_MAPPING",
    ]);
    expect(cubeSemanticScopesFromChangedFields(["from"]).sort()).toEqual([
      "ANIMATION_MOTION",
      "GEOMETRY_STRUCTURE",
      "TEXTURE_APPEARANCE",
      "UV_MAPPING",
    ]);
  });

  test("Cube producer and Control consume the shared receipt owner", async () => {
    const producer = await Bun.file("server/tools/cubes.ts").text();
    const freshness = await Bun.file("gateway/control/delta/freshness.ts").text();
    const verification = await Bun.file("gateway/control/delta/verification.ts").text();

    expect(producer).toContain(
      'cubeGeometryEffect as validatedCubeGeometryEffect'
    );
    expect(producer).toContain(
      'cubeVisualScope as validatedCubeVisualScope'
    );
    expect(freshness).toContain("cubeChangedFieldsFromResult");
    expect(verification).toContain("cubeVisualScopeFromResult");
  });
});