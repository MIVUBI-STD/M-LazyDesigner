import { describe, expect, test } from "bun:test";
import {
  compareSilhouetteMaskEvidence,
  deriveAlphaSilhouetteMask,
  compareBoundSilhouetteEvidence,
  type SilhouetteMask,
  type SilhouetteMaskComparisonInput,
} from "@/lib/reference/silhouetteEvidence";

function mask(rows: readonly string[], source: SilhouetteMask["provenance"], digest: string): SilhouetteMask {
  return {
    image_sha256: digest.repeat(64),
    view: "front",
    width: rows[0]!.length,
    height: rows.length,
    pixels: rows.join("").split("").map((char) => Number(char)),
    provenance: source,
  };
}

function fixture(): SilhouetteMaskComparisonInput {
  return {
    reference: mask([
      "00000",
      "01110",
      "01010",
      "01110",
      "00000",
    ], "APPROVED_ALPHA", "a"),
    model: mask([
      "00000",
      "00100",
      "01110",
      "00100",
      "00000",
    ], "OFFSCREEN_RENDER_ALPHA", "b"),
    pairing: "REVIEWED_SAME_FRAME",
  };
}

describe("reference silhouette mask evidence", () => {
  test("different silhouettes sharing identical envelopes produce non-perfect overlap", () => {
    const result = compareSilhouetteMaskEvidence(fixture());
    expect(result.state).toBe("DIAGNOSTIC_ONLY");
    expect(result.metrics?.iou).toBeLessThan(1);
    expect(result.metrics?.reference_only_pixels).toBeGreaterThan(0);
    expect(result.metrics?.model_only_pixels).toBeGreaterThan(0);
    expect(result.metrics?.reference_only_bounds).toEqual({ x: 1, y: 1, width: 3, height: 3 });
    expect(result.metrics?.model_only_bounds).toEqual({ x: 2, y: 2, width: 1, height: 1 });
    expect(result.visual_verdict).toBe("NOT_EVALUATED");
    expect(result.source_camera_calibrated).toBe(false);
    expect(result.automatic_correction).toBe(false);
  });

  test("exact identity yields diagnostic overlap, not user or visual approval", () => {
    const input = fixture();
    const result = compareSilhouetteMaskEvidence({
      ...input,
      model: { ...input.model, pixels: [...input.reference.pixels] },
    });
    expect(result.metrics?.iou).toBe(1);
    expect(result.metrics?.discrepancy).toBe("NONE");
    expect(result.visual_verdict).toBe("NOT_EVALUATED");
    expect(result.pairing_authority).toBe("CALLER_DECLARED");
  });

  test("unreviewed camera, different view and different raster dimensions fail closed", () => {
    const input = fixture();
    expect(compareSilhouetteMaskEvidence({ ...input, pairing: "UNVERIFIED" }).reason)
      .toBe("CAMERA_AND_FRAMING_PAIRING_UNVERIFIED");
    expect(compareSilhouetteMaskEvidence({
      ...input, model: { ...input.model, view: "back" },
    }).reason).toBe("VIEW_IDENTITY_DIFFERS");
    expect(compareSilhouetteMaskEvidence({
      ...input, model: { ...input.model, width: 1, height: 25 },
    }).reason).toBe("FRAME_DIMENSIONS_DIFFER");
  });

  test("unreviewed segmentation and untrusted render masks cannot be scored", () => {
    const input = fixture();
    expect(compareSilhouetteMaskEvidence({
      ...input, reference: { ...input.reference, provenance: "UNVERIFIED" },
    }).reason).toBe("MASK_PROVENANCE_UNVERIFIED");
    expect(compareSilhouetteMaskEvidence({
      ...input, model: { ...input.model, provenance: "UNVERIFIED" },
    }).metrics).toBeNull();
  });

  test("empty and saturated masks reject background-removal failure cases", () => {
    const input = fixture();
    for (const pixels of [new Array(25).fill(0), new Array(25).fill(1)]) {
      const result = compareSilhouetteMaskEvidence({
        ...input, reference: { ...input.reference, pixels },
      });
      expect(result.state).toBe("UNVERIFIED");
      expect(result.reason).toBe("EMPTY_OR_FULL_FRAME_MASK");
      expect(result.metrics).toBeNull();
    }
  });

  test("invalid mask identity, shape and pixel values are rejected rather than coerced", () => {
    const input = fixture();
    for (const reference of [
      { ...input.reference, image_sha256: "broken" },
      { ...input.reference, pixels: [1] },
      { ...input.reference, pixels: Array(25).fill(0.5) },
      { ...input.reference, pixels: Array(25).fill(255) },
      { ...input.reference, width: 2048, height: 2048 },
    ]) {
      expect(() => compareSilhouetteMaskEvidence({ ...input, reference })).toThrow();
    }
  });

  test("input buffers are read-only and mask dimensions determine exact counts", () => {
    const input = fixture();
    input.reference.pixels = Uint8Array.from(input.reference.pixels);
    input.model.pixels = Uint8Array.from(input.model.pixels);
    const before = [...input.reference.pixels];
    const result = compareSilhouetteMaskEvidence(input);
    expect([...input.reference.pixels]).toEqual(before);
    expect(result.metrics?.reference_pixels).toBe(8);
    expect(result.metrics?.model_pixels).toBe(5);
    expect(result.metrics?.overlap_pixels).toBe(4);
    expect(result.metrics?.iou).toBeCloseTo(4 / 9, 4);
  });
});

