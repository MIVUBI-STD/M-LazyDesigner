import { describe, expect, test } from "bun:test";
import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import { CorrectionLoopRegistry } from "@/lib/orchestration/correctionLoop";

function recipe(): AuthoringRecipe {
  return {
    schema: 1,
    compiler_version: 1,
    id: "asset",
    name: "asset",
    prototypes: [{ id: "arm", name: "arm", size: [4, 8, 4], semantic_group: "upper_arm" }],
    patterns: [{
      kind: "LINEAR",
      id: "arms",
      prototype_id: "arm",
      count: 2,
      axis: "X",
      spacing: 8,
      semantic_group: "upper_arm",
    }],
  };
}

describe("zero-waste correction loop reuse", () => {
  test("reuses the same verification scope for a bounded correction", () => {
    const registry = new CorrectionLoopRegistry();
    const handle = registry.start({
      recipe_id: "asset",
      base_recipe: recipe(),
      verification_request: {
        domain: "GEOMETRY",
        source: "capture_model_views",
        verification_risk: "LOW",
        views: ["front"],
        views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        size: 256,
        size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        scope_instance_ids: ["arms:0", "arms:1"],
      },
      verification_evidence_handle: "verificationevidence:first",
      discrepancies: [{
        code: "WIDTH_LOW",
        severity: "REVIEW",
        summary: "Upper arms are slightly too narrow.",
      }],
    });

    const decision = registry.planGeometryCorrection(handle, [{
      id: "widen-arms",
      predicted_error: 0.1,
      mutation_cost: 0.1,
      risk: 0.1,
      patch: {
        intent: {
          target: { semantic_group: "upper_arm" },
          operation: {
            kind: "RESIZE_AXIS",
            axis: "X",
            mode: "MULTIPLY",
            value: 1.05,
            anchor: "MIN",
          },
        },
      },
    }]);

    expect(decision.state).toBe("CORRECTION_READY");
    expect(decision.attempt).toBe(1);
    expect(decision.selected_candidate_id).toBe("widen-arms");
    expect(decision.verification_request).toEqual({
      domain: "GEOMETRY",
      source: "capture_model_views",
      verification_risk: "LOW",
      views: ["front"],
      views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
      size: 256,
      size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
      scope_instance_ids: ["arms:0", "arms:1"],
    });
    expect(decision.rebuild?.metrics.native_affected_count).toBe(2);
  });

  test("reverification carries only the discrepancy targeted by the selected correction", () => {
    const registry = new CorrectionLoopRegistry();
    const handle = registry.start({
      recipe_id: "asset",
      base_recipe: recipe(),
      verification_request: {
        domain: "GEOMETRY",
        source: "capture_model_views",
        verification_risk: "MEDIUM",
        views: ["front", "left"],
        views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        size: 256,
        size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        scope_instance_ids: ["arms:0", "arms:1"],
      },
      verification_evidence_handle: "verificationevidence:first",
      discrepancies: [
        {
          code: "WIDTH_LOW",
          severity: "REVIEW",
          summary: "Upper arms are slightly too narrow.",
          views: ["front"],
          evidence_targets: ["width", "silhouette"],
        },
        {
          code: "SHOULDER_CONTACT",
          severity: "REVIEW",
          summary: "Shoulder contact requires separate review.",
          views: ["left"],
          evidence_targets: ["attachment"],
        },
      ],
    });

    const decision = registry.planGeometryCorrection(handle, [{
      id: "widen-arms",
      predicted_error: 0.1,
      mutation_cost: 0.1,
      risk: 0.1,
      patch: {
        target_discrepancy_codes: ["WIDTH_LOW"],
        intent: {
          target: { semantic_group: "upper_arm" },
          operation: {
            kind: "RESIZE_AXIS",
            axis: "X",
            mode: "MULTIPLY",
            value: 1.05,
            anchor: "MIN",
          },
        },
      },
    }]);

    expect(decision.state).toBe("CORRECTION_READY");
    expect(decision.reverification_discrepancies).toEqual([
      {
        code: "WIDTH_LOW",
        severity: "REVIEW",
        summary: "Upper arms are slightly too narrow.",
        views: ["front"],
        evidence_targets: ["width", "silhouette"],
      },
    ]);
    expect(decision.evidence_reuse).toEqual({
      source_handle: "verificationevidence:first",
      stale_views: ["front"],
      reusable_views: ["left"],
      reusable_evidence: [
        { view: "left", handle: "verificationevidence:first" },
      ],
      basis: "TARGETED_VIEW_PROVENANCE",
    });
  });

  test("bounds correction candidate count by verification risk", () => {
    const registry = new CorrectionLoopRegistry();
    const lowHandle = registry.start({
      recipe_id: "asset",
      base_recipe: recipe(),
      verification_request: {
        domain: "GEOMETRY",
        source: "capture_model_views",
        verification_risk: "LOW",
        views: ["front"],
        views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        size: 256,
        size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        scope_instance_ids: ["arms:0", "arms:1"],
      },
      verification_evidence_handle: "verificationevidence:first",
      discrepancies: [{
        code: "WIDTH_LOW",
        severity: "REVIEW",
        summary: "Upper arms are slightly too narrow.",
      }],
    });

    const twoCandidates = [1.03, 1.05].map((value, index) => ({
      id: "resize-" + index,
      predicted_error: 0.1 + index * 0.01,
      mutation_cost: 0.1,
      risk: 0.1,
      patch: {
        correction_family: "RESIZE" as const,
        intent: {
          target: { semantic_group: "upper_arm" },
          operation: {
            kind: "RESIZE_AXIS" as const,
            axis: "X" as const,
            mode: "MULTIPLY" as const,
            value,
            anchor: "MIN" as const,
          },
        },
      },
    }));

    const low = registry.planGeometryCorrection(lowHandle, twoCandidates);
    expect(low.state).toBe("BLOCKED");
    expect(low.blocked_reason).toBe("CANDIDATE_BUDGET_EXCEEDED");

    const mediumHandle = registry.start({
      recipe_id: "asset-medium",
      base_recipe: { ...recipe(), id: "asset-medium", name: "asset-medium" },
      verification_request: {
        domain: "GEOMETRY",
        source: "capture_model_views",
        verification_risk: "MEDIUM",
        views: ["front", "left"],
        views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        size: 384,
        size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        scope_instance_ids: ["arms:0", "arms:1"],
      },
      verification_evidence_handle: "verificationevidence:medium",
      discrepancies: [{
        code: "WIDTH_LOW",
        severity: "REVIEW",
        summary: "Upper arms are slightly too narrow.",
      }],
    });
    expect(registry.planGeometryCorrection(mediumHandle, twoCandidates).state).toBe(
      "CORRECTION_READY"
    );
  });

  test("allows three candidates at HIGH risk but rejects a fourth", () => {
    const makeHandle = (suffix: string) => {
      const registry = new CorrectionLoopRegistry();
      const handle = registry.start({
        recipe_id: "asset-" + suffix,
        base_recipe: { ...recipe(), id: "asset-" + suffix, name: "asset-" + suffix },
        verification_request: {
          domain: "GEOMETRY",
          source: "capture_model_views",
          verification_risk: "HIGH",
          views: ["front", "left", "top"],
          views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
          size: 512,
          size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
          scope_instance_ids: ["arms:0", "arms:1"],
        },
        verification_evidence_handle: "verificationevidence:" + suffix as any,
        discrepancies: [{
          code: "WIDTH_LOW",
          severity: "REVIEW",
          summary: "Upper arms are slightly too narrow.",
        }],
      });
      return { registry, handle };
    };
    const candidates = [1.02, 1.04, 1.06, 1.08].map((value, index) => ({
      id: "resize-" + index,
      predicted_error: 0.1 + index * 0.01,
      mutation_cost: 0.1,
      risk: 0.1,
      patch: {
        correction_family: "RESIZE" as const,
        intent: {
          target: { semantic_group: "upper_arm" },
          operation: {
            kind: "RESIZE_AXIS" as const,
            axis: "X" as const,
            mode: "MULTIPLY" as const,
            value,
          },
        },
      },
    }));
    const allowed = makeHandle("high-three");
    expect(
      allowed.registry.planGeometryCorrection(allowed.handle, candidates.slice(0, 3)).state
    ).toBe("CORRECTION_READY");
    const blocked = makeHandle("high-four");
    expect(
      blocked.registry.planGeometryCorrection(blocked.handle, candidates).blocked_reason
    ).toBe("CANDIDATE_BUDGET_EXCEEDED");
  });

  test("rejects correction family and semantic operation mismatch", () => {
    const registry = new CorrectionLoopRegistry();
    const handle = registry.start({
      recipe_id: "asset",
      base_recipe: recipe(),
      verification_request: {
        domain: "GEOMETRY",
        source: "capture_model_views",
        verification_risk: "LOW",
        views: ["front"],
        views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        size: 256,
        size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        scope_instance_ids: ["arms:0", "arms:1"],
      },
      verification_evidence_handle: "verificationevidence:first",
      discrepancies: [{
        code: "WIDTH_LOW",
        severity: "REVIEW",
        summary: "Upper arms are slightly too narrow.",
      }],
    });

    const decision = registry.planGeometryCorrection(handle, [{
      id: "wrong-family",
      predicted_error: 0.1,
      mutation_cost: 0.1,
      risk: 0.1,
      patch: {
        correction_family: "ROTATE",
        intent: {
          target: { semantic_group: "upper_arm" },
          operation: {
            kind: "RESIZE_AXIS",
            axis: "X",
            mode: "MULTIPLY",
            value: 1.05,
          },
        },
      },
    }]);

    expect(decision.state).toBe("BLOCKED");
    expect(decision.blocked_reason).toBe("CORRECTION_FAMILY_MISMATCH");
  });

  test("returns only compact solver decision metadata instead of candidate payloads", () => {
    const registry = new CorrectionLoopRegistry();
    const handle = registry.start({
      recipe_id: "asset-summary",
      base_recipe: { ...recipe(), id: "asset-summary", name: "asset-summary" },
      verification_request: {
        domain: "GEOMETRY",
        source: "capture_model_views",
        verification_risk: "MEDIUM",
        views: ["front", "left"],
        views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        size: 384,
        size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        scope_instance_ids: ["arms:0", "arms:1"],
      },
      verification_evidence_handle: "verificationevidence:summary",
      discrepancies: [{
        code: "WIDTH_LOW",
        severity: "REVIEW",
        summary: "Upper arms are slightly too narrow.",
      }],
    });

    const decision = registry.planGeometryCorrection(handle, [
      {
        id: "resize-a",
        predicted_error: 0.08,
        mutation_cost: 0.1,
        risk: 0.12,
        patch: {
          correction_family: "RESIZE",
          intent: {
            target: { semantic_group: "upper_arm" },
            operation: {
              kind: "RESIZE_AXIS",
              axis: "X",
              mode: "MULTIPLY",
              value: 1.03,
            },
          },
        },
      },
      {
        id: "resize-b",
        predicted_error: 0.04,
        mutation_cost: 0.08,
        risk: 0.09,
        patch: {
          correction_family: "RESIZE",
          intent: {
            target: { semantic_group: "upper_arm" },
            operation: {
              kind: "RESIZE_AXIS",
              axis: "X",
              mode: "MULTIPLY",
              value: 1.05,
            },
          },
        },
      },
    ]);

    expect(decision.state).toBe("CORRECTION_READY");
    expect(decision.decision_summary).toEqual({
      selected_candidate_id: "resize-b",
      rejected_candidate_ids: ["resize-a"],
      selected_metrics: {
        predicted_error: 0.04,
        mutation_cost: 0.08,
        risk: 0.09,
      },
      solver_score: expect.any(Number),
      candidate_count: 2,
      candidate_budget: 2,
    });
    expect(JSON.stringify(decision.decision_summary)).not.toContain("geometry_operations");
    expect(JSON.stringify(decision.decision_summary)).not.toContain("semantic_group");
  });

  test("projects a pruned correction continuation without internal recipe or solver history", () => {
    const registry = new CorrectionLoopRegistry();
    const handle = registry.start({
      recipe_id: "asset-continuation",
      base_recipe: { ...recipe(), id: "asset-continuation", name: "asset-continuation" },
      verification_request: {
        domain: "GEOMETRY",
        source: "capture_model_views",
        verification_risk: "MEDIUM",
        views: ["front", "left"],
        views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        size: 384,
        size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        scope_instance_ids: ["arms:0", "arms:1"],
      },
      verification_evidence_handle: "verificationevidence:continuation",
      discrepancies: [
        {
          code: "WIDTH_LOW",
          severity: "REVIEW",
          summary: "Upper arms are slightly too narrow.",
          views: ["front"],
          evidence_targets: ["width"],
        },
        {
          code: "SHOULDER_CONTACT",
          severity: "REVIEW",
          summary: "Shoulder contact requires separate review.",
          views: ["left"],
          evidence_targets: ["attachment"],
        },
      ],
    });

    const before = registry.projectContinuation(handle);
    expect(before).toMatchObject({
      protocol: "lazydesigner-correction-continuation-v1",
      state: "READY",
      unresolved_count: 2,
      verification: { pending: false, risk: "MEDIUM" },
    });
    expect(before.fresh_view_evidence).toEqual([
      { view: "front", handle: "verificationevidence:continuation" },
      { view: "left", handle: "verificationevidence:continuation" },
    ]);

    registry.planGeometryCorrection(handle, [{
      id: "widen-arms",
      predicted_error: 0.1,
      mutation_cost: 0.1,
      risk: 0.1,
      patch: {
        target_discrepancy_codes: ["WIDTH_LOW"],
        correction_family: "RESIZE",
        intent: {
          target: { semantic_group: "upper_arm" },
          operation: {
            kind: "RESIZE_AXIS",
            axis: "X",
            mode: "MULTIPLY",
            value: 1.05,
          },
        },
      },
    }]);

    const pending = registry.projectContinuation(handle);
    expect(pending.state).toBe("VERIFY_PENDING");
    expect(pending.verification.target_discrepancy_codes).toEqual(["WIDTH_LOW"]);
    expect(pending.verification.stale_views).toEqual(["front"]);
    expect(pending.fresh_view_evidence).toEqual([
      { view: "left", handle: "verificationevidence:continuation" },
    ]);
    expect(JSON.stringify(pending)).not.toContain("base_recipe");
    expect(JSON.stringify(pending)).not.toContain("evidence_fingerprint");
    expect(JSON.stringify(pending)).not.toContain("selected_candidate_id");
    expect(JSON.stringify(pending)).not.toContain("rejected_candidate_ids");
    expect(JSON.stringify(pending)).not.toContain("scope_instance_ids");

    registry.updateEvidence(handle, "verificationevidence:front-fresh", []);
    const after = registry.projectContinuation(handle);
    expect(after.state).toBe("READY");
    expect(after.unresolved.map((item) => item.code)).toEqual([
      "SHOULDER_CONTACT",
    ]);
    expect(after.fresh_view_evidence).toEqual([
      { view: "front", handle: "verificationevidence:front-fresh" },
      { view: "left", handle: "verificationevidence:continuation" },
    ]);
    expect(after.verification.pending).toBe(false);
  });

  test("second correction remains VERIFY_PENDING until its fresh evidence arrives", () => {
    const registry = new CorrectionLoopRegistry();
    const handle = registry.start({
      recipe_id: "asset-second-pending",
      base_recipe: { ...recipe(), id: "asset-second-pending", name: "asset-second-pending" },
      verification_request: {
        domain: "GEOMETRY",
        source: "capture_model_views",
        verification_risk: "LOW",
        views: ["front"],
        views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        size: 256,
        size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        scope_instance_ids: ["arms:0", "arms:1"],
      },
      verification_evidence_handle: "verificationevidence:first",
      discrepancies: [{
        code: "WIDTH_LOW",
        severity: "REVIEW",
        summary: "Upper arms remain too narrow.",
        views: ["front"],
        evidence_targets: ["width"],
      }],
    });

    const candidate = {
      id: "widen",
      predicted_error: 0.1,
      mutation_cost: 0.1,
      risk: 0.1,
      patch: {
        target_discrepancy_codes: ["WIDTH_LOW"],
        correction_family: "RESIZE" as const,
        intent: {
          target: { semantic_group: "upper_arm" },
          operation: {
            kind: "RESIZE_AXIS" as const,
            axis: "X" as const,
            mode: "MULTIPLY" as const,
            value: 1.02,
          },
        },
      },
    };

    expect(registry.planGeometryCorrection(handle, [candidate]).attempt).toBe(1);
    registry.updateEvidence(
      handle,
      "verificationevidence:second",
      [{
        code: "WIDTH_LOW",
        severity: "REVIEW",
        summary: "Width improved but remains too narrow.",
        views: ["front"],
        evidence_targets: ["width"],
      }]
    );
    expect(registry.planGeometryCorrection(handle, [candidate]).attempt).toBe(2);
    expect(registry.projectContinuation(handle).state).toBe("VERIFY_PENDING");
  });

  test("targeted evidence update preserves unrelated discrepancies and tracks per-view handles across rounds", () => {
    const registry = new CorrectionLoopRegistry();
    const handle = registry.start({
      recipe_id: "asset",
      base_recipe: recipe(),
      verification_request: {
        domain: "GEOMETRY",
        source: "capture_model_views",
        verification_risk: "MEDIUM",
        views: ["front", "left"],
        views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        size: 384,
        size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        scope_instance_ids: ["arms:0", "arms:1"],
      },
      verification_evidence_handle: "verificationevidence:first",
      discrepancies: [
        {
          code: "WIDTH_LOW",
          severity: "REVIEW",
          summary: "Upper arms are slightly too narrow.",
          views: ["front"],
          evidence_targets: ["width"],
        },
        {
          code: "SHOULDER_CONTACT",
          severity: "REVIEW",
          summary: "Shoulder contact requires separate review.",
          views: ["left"],
          evidence_targets: ["attachment"],
        },
      ],
    });

    const first = registry.planGeometryCorrection(handle, [{
      id: "widen-arms",
      predicted_error: 0.1,
      mutation_cost: 0.1,
      risk: 0.1,
      patch: {
        target_discrepancy_codes: ["WIDTH_LOW"],
        intent: {
          target: { semantic_group: "upper_arm" },
          operation: {
            kind: "RESIZE_AXIS",
            axis: "X",
            mode: "MULTIPLY",
            value: 1.05,
            anchor: "MIN",
          },
        },
      },
    }]);
    expect(first.evidence_reuse?.reusable_evidence).toEqual([
      { view: "left", handle: "verificationevidence:first" },
    ]);

    registry.updateEvidence(handle, "verificationevidence:front-second", []);

    const afterUpdate = registry.get(handle);
    expect(afterUpdate.discrepancies).toEqual([
      {
        code: "SHOULDER_CONTACT",
        severity: "REVIEW",
        summary: "Shoulder contact requires separate review.",
        views: ["left"],
        evidence_targets: ["attachment"],
      },
    ]);
    expect(afterUpdate.view_evidence_handles).toMatchObject({
      front: "verificationevidence:front-second",
      left: "verificationevidence:first",
    });

    const second = registry.planGeometryCorrection(handle, [{
      id: "fix-contact",
      predicted_error: 0.1,
      mutation_cost: 0.1,
      risk: 0.1,
      patch: {
        target_discrepancy_codes: ["SHOULDER_CONTACT"],
        intent: {
          target: { semantic_group: "upper_arm" },
          operation: {
            kind: "TRANSLATE",
            delta: [0, 0, 0.25],
          },
        },
      },
    }]);

    expect(second.evidence_reuse).toMatchObject({
      stale_views: ["left"],
      reusable_views: ["front"],
      reusable_evidence: [
        { view: "front", handle: "verificationevidence:front-second" },
      ],
      basis: "TARGETED_VIEW_PROVENANCE",
    });
  });

  test("falls back to recapturing all request views when discrepancy view provenance is missing", () => {
    const registry = new CorrectionLoopRegistry();
    const handle = registry.start({
      recipe_id: "asset",
      base_recipe: recipe(),
      verification_request: {
        domain: "GEOMETRY",
        source: "capture_model_views",
        verification_risk: "MEDIUM",
        views: ["front", "left"],
        views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        size: 384,
        size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        scope_instance_ids: ["arms:0", "arms:1"],
      },
      verification_evidence_handle: "verificationevidence:first",
      discrepancies: [{
        code: "WIDTH_LOW",
        severity: "REVIEW",
        summary: "Upper arms are slightly too narrow.",
      }],
    });

    const decision = registry.planGeometryCorrection(handle, [{
      id: "widen-arms",
      predicted_error: 0.1,
      mutation_cost: 0.1,
      risk: 0.1,
      patch: {
        target_discrepancy_codes: ["WIDTH_LOW"],
        intent: {
          target: { semantic_group: "upper_arm" },
          operation: {
            kind: "RESIZE_AXIS",
            axis: "X",
            mode: "MULTIPLY",
            value: 1.05,
            anchor: "MIN",
          },
        },
      },
    }]);

    expect(decision.evidence_reuse).toEqual({
      source_handle: "verificationevidence:first",
      stale_views: ["front", "left"],
      reusable_views: [],
      reusable_evidence: [],
      basis: "CONSERVATIVE_ALL_VIEWS",
    });
  });

  test("rejects a correction that targets a discrepancy absent from current evidence", () => {
    const registry = new CorrectionLoopRegistry();
    const handle = registry.start({
      recipe_id: "asset",
      base_recipe: recipe(),
      verification_request: {
        domain: "GEOMETRY",
        source: "capture_model_views",
        verification_risk: "LOW",
        views: ["front"],
        views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        size: 256,
        size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        scope_instance_ids: ["arms:0", "arms:1"],
      },
      verification_evidence_handle: "verificationevidence:first",
      discrepancies: [{
        code: "WIDTH_LOW",
        severity: "REVIEW",
        summary: "Upper arms are slightly too narrow.",
      }],
    });

    const decision = registry.planGeometryCorrection(handle, [{
      id: "wrong-target",
      predicted_error: 0.1,
      mutation_cost: 0.1,
      risk: 0.1,
      patch: {
        target_discrepancy_codes: ["UNKNOWN_CODE"],
        intent: {
          target: { semantic_group: "upper_arm" },
          operation: {
            kind: "RESIZE_AXIS",
            axis: "X",
            mode: "MULTIPLY",
            value: 1.05,
            anchor: "MIN",
          },
        },
      },
    }]);

    expect(decision.state).toBe("BLOCKED");
    expect(decision.blocked_reason).toBe("NO_ELIGIBLE_CORRECTION");
  });

  test("blocks a second correction when no new evidence exists", () => {
    const registry = new CorrectionLoopRegistry();
    const handle = registry.start({
      recipe_id: "asset",
      base_recipe: recipe(),
      verification_request: {
        domain: "GEOMETRY",
        source: "capture_model_views",
        verification_risk: "LOW",
        views: ["front"],
        views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        size: 256,
        size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        scope_instance_ids: ["arms:0", "arms:1"],
      },
      verification_evidence_handle: "verificationevidence:first",
      discrepancies: [{
        code: "WIDTH_LOW",
        severity: "REVIEW",
        summary: "Upper arms are slightly too narrow.",
      }],
    });

    const candidates = [{
      id: "widen-arms",
      predicted_error: 0.1,
      mutation_cost: 0.1,
      risk: 0.1,
      patch: {
        intent: {
          target: { semantic_group: "upper_arm" },
          operation: {
            kind: "RESIZE_AXIS" as const,
            axis: "X" as const,
            mode: "MULTIPLY" as const,
            value: 1.05,
            anchor: "MIN" as const,
          },
        },
      },
    }];

    expect(registry.planGeometryCorrection(handle, candidates).state).toBe("CORRECTION_READY");
    const second = registry.planGeometryCorrection(handle, candidates);
    expect(second.state).toBe("BLOCKED");
    expect(second.blocked_reason).toBe("REPEATED_FAILURE_WITHOUT_NEW_EVIDENCE");
  });

  test("allows a second bounded correction only after fresh verification evidence", () => {
    const registry = new CorrectionLoopRegistry();
    const handle = registry.start({
      recipe_id: "asset",
      base_recipe: recipe(),
      verification_request: {
        domain: "GEOMETRY",
        source: "capture_model_views",
        verification_risk: "LOW",
        views: ["front"],
        views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        size: 256,
        size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        scope_instance_ids: ["arms:0", "arms:1"],
      },
      verification_evidence_handle: "verificationevidence:first",
      discrepancies: [{
        code: "WIDTH_LOW",
        severity: "REVIEW",
        summary: "Upper arms are slightly too narrow.",
      }],
    });
    const candidates = [{
      id: "widen-arms",
      predicted_error: 0.1,
      mutation_cost: 0.1,
      risk: 0.1,
      patch: {
        intent: {
          target: { semantic_group: "upper_arm" },
          operation: {
            kind: "RESIZE_AXIS" as const,
            axis: "X" as const,
            mode: "MULTIPLY" as const,
            value: 1.02,
            anchor: "MIN" as const,
          },
        },
      },
    }];

    expect(registry.planGeometryCorrection(handle, candidates).attempt).toBe(1);
    registry.updateEvidence(
      handle,
      "verificationevidence:second",
      [{
        code: "WIDTH_STILL_LOW",
        severity: "REVIEW",
        summary: "Width improved but remains slightly low.",
      }]
    );
    const second = registry.planGeometryCorrection(handle, candidates);
    expect(second.state).toBe("CORRECTION_READY");
    expect(second.attempt).toBe(2);
  });
});
