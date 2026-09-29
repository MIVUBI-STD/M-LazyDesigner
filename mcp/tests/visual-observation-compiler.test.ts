import { describe, expect, test } from "bun:test";
import {
  compileStructuredVisualObservation,
  compileStructuredVisualObservations,
} from "@/lib/orchestration/visualObservation";

describe("structured visual observation compiler", () => {
  test("geometry silhouette observation becomes an owned discrepancy without cause inference", () => {
    const result = compileStructuredVisualObservation({
      code: "TORSO_TOO_WIDE",
      criterion: "SILHOUETTE_PROPORTION",
      severity: "REVIEW",
      summary: "Torso reads materially wider than the approved front view.",
      evidence: {
        current_evidence_ref: "visual:model:front:rev2",
        reference_evidence_ref: "IMG_GEO_FRONT",
        views: ["front"],
        evidence_targets: ["width", "silhouette"],
      },
    });
    expect(result).toEqual({
      state: "SUPPORTED",
      discrepancy: {
        code: "TORSO_TOO_WIDE",
        severity: "REVIEW",
        summary: "Torso reads materially wider than the approved front view.",
        quality_class: "PRIMARY_FORM",
        owner: "GEOMETRY",
        views: ["front"],
        evidence_targets: ["width", "silhouette"],
      },
    });
  });

  test("reference-dependent visual claims fail closed without approved reference evidence", () => {
    const result = compileStructuredVisualObservation({
      code: "MARKING_WRONG",
      criterion: "TEXTURE_IDENTITY_MARKING",
      severity: "REVIEW",
      summary: "Chest marking differs.",
      evidence: {
        current_evidence_ref: "texture:region:rev4",
      },
    });
    expect(result).toEqual({
      state: "UNVERIFIED",
      discrepancy: null,
      reason: "REFERENCE_EVIDENCE_REQUIRED",
    });
  });

  test("runtime contact evidence can support animation contact without a visual reference image", () => {
    const result = compileStructuredVisualObservation({
      code: "FOOT_SLIDE",
      criterion: "ANIMATION_CONTACT",
      severity: "BLOCKING",
      summary: "Planted foot drifts beyond the supported contact tolerance.",
      evidence: {
        current_evidence_ref: "contact:left_foot:rev8",
        views: ["left"],
      },
      cause_family: "MOTION_MISMATCH",
    });
    expect(result.state).toBe("SUPPORTED");
    if (result.state !== "SUPPORTED") throw new Error("expected supported");
    expect(result.discrepancy).toMatchObject({
      quality_class: "ANIMATION_MOTION",
      owner: "ANIMATION",
      cause_family: "MOTION_MISMATCH",
    });
  });

  test("cause family is rejected when it contradicts explicit criterion ownership", () => {
    const result = compileStructuredVisualObservation({
      code: "BAD_CAUSE",
      criterion: "TEXTURE_MATERIAL_REGION",
      severity: "REVIEW",
      summary: "Material region differs from reference.",
      evidence: {
        current_evidence_ref: "texture:rev2",
        reference_evidence_ref: "IMG_TEX_01",
      },
      cause_family: "SIZE_MISMATCH",
    });
    expect(result).toEqual({
      state: "UNVERIFIED",
      discrepancy: null,
      reason: "OBSERVATION_INVALID",
    });
  });

  test("batch compilation separates supported observations from unverified claims", () => {
    const result = compileStructuredVisualObservations([
      {
        code: "A",
        criterion: "TOPOLOGY_ATTACHMENT",
        severity: "BLOCKING",
        summary: "Basket floats behind torso.",
        evidence: {
          current_evidence_ref: "visual:left:2",
          reference_evidence_ref: "IMG_SIDE",
          views: ["left"],
          evidence_targets: ["attachment"],
        },
        cause_family: "WRONG_ATTACHMENT",
      },
      {
        code: "B",
        criterion: "ANIMATION_WEIGHT_TRANSFER",
        severity: "REVIEW",
        summary: "Weight transfer is not yet grounded.",
        evidence: {
          current_evidence_ref: "playback:clip:4",
        },
      },
    ]);
    expect(result.supported).toHaveLength(1);
    expect(result.supported[0]).toMatchObject({
      code: "A",
      owner: "GEOMETRY",
      quality_class: "TOPOLOGY_ATTACHMENT",
      cause_family: "WRONG_ATTACHMENT",
    });
    expect(result.unverified).toEqual([
      { code: "B", reason: "REFERENCE_EVIDENCE_REQUIRED" },
    ]);
  });
});
