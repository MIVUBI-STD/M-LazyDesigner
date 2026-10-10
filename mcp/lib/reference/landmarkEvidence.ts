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
