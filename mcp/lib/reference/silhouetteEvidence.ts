import { MODEL_VIEWS, type ModelView } from "./visualEvidence";

/**
 * A caller-supplied binary mask, not an inferred image segmentation.
 * The image hash and provenance are declarations; this pure function cannot
 * attest the original pixels, camera calibration, or native Blockbench state.
 */
export type SilhouetteMask = {
  image_sha256: string;
  view: ModelView;
  width: number;
  height: number;
  pixels: readonly number[] | Uint8Array;
  provenance: "APPROVED_ALPHA" | "REVIEWED_SEGMENTATION" | "OFFSCREEN_RENDER_ALPHA" | "UNVERIFIED";
};

export type SilhouetteMaskComparisonInput = {
  reference: SilhouetteMask;
  model: SilhouetteMask;
  /** Explicit upstream review, never inferred from matching view labels. */
  pairing: "REVIEWED_SAME_FRAME" | "UNVERIFIED";
};

type PixelBounds = { x: number; y: number; width: number; height: number };

const MAX_MASK_PIXELS = 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;

function roundRatio(value: number): number {
  return Number(value.toFixed(4));
}

function validateMask(mask: SilhouetteMask, label: string): void {
  if (!SHA256.test(mask.image_sha256)) {
    throw new Error(label + " silhouette image identity must be a SHA-256 hex digest.");
  }
  if (!MODEL_VIEWS.includes(mask.view)) {
    throw new Error(label + " silhouette view must be canonical.");
  }
  if (!Number.isSafeInteger(mask.width) || !Number.isSafeInteger(mask.height) ||
      mask.width <= 0 || mask.height <= 0 ||
      mask.width * mask.height > MAX_MASK_PIXELS) {
    throw new Error(label + " silhouette dimensions must be positive and bounded.");
  }
  if (mask.pixels.length !== mask.width * mask.height) {
    throw new Error(label + " silhouette mask length must match its dimensions.");
  }
  for (const pixel of mask.pixels) {
    if (pixel !== 0 && pixel !== 1) {
      throw new Error(label + " silhouette mask must contain binary 0/1 pixels.");
    }
  }
}

function pixelBounds(
  indices: readonly number[],
  width: number
): PixelBounds | null {
  if (indices.length === 0) return null;
  let minX = width;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = -1;
  let maxY = -1;
  for (const index of indices) {
    const x = index % width;
    const y = Math.floor(index / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Diagnostic-only overlap of two already-segmented, same-frame image masks.
 * Does not segment source images, normalize scale, calibrate cameras, score
 * quality, assert visual approval, or propose an automatic geometry mutation.
 */
export function compareSilhouetteMaskEvidence(input: SilhouetteMaskComparisonInput) {
  validateMask(input.reference, "Reference");
  validateMask(input.model, "Model");
  const shared = {
    visual_verdict: "NOT_EVALUATED" as const,
    pairing_authority: "CALLER_DECLARED" as const,
    source_camera_calibrated: false as const,
    automatic_correction: false as const,
  };
  const unavailable = (reason: string) => ({
    ...shared,
    state: "UNVERIFIED" as const,
    reason,
    metrics: null,
  });

  if (input.reference.width !== input.model.width ||
      input.reference.height !== input.model.height) {
    return unavailable("FRAME_DIMENSIONS_DIFFER");
  }
  if (input.reference.view !== input.model.view) {
    return unavailable("VIEW_IDENTITY_DIFFERS");
  }
  if (input.pairing !== "REVIEWED_SAME_FRAME") {
    return unavailable("CAMERA_AND_FRAMING_PAIRING_UNVERIFIED");
  }
  if ((input.reference.provenance !== "APPROVED_ALPHA" &&
       input.reference.provenance !== "REVIEWED_SEGMENTATION") ||
       input.model.provenance !== "OFFSCREEN_RENDER_ALPHA") {
    return unavailable("MASK_PROVENANCE_UNVERIFIED");
  }

  const referenceOnly: number[] = [];
  const modelOnly: number[] = [];
  let referenceArea = 0;
  let modelArea = 0;
  let intersection = 0;
  for (let i = 0; i < input.reference.pixels.length; i++) {
    const reference = input.reference.pixels[i] === 1;
    const model = input.model.pixels[i] === 1;
    if (reference) referenceArea++;
    if (model) modelArea++;
    if (reference && model) intersection++;
    else if (reference) referenceOnly.push(i);
    else if (model) modelOnly.push(i);
  }

  const frameArea = input.reference.width * input.reference.height;
  // Reject empty/full-frame masks; a failed background flood-fill must not
  // silently produce an impressive or meaningless silhouette score.
  if (referenceArea === 0 || modelArea === 0 ||
      referenceArea === frameArea || modelArea === frameArea) {
    return unavailable("EMPTY_OR_FULL_FRAME_MASK");
  }

  const union = referenceArea + modelArea - intersection;
  const referenceMissing = referenceOnly.length;
  const modelExcess = modelOnly.length;
  const discrepancy =
    referenceMissing === 0 && modelExcess === 0 ? "NONE" :
    referenceMissing > 0 && modelExcess > 0 ? "MIXED" :
    referenceMissing > 0 ? "REFERENCE_ONLY" : "MODEL_ONLY";

  return {
    ...shared,
    state: "DIAGNOSTIC_ONLY" as const,
    reason: null,
    metrics: {
      view: input.reference.view,
      frame: { width: input.reference.width, height: input.reference.height },
      reference_image_sha256: input.reference.image_sha256,
      model_image_sha256: input.model.image_sha256,
      reference_pixels: referenceArea,
      model_pixels: modelArea,
      overlap_pixels: intersection,
      reference_only_pixels: referenceMissing,
      model_only_pixels: modelExcess,
      iou: roundRatio(intersection / union),
      reference_coverage: roundRatio(intersection / referenceArea),
      model_precision: roundRatio(intersection / modelArea),
      discrepancy,
      reference_only_bounds: pixelBounds(referenceOnly, input.reference.width),
      model_only_bounds: pixelBounds(modelOnly, input.reference.width),
    },
  };
}
