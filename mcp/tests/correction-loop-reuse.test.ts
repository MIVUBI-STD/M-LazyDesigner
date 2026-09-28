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
    expect(decision.decision_summary?.selected_candidate_id).toBe("widen-arms");
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

  test("selects DECISION_SUMMARY automatically for the immediate post-solver handoff", () => {
    const registry = new CorrectionLoopRegistry();
    const handle = registry.start({
      recipe_id: "asset-mode",
      base_recipe: { ...recipe(), id: "asset-mode", name: "asset-mode" },
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
      verification_evidence_handle: "verificationevidence:mode",
      discrepancies: [{
        code: "WIDTH_LOW",
        severity: "REVIEW",
        summary: "Upper arms are slightly too narrow.",
      }],
    });

    const decision = registry.planGeometryCorrection(handle, [{
      id: "resize",
      predicted_error: 0.05,
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
    }]);

    expect(decision.continuation_mode).toBe("DECISION_SUMMARY");
    expect(registry.projectContinuation(handle).mode).toBe("VERIFY_PENDING");
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

  test("deduplicates unchanged continuation payloads by deterministic identity", () => {
    const registry = new CorrectionLoopRegistry();
    const handle = registry.start({
      recipe_id: "asset-dedup",
      base_recipe: { ...recipe(), id: "asset-dedup", name: "asset-dedup" },
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
      verification_evidence_handle: "verificationevidence:dedup",
      discrepancies: [{
        code: "WIDTH_LOW",
        severity: "REVIEW",
        summary: "Upper arms are slightly too narrow.",
        views: ["front"],
        evidence_targets: ["width"],
      }],
    });

    const first = registry.projectContinuationDelivery(handle);
     expect(first.delivery).toBe("FULL");
    expect(first.group).toBeNull();
    expect(first.payload?.continuation_id).toBe(first.continuation_id);
    expect(first.delta).toBeNull();

    const second = registry.projectContinuationDelivery(handle, [
      first.continuation_id,
    ]);
    expect(second).toEqual({
      continuation_id: first.continuation_id,
       delivery: "CACHED",
      payload: null,
      delta: null,
      group: null,
    });

    registry.planGeometryCorrection(handle, [{
      id: "resize",
      predicted_error: 0.05,
      mutation_cost: 0.08,
      risk: 0.09,
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

    const changed = registry.projectContinuationDelivery(handle, [
      first.continuation_id,
    ]);
     expect(changed.delivery).toBe("DELTA");
    expect(changed.continuation_id).not.toBe(first.continuation_id);
    expect(changed.payload).toBeNull();
    expect(changed.delta).toMatchObject({
      from_continuation_id: first.continuation_id,
      to_continuation_id: changed.continuation_id,
      mode: "VERIFY_PENDING",
      state: "VERIFY_PENDING",
      attempt: 1,
      unresolved_count: 1,
      verification: {
        pending: true,
        target_discrepancy_codes: ["WIDTH_LOW"],
        stale_views: ["front"],
      },
    });
  });

  test("never defers decision-changing continuation boundaries", () => {
    const registry = new CorrectionLoopRegistry();
    const handle = registry.start({
      recipe_id: "asset-group-boundary",
      base_recipe: { ...recipe(), id: "asset-group-boundary", name: "asset-group-boundary" },
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
      verification_evidence_handle: "verificationevidence:group-boundary",
      discrepancies: [{
        code: "WIDTH_LOW",
        severity: "REVIEW",
        summary: "Upper arms are slightly too narrow.",
        views: ["front"],
        evidence_targets: ["width"],
      }],
    });

    const first = registry.projectContinuationDelivery(handle);
    registry.beginContinuationGroup(handle, "EXECUTION_COHORT");
    registry.planGeometryCorrection(handle, [{
      id: "resize",
      predicted_error: 0.05,
      mutation_cost: 0.08,
      risk: 0.09,
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

    const boundary = registry.projectContinuationDelivery(handle, [
      first.continuation_id,
    ]);
    expect(boundary.delivery).toBe("DELTA");
    expect(boundary.delta?.mode).toBe("VERIFY_PENDING");
    expect(boundary.group).toBeNull();
  });

  test("groups same-boundary continuation churn into one final delivery", () => {
    const registry = new CorrectionLoopRegistry();
    const handle = registry.start({
      recipe_id: "asset-group-same-boundary",
      base_recipe: { ...recipe(), id: "asset-group-same-boundary", name: "asset-group-same-boundary" },
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
      verification_evidence_handle: "verificationevidence:group-same",
      discrepancies: [{
        code: "WIDTH_LOW",
        severity: "REVIEW",
        summary: "Upper arms are slightly too narrow.",
        views: ["front"],
        evidence_targets: ["width"],
      }],
    });

    const first = registry.projectContinuationDelivery(handle);
    const group = registry.beginContinuationGroup(handle, "VERIFICATION_COHORT");
    expect(
      registry.projectContinuationDelivery(handle, [first.continuation_id]).delivery
    ).toBe("DEFERRED");
    expect(
      registry.projectContinuationDelivery(handle, [first.continuation_id]).delivery
    ).toBe("DEFERRED");
    const committed = registry.commitContinuationGroup(handle, [
      first.continuation_id,
    ]);
    expect(committed.delivery).toBe("CACHED");
    expect(committed.group).toBeNull();
    expect(group.kind).toBe("VERIFICATION_COHORT");
  });

  test("aborting a continuation group restores normal delivery without publishing intermediate state", () => {
    const registry = new CorrectionLoopRegistry();
    const handle = registry.start({
      recipe_id: "asset-group-abort",
      base_recipe: { ...recipe(), id: "asset-group-abort", name: "asset-group-abort" },
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
      verification_evidence_handle: "verificationevidence:abort",
      discrepancies: [{
        code: "WIDTH_LOW",
        severity: "REVIEW",
        summary: "Upper arms are slightly too narrow.",
        views: ["front"],
        evidence_targets: ["width"],
      }],
    });

    const first = registry.projectContinuationDelivery(handle);
    registry.beginContinuationGroup(handle, "EXECUTION_COHORT");
    expect(
      registry.projectContinuationDelivery(handle, [first.continuation_id]).delivery
    ).toBe("DEFERRED");
    registry.abortContinuationGroup(handle);
    expect(
      registry.projectContinuationDelivery(handle, [first.continuation_id]).delivery
    ).toBe("CACHED");
  });

  test("sends only changed view evidence and resolved discrepancy codes as continuation delta", () => {
    const registry = new CorrectionLoopRegistry();
    const handle = registry.start({
      recipe_id: "asset-delta",
      base_recipe: { ...recipe(), id: "asset-delta", name: "asset-delta" },
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
      verification_evidence_handle: "verificationevidence:initial",
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

    const first = registry.projectContinuationDelivery(handle);
    registry.planGeometryCorrection(handle, [{
      id: "resize",
      predicted_error: 0.05,
      mutation_cost: 0.08,
      risk: 0.09,
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
    const pending = registry.projectContinuationDelivery(handle, [
      first.continuation_id,
    ]);
    expect(pending.delivery).toBe("DELTA");

    registry.updateEvidence(handle, "verificationevidence:front-fresh", []);
    const ready = registry.projectContinuationDelivery(handle, [
      pending.continuation_id,
    ]);
    expect(ready.delivery).toBe("DELTA");
    expect(ready.payload).toBeNull();
    expect(ready.delta).toMatchObject({
      resolved_discrepancy_codes: ["WIDTH_LOW"],
      fresh_view_evidence_upsert: [
        { view: "front", handle: "verificationevidence:front-fresh" },
      ],
      mode: "PRUNED_READY",
      state: "READY",
      unresolved_count: 1,
      verification: {
        pending: false,
        target_discrepancy_codes: [],
        stale_views: [],
      },
    });
    expect(ready.delta?.fresh_view_evidence_upsert).not.toContainEqual({
      view: "left",
      handle: "verificationevidence:initial",
    });
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
      mode: "CANDIDATE_CONTEXT",
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
    expect(pending.mode).toBe("VERIFY_PENDING");
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
    expect(after.mode).toBe("PRUNED_READY");
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
