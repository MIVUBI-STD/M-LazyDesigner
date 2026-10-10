import type { ModelView } from "./visualEvidence";

/** A user/reference-supplied observation on one actual source-image view. */
export type ReferenceImageLandmark = {
  id: string;
  uv: [number, number];
  part_id: string | null;
};

const MAX_LANDMARKS_PER_IMAGE = 16;
const NAME_LIMIT = 96;

function normalizedCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

/** Invalid landmark evidence never degrades silently into an empty list. */
export function parseReferenceImageLandmarks(
  input: unknown
): ReferenceImageLandmark[] | null {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > MAX_LANDMARKS_PER_IMAGE) return null;
  const names = new Set<string>();
  const parsed: ReferenceImageLandmark[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const part = record.part_id === undefined || record.part_id === null
      ? null
      : typeof record.part_id === "string" ? record.part_id.trim() : "";
    const uv = record.uv;
    if (!id || id.length > NAME_LIMIT || names.has(id) ||
        (part !== null && (!part || part.length > NAME_LIMIT)) ||
        !Array.isArray(uv) || uv.length !== 2 ||
        !normalizedCoordinate(uv[0]) || !normalizedCoordinate(uv[1])) {
      return null;
    }
    names.add(id);
    parsed.push({ id, uv: [uv[0], uv[1]], part_id: part });
  }
  return parsed;
}

export type LandmarkProjectionInput = {
  reference_image_id: string;
  reference_sha256: string;
  view: ModelView;
  landmark_id: string;
  model_cube_uuid: string;
  model_anchor: "CUBE_CENTER";
  model_world_point: [number, number, number];
  reference_uv: [number, number];
  projected_uv: [number, number];
  ndc_depth: number;
};

export type LandmarkProjectionObservation = LandmarkProjectionInput & {
  offset_uv: [number, number];
  distance_uv: number;
  projection_state: "IN_FRAME" | "OUTSIDE_FRAME";
  /** View names alone do not prove reference-camera calibration. */
  camera_pairing: "UNVERIFIED";
  interpretation: "DIAGNOSTIC_ONLY";
};

/**
 * A numeric residual in normalized image coordinates. Never promotes
 * correspondence metadata to visual PASS or infers a 3D correction vector.
 */
export function compareReferenceLandmarkProjection(
  input: LandmarkProjectionInput
): LandmarkProjectionObservation {
  const all = [
    ...input.reference_uv, ...input.projected_uv,
    ...input.model_world_point, input.ndc_depth,
  ];
  if (all.some((value) => !Number.isFinite(value)) ||
      input.reference_uv.some((value) => !normalizedCoordinate(value))) {
    throw new Error("REFERENCE_LANDMARK_PROJECTION_INVALID");
  }
  const dx = input.projected_uv[0] - input.reference_uv[0];
  const dy = input.projected_uv[1] - input.reference_uv[1];
  const within = input.projected_uv.every((value) => normalizedCoordinate(value)) &&
    input.ndc_depth >= -1 && input.ndc_depth <= 1;
  return {
    ...input,
    offset_uv: [dx, dy],
    distance_uv: Math.hypot(dx, dy),
    projection_state: within ? "IN_FRAME" : "OUTSIDE_FRAME",
    camera_pairing: "UNVERIFIED",
    interpretation: "DIAGNOSTIC_ONLY",
  };
}

/**
 * Matched evidence surrounding one bounded correction. The descriptor is
 * supplied from capture_model_views; it must describe the actual capture
 * plan, not a user-estimated reference camera.
 */
export type LandmarkCaptureEvidence = {
  evidence_handle: string;
  project_uuid: string;
  front_direction: "+z" | "-z";
  width: number;
  height: number;
  framing_bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
  cameras: Array<{
    view: ModelView;
    projection: "orthographic" | "perspective";
    position: number[];
    target: number[];
    up: number[];
    zoom: number | null;
    fov: number | null;
  }>;
  landmarks: LandmarkProjectionObservation[];
};

export type LandmarkCorrectionDelta = {
  state: "IMPROVED" | "UNCHANGED" | "REGRESSED" | "UNCOMPARABLE";
  comparisons: Array<{
    reference_image_id: string;
    landmark_id: string;
    view: ModelView;
    model_cube_uuid: string;
    before_distance_uv: number;
    after_distance_uv: number;
    change_uv: number;
    state: "IMPROVED" | "UNCHANGED" | "REGRESSED";
  }>;
  /** Measurement only, never a visually attested match or native rollback. */
  visual_verdict: "UNVERIFIED";
  rollback_native_edit_required: boolean;
};

