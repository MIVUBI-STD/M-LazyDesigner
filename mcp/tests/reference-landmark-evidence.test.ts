import { describe, expect, test } from "bun:test";
import {
  compareReferenceLandmarkProjection,
  parseReferenceImageLandmarks,
  assessLandmarkCorrectionDelta,
  type LandmarkCaptureEvidence,
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

function captureEvidence(
  evidence_handle: string,
  firstUv: [number, number],
  secondUv: [number, number] = [0.65, 0.5]
): LandmarkCaptureEvidence {
  const points = [
    { id: "body", cube: "cube-body", uv: [0.4, 0.5] as [number, number], projected: firstUv },
    { id: "arm", cube: "cube-arm", uv: [0.5, 0.5] as [number, number], projected: secondUv },
  ];
  return {
    evidence_handle,
    project_uuid: "project-1",
    front_direction: "+z",
    width: 512,
    height: 512,
    framing_bounds: { min: [-10, 0, -10], max: [10, 20, 10] },
    cameras: [{
      view: "front", projection: "orthographic",
      position: [0, 10, 40], target: [0, 10, 0], up: [0, 1, 0],
      zoom: 20, fov: null,
    }],
    landmarks: points.map((row) => compareReferenceLandmarkProjection({
      reference_image_id: "IMG_FRONT",
      reference_sha256: "a".repeat(64),
      view: "front",
      landmark_id: row.id,
      model_cube_uuid: row.cube,
      model_anchor: "CUBE_CENTER",
      model_world_point: [0, 10, 0],
      reference_uv: row.uv,
      projected_uv: row.projected,
      ndc_depth: 0,
    })),
  };
}

describe("reference landmark before/after convergence guard", () => {
  test("one worse landmark vetoes a superficially improved second point", () => {
    const before = captureEvidence("before", [0.6, 0.5], [0.7, 0.5]);
    const after = captureEvidence("after", [0.5, 0.5], [0.8, 0.5]);
    const delta = assessLandmarkCorrectionDelta(before, after);
    expect(delta.state).toBe("REGRESSED");
    expect(delta.comparisons.map((item) => item.state)).toEqual([
      "IMPROVED", "REGRESSED",
    ]);
    expect(delta.rollback_native_edit_required).toBe(true);
    expect(delta.visual_verdict).toBe("UNVERIFIED");
  });

  test("only complete same-camera, same-reference observations are comparable", () => {
    const before = captureEvidence("before", [0.6, 0.5]);
    const after = captureEvidence("after", [0.5, 0.5]);
    expect(assessLandmarkCorrectionDelta(before, after).state).toBe("IMPROVED");
    expect(assessLandmarkCorrectionDelta(before, {
      ...after, cameras: [{ ...after.cameras[0]!, zoom: 21 }],
    }).state).toBe("UNCOMPARABLE");
    expect(assessLandmarkCorrectionDelta(before, {
      ...after, framing_bounds: { ...after.framing_bounds, max: [11, 20, 10] },
    }).state).toBe("UNCOMPARABLE");
    expect(assessLandmarkCorrectionDelta(before, {
      ...after, front_direction: "-z",
    }).state).toBe("UNCOMPARABLE");
    expect(assessLandmarkCorrectionDelta(before, {
      ...after, landmarks: after.landmarks.slice(0, 1),
    }).state).toBe("UNCOMPARABLE");
    expect(assessLandmarkCorrectionDelta(before, {
      ...after, landmarks: after.landmarks.map((row, index) => index === 0
        ? { ...row, reference_sha256: "b".repeat(64) }
        : row),
    }).state).toBe("UNCOMPARABLE");
    expect(assessLandmarkCorrectionDelta(before, {
      ...after, project_uuid: "another-project",
    }).state).toBe("UNCOMPARABLE");
    expect(assessLandmarkCorrectionDelta(before, {
      ...after, evidence_handle: before.evidence_handle,
    }).state).toBe("UNCOMPARABLE");
  });

  test("tampered numeric residuals cannot be used to claim measured progress", () => {
    const before = captureEvidence("before", [0.6, 0.5]);
    const after = captureEvidence("after", [0.5, 0.5]);
    const invalid = {
      ...after,
      landmarks: after.landmarks.map((point) =>
        point.landmark_id === "body"
          ? { ...point, distance_uv: 0, offset_uv: [0, 0] as [number, number] }
          : point),
    };
    expect(assessLandmarkCorrectionDelta(before, invalid).state).toBe("UNCOMPARABLE");
    expect(assessLandmarkCorrectionDelta(before, {
      ...after, landmarks: [...after.landmarks, after.landmarks[0]!],
    }).state).toBe("UNCOMPARABLE");
  });

  test("stable measurements never imply visual approval", () => {
    const before = captureEvidence("before", [0.6, 0.5]);
    const after = captureEvidence("after", [0.6, 0.5]);
    const delta = assessLandmarkCorrectionDelta(before, after);
    expect(delta.state).toBe("UNCHANGED");
    expect(delta.visual_verdict).toBe("UNVERIFIED");
    expect(delta.rollback_native_edit_required).toBe(false);
  });
});
