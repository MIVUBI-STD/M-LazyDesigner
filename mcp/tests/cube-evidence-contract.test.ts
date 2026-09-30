import { describe, expect, test } from "bun:test";
import {
  cubeChangedFieldsFromResult,
  cubeGeometryEffect,
  cubeVisualScope,
  cubeVisualScopeFromResult,
  cubeSemanticScopesFromChangedFields,
} from "@/lib/receipts/cubeMutation";

describe("shared Cube mutation evidence contract", () => {
  test("accepts geometry effect and bounded visual framing evidence", () => {
    const effect = cubeGeometryEffect({
      changed_fields: ["rotation", "faces"],
      center_delta: [0, 0, 0],
      size_delta: [0, 0, 0],
      origin_delta: [0, 0, 0],
      rotation_delta: [0, 45, 0],
      inflate_delta: 0,
      uv_offset_delta: [0, 0],
      mirror_uv_changed: false,
      autouv_changed: false,
      visibility_changed: false,
      faces_changed: true,
    });
    expect(effect.changed_fields).toEqual(["rotation", "faces"]);

    const scope = cubeVisualScope({
      cube_uuids: ["cube-a"],
      framing: {
        min: [-1, 0, -1],
        max: [1, 2, 1],
      },
    });
    expect(cubeVisualScopeFromResult({ visual_scope: scope })).toEqual(scope);
  });

  test("extracts changed fields from single and batch Cube receipts", () => {
    const effect = {
      changed_fields: ["from"],
      center_delta: [1, 0, 0],
      size_delta: [2, 0, 0],
      origin_delta: [0, 0, 0],
      rotation_delta: [0, 0, 0],
      inflate_delta: 0,
      uv_offset_delta: [0, 0],
      mirror_uv_changed: false,
      autouv_changed: false,
      visibility_changed: false,
      faces_changed: false,
    };

    expect(
      cubeChangedFieldsFromResult({ geometry_effect: effect })
    ).toEqual(["from"]);

    expect(
      cubeChangedFieldsFromResult({
        effects: [
          { geometry_effect: effect },
          {
            geometry_effect: {
              ...effect,
              changed_fields: ["faces"],
              faces_changed: true,
            },
          },
        ],
      }).sort()
    ).toEqual(["faces", "from"]);
  });

  test("derives one canonical semantic scope set from Cube changed fields", () => {
    expect(
      cubeSemanticScopesFromChangedFields(["rotation", "visibility"])
    ).toEqual(["GEOMETRY_STRUCTURE"]);

    expect(
      cubeSemanticScopesFromChangedFields(["faces"])
    ).toEqual([
      "GEOMETRY_STRUCTURE",
      "UV_MAPPING",
      "TEXTURE_APPEARANCE",
    ]);

    expect(
      cubeSemanticScopesFromChangedFields(["from"])
    ).toEqual([
      "GEOMETRY_STRUCTURE",
      "UV_MAPPING",
      "TEXTURE_APPEARANCE",
      "ANIMATION_MOTION",
    ]);

    expect(cubeSemanticScopesFromChangedFields([])).toEqual([
      "GEOMETRY_STRUCTURE",
      "UV_MAPPING",
      "TEXTURE_APPEARANCE",
      "ANIMATION_MOTION",
    ]);
  });

  test("rejects malformed effect and over-broad visual scope", () => {
    expect(
      cubeChangedFieldsFromResult({
        geometry_effect: {
          changed_fields: ["from"],
        },
      })
    ).toEqual([]);

    expect(
      cubeVisualScopeFromResult({
        visual_scope: {
          cube_uuids: Array.from({ length: 33 }, (_, i) => `cube-${i}`),
          framing: { min: [0, 0, 0], max: [1, 1, 1] },
        },
      })
    ).toBeNull();
  });

  test("Runtime and Control share Cube evidence owners", async () => {
    const producer = await Bun.file("server/tools/geometry/cubes.ts").text();
    const freshness = await Bun.file("gateway/control/delta/freshness.ts").text();
    const verification = await Bun.file("gateway/control/delta/verification.ts").text();

    expect(producer).toContain('from "@/lib/receipts/cubeMutation"');
    expect(freshness).toContain("cubeChangedFieldsFromResult");
    expect(verification).toContain("cubeVisualScopeFromResult");
  });
});