function stableCaptureCamera(
  capture: LandmarkCaptureEvidence
): string {
  const cameraIds = new Set<ModelView>();
  for (const camera of capture.cameras) {
    if (cameraIds.has(camera.view)) throw new Error("LANDMARK_CAMERA_DUPLICATE_VIEW");
    cameraIds.add(camera.view);
    const vectors = [camera.position, camera.target, camera.up];
    if (vectors.some((v) => v.length !== 3 || v.some((x) => !Number.isFinite(x))) ||
        ![camera.zoom, camera.fov].every((v) => v === null || Number.isFinite(v))) {
      throw new Error("LANDMARK_CAMERA_INVALID");
    }
  }
  if (!capture.project_uuid || !capture.evidence_handle ||
      !Number.isInteger(capture.width) || capture.width < 1 ||
      !Number.isInteger(capture.height) || capture.height < 1 ||
      capture.framing_bounds.min.length !== 3 ||
      capture.framing_bounds.max.length !== 3 ||
      [...capture.framing_bounds.min, ...capture.framing_bounds.max]
        .some((v) => !Number.isFinite(v)) ||
      capture.cameras.length === 0) {
    throw new Error("LANDMARK_CAPTURE_INVALID");
  }
  return JSON.stringify({
    project_uuid: capture.project_uuid,
    front_direction: capture.front_direction,
    dimensions: [capture.width, capture.height],
    bounds: capture.framing_bounds,
    cameras: [...capture.cameras].sort((a, b) => a.view.localeCompare(b.view)),
  });
}

function consistentLandmarkResidual(row: LandmarkProjectionObservation): boolean {
  const coordinates = [
    ...row.reference_uv, ...row.projected_uv, ...row.offset_uv,
    ...row.model_world_point, row.ndc_depth, row.distance_uv,
  ];
  if (coordinates.some((value) => !Number.isFinite(value)) ||
      row.reference_uv.some((value) => !normalizedCoordinate(value))) return false;
  const dx = row.projected_uv[0] - row.reference_uv[0];
  const dy = row.projected_uv[1] - row.reference_uv[1];
  return Math.abs(row.offset_uv[0] - dx) <= 1e-9 &&
    Math.abs(row.offset_uv[1] - dy) <= 1e-9 &&
    Math.abs(row.distance_uv - Math.hypot(dx, dy)) <= 1e-9 &&
    /^[a-f0-9]{64}$/.test(row.reference_sha256) &&
    Boolean(row.reference_image_id && row.landmark_id && row.model_cube_uuid);
}

function landmarkIdentity(row: LandmarkProjectionObservation): string {
  return JSON.stringify([
    row.reference_image_id, row.reference_sha256, row.landmark_id,
    row.view, row.model_cube_uuid, row.model_anchor, row.reference_uv,
  ]);
}

/**
 * Compare only the same source pixels, exact Cube UUIDs and unchanged camera
 * plan/framing. No RMS averaging: one worse point remains a regression.
 * UNCOMPARABLE evidence cannot support convergence or a new correction.
 */
export function assessLandmarkCorrectionDelta(
  before: LandmarkCaptureEvidence,
  after: LandmarkCaptureEvidence
): LandmarkCorrectionDelta {
  const empty: LandmarkCorrectionDelta = {
    state: "UNCOMPARABLE",
    comparisons: [],
    visual_verdict: "UNVERIFIED",
    rollback_native_edit_required: false,
  };
  if (before.evidence_handle === after.evidence_handle ||
      stableCaptureCamera(before) !== stableCaptureCamera(after) ||
      !before.landmarks.length ||
      before.landmarks.length > 16 ||
      before.landmarks.length !== after.landmarks.length) return empty;
  const byIdentity = new Map<string, LandmarkProjectionObservation>();
  for (const row of after.landmarks) {
    const id = landmarkIdentity(row);
    if (byIdentity.has(id)) return empty;
    byIdentity.set(id, row);
  }
  const seen = new Set<string>();
  const comparisons: LandmarkCorrectionDelta["comparisons"] = [];
  for (const prior of before.landmarks) {
    const id = landmarkIdentity(prior);
    const current = byIdentity.get(id);
    if (seen.has(id) || !current ||
        !consistentLandmarkResidual(prior) || !consistentLandmarkResidual(current) ||
        prior.projection_state !== "IN_FRAME" ||
        current.projection_state !== "IN_FRAME" ||
        prior.camera_pairing !== "UNVERIFIED" ||
        current.camera_pairing !== "UNVERIFIED" ||
        prior.interpretation !== "DIAGNOSTIC_ONLY" ||
        current.interpretation !== "DIAGNOSTIC_ONLY") return empty;
    seen.add(id);
    if (!before.cameras.some((camera) => camera.view === prior.view)) return empty;
    if (![prior.distance_uv, current.distance_uv].every(Number.isFinite) ||
        prior.distance_uv < 0 || current.distance_uv < 0) return empty;
    const change = current.distance_uv - prior.distance_uv;
    const state = Math.abs(change) <= 1e-9
      ? "UNCHANGED" as const
      : change < 0 ? "IMPROVED" as const : "REGRESSED" as const;
    comparisons.push({
      reference_image_id: prior.reference_image_id,
      landmark_id: prior.landmark_id,
      view: prior.view,
      model_cube_uuid: prior.model_cube_uuid,
      before_distance_uv: prior.distance_uv,
      after_distance_uv: current.distance_uv,
      change_uv: change,
      state,
    });
  }
  const state = comparisons.some((row) => row.state === "REGRESSED")
    ? "REGRESSED" as const
    : comparisons.some((row) => row.state === "IMPROVED")
      ? "IMPROVED" as const : "UNCHANGED" as const;
  return {
    state,
    comparisons,
    visual_verdict: "UNVERIFIED",
    rollback_native_edit_required: state === "REGRESSED",
  };
}
