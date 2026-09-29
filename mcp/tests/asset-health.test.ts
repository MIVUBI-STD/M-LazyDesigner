import { describe, expect, test } from "bun:test";
import { buildAssetHealthSummary } from "@/lib/assetHealth";
import type { ControlReferenceProjection } from "@/gateway/control/referenceTypes";
import type { ControlWorkspaceProjection } from "@/gateway/control/workspace";

function reference(animationRequired = true): ControlReferenceProjection {
  return {
    available: true,
    source_path: null,
    package_root: null,
    fingerprint: "ref",
    schema: "lazydesigner-reference-v1",
    asset_name: "asset",
    asset_kind: "MODEL",
    intent: "build asset",
    selected_profile: "GENERIC",
    requirements: {
      dimensions_blocks: null,
      player_relative_scale: null,
      animation_required: animationRequired,
    },
    readiness: {
      overall: "READY",
      geometry: "READY",
      texture: "READY",
      animation: animationRequired ? "READY" : "UNKNOWN",
    },
    particle: null,
    blocking_unknowns: [],
    non_blocking_unknowns: [],
    documents: {},
    images: [],
  };
}

function workspace(): ControlWorkspaceProjection {
  return {
    available: true,
    source_path: null,
    fingerprint: "workspace",
    asset: "asset",
    current_stage: "Animation",
    gates: {
      geometry: "APPROVED",
      uv_layout: "PASS",
      texturing: "APPROVED",
      animation: "APPROVED",
    },
    next_step: null,
    blockers: [],
  };
}

describe("asset health summary", () => {
  test("reports ready only when every required authoritative gate passes", () => {
    const result = buildAssetHealthSummary({
      domain: "ANIMATION",
      reference: reference(true),
      workspace: workspace(),
    });
    expect(result.overall).toBe("READY");
    expect(result.stages).toEqual({
      reference: "PASS",
      geometry: "PASS",
      uv_layout: "PASS",
      texturing: "PASS",
      animation: "PASS",
    });
  });

  test("does not invent an animation requirement for static assets", () => {
    const ws = workspace();
    ws.gates.animation = "NOT_STARTED";
    const result = buildAssetHealthSummary({
      domain: "TEXTURING",
      reference: reference(false),
      workspace: ws,
    });
    expect(result.stages.animation).toBe("NOT_REQUIRED");
    expect(result.overall).toBe("READY");
  });

  test("in-progress stages remain review instead of becoming PASS", () => {
    const ws = workspace();
    ws.gates.texturing = "IN_PROGRESS";
    const result = buildAssetHealthSummary({
      domain: "TEXTURING",
      reference: reference(false),
      workspace: ws,
    });
    expect(result.stages.texturing).toBe("REVIEW");
    expect(result.overall).toBe("REVIEW");
  });

  test("reference blocker blocks health without inventing downstream failures", () => {
    const ref = reference(true);
    ref.readiness.animation = "BLOCKED";
    const result = buildAssetHealthSummary({
      domain: "ANIMATION",
      reference: ref,
      workspace: workspace(),
    });
    expect(result.overall).toBe("BLOCKED");
    expect(result.blockers).toContain("REFERENCE_STAGE_BLOCKED");
    expect(result.stages.geometry).toBe("PASS");
  });

  test("missing workspace is incomplete rather than failed", () => {
    const ws = workspace();
    ws.available = false;
    const result = buildAssetHealthSummary({
      domain: "GEOMETRY",
      reference: reference(false),
      workspace: ws,
    });
    expect(result.overall).toBe("INCOMPLETE");
    expect(result.stages.geometry).toBe("UNVERIFIED");
  });
});