function alphaBuffer(rows: readonly string[]): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(rows.join("").length * 4);
  [...rows.join("")].forEach((pixel, i) => {
    rgba[i * 4 + 3] = pixel === "1" ? 255 : 0;
  });
  return rgba;
}

describe("alpha silhouette handoff and capture identity", () => {
  test("derives explicit transparent PNG alpha without background guessing", () => {
    const result = deriveAlphaSilhouetteMask({
      image_sha256: "a".repeat(64), view: "front", width: 3, height: 3,
      rgba: alphaBuffer(["000", "010", "000"]), provenance: "APPROVED_ALPHA",
    });
    expect(result.state).toBe("AVAILABLE");
    expect(result.mask?.pixels).toEqual(Uint8Array.from([0,0,0,0,1,0,0,0,0]));
  });

  test("opaque and empty alpha, malformed dimensions and invalid threshold are not silently accepted", () => {
    const common = {
      image_sha256: "a".repeat(64), view: "front" as const,
      width: 3, height: 3, provenance: "APPROVED_ALPHA" as const,
    };
    for (const rows of [["111","111","111"], ["000","000","000"]]) {
      expect(deriveAlphaSilhouetteMask({
        ...common, rgba: alphaBuffer(rows),
      })).toMatchObject({ state: "UNVERIFIED", mask: null, reason: "OPAQUE_OR_EMPTY_ALPHA_MASK" });
    }
    expect(() => deriveAlphaSilhouetteMask({
      ...common, rgba: new Uint8Array(5),
    })).toThrow();
    expect(() => deriveAlphaSilhouetteMask({
      ...common, rgba: alphaBuffer(["000","010","000"]), alpha_threshold: 0,
    })).toThrow();
  });

  test("binds only approved source identity and matching capture image identity", () => {
    const masks = fixture();
    const bound = {
      reference: {
        id: "IMG_FRONT", sha256: masks.reference.image_sha256,
        integrity: "VERIFIED" as const, status: "APPROVED",
        view: "front" as const, mime_type: "image/png",
      },
      capture: {
        project_uuid: "project-a", evidence_handle: "modelcapture:" + "c".repeat(64),
        view: "front" as const, image_sha256: masks.model.image_sha256,
        width: 5, height: 5,
      },
      reference_mask: masks.reference, model_mask: masks.model,
      pairing: "REVIEWED_SAME_FRAME" as const,
    };
    const result = compareBoundSilhouetteEvidence(bound);
    expect(result.state).toBe("DIAGNOSTIC_ONLY");
    expect(result.metrics?.iou).toBeCloseTo(4 / 9, 4);
    expect(result.visual_verdict).toBe("NOT_EVALUATED");
    expect(compareBoundSilhouetteEvidence({
      ...bound, reference: { ...bound.reference, sha256: "f".repeat(64) },
    }).reason).toBe("REFERENCE_IMAGE_IDENTITY_MISMATCH");
    expect(compareBoundSilhouetteEvidence({
      ...bound, reference: { ...bound.reference, status: "DRAFT" },
    }).reason).toBe("APPROVED_PNG_REFERENCE_UNAVAILABLE");
    expect(compareBoundSilhouetteEvidence({
      ...bound, capture: { ...bound.capture, image_sha256: "d".repeat(64) },
    }).reason).toBe("MODEL_CAPTURE_IMAGE_IDENTITY_MISMATCH");
    expect(compareBoundSilhouetteEvidence({
      ...bound, capture: { ...bound.capture, evidence_handle: "unknown" },
    }).reason).toBe("MODEL_CAPTURE_EVIDENCE_UNAVAILABLE");
    expect(compareBoundSilhouetteEvidence({
      ...bound, pairing: "UNVERIFIED" as const,
    }).reason).toBe("CAMERA_AND_FRAMING_PAIRING_UNVERIFIED");
  });
});
