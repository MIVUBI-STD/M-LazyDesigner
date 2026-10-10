import { describe, expect, test } from "bun:test";
import {
  compareReferenceLandmarkProjection,
  parseReferenceImageLandmarks,
} from "@/lib/reference/landmarkEvidence";

describe("reference-image landmark contract", () => {
  test("normalizes explicit two-dimensional observations without inventing 3D points", () => {
    expect(parseReferenceImageLandmarks([
      { id: " left_eye ", uv: [0.25, 0.375], part_id: " head " },
      { id: "shoulder", uv: [0, 1] },
    ])).toEqual([
      { id: "left_eye", uv: [0.25, 0.375], part_id: "head" },
      { id: "shoulder", uv: [0, 1], part_id: null },
    ]);
    expect(parseReferenceImageLandmarks(undefined)).toEqual([]);
  });

  test("rejects unsupported UV claims, duplicate identities and unbounded arrays", () => {
    for (const input of [
      [{ id: "eye", uv: [-0.01, 0.5] }],
      [{ id: "eye", uv: [0.5, 1.01] }],
      [{ id: "eye", uv: [Number.NaN, 0.5] }],
      [{ id: "eye", uv: [0.4] }],
      [{ id: "eye", uv: [0.4, 0.3] }, { id: " eye ", uv: [0.1, 0.2] }],
      [{ id: "eye", uv: [0.4, 0.3], part_id: " " }],
      Array.from({ length: 17 }, (_, i) => ({ id: "point" + i, uv: [0.5, 0.5] })),
      "invalid",
    ]) {
      expect(parseReferenceImageLandmarks(input)).toBeNull();
    }
  });

  test("reports normalized 2D residual without falsely accepting uncalibrated cameras", () => {
    const row = compareReferenceLandmarkProjection({
      reference_image_id: "IMG_FRONT",
      reference_sha256: "a".repeat(64),
      view: "front",
      landmark_id: "torso",
      model_cube_uuid: "cube-uuid",
      model_anchor: "CUBE_CENTER",
      model_world_point: [0, 8, 0],
      reference_uv: [0.4, 0.5],
      projected_uv: [0.5, 0.5],
      ndc_depth: 0,
    });
    expect(row.offset_uv[0]).toBeCloseTo(0.1);
    expect(row.offset_uv[1]).toBeCloseTo(0);
    expect(row.distance_uv).toBeCloseTo(0.1);
    expect(row.projection_state).toBe("IN_FRAME");
    expect(row.camera_pairing).toBe("UNVERIFIED");
    expect(row.interpretation).toBe("DIAGNOSTIC_ONLY");
  });

  test("out-of-frame and invalid projections never manufacture alignment evidence", () => {
    const base = {
      reference_image_id: "IMG_FRONT",
      reference_sha256: "a".repeat(64),
      view: "front" as const,
      landmark_id: "point",
      model_cube_uuid: "cube-uuid",
      model_anchor: "CUBE_CENTER" as const,
      model_world_point: [0, 0, 0] as [number, number, number],
      reference_uv: [0.4, 0.5] as [number, number],
      projected_uv: [1.1, 0.5] as [number, number],
      ndc_depth: 0,
    };
    expect(compareReferenceLandmarkProjection(base).projection_state).toBe("OUTSIDE_FRAME");
    expect(compareReferenceLandmarkProjection({
      ...base, projected_uv: [0.5, 0.5], ndc_depth: 2,
    }).projection_state).toBe("OUTSIDE_FRAME");
    expect(() => compareReferenceLandmarkProjection({
      ...base, projected_uv: [Number.NaN, 0.5],
    })).toThrow("REFERENCE_LANDMARK_PROJECTION_INVALID");
  });
});
