import { describe, expect, test } from "bun:test";
import { runZeroWasteWorkflowBenchmark } from "@/scripts/benchmark-zero-waste-workflow";

describe("Zero-Waste workflow benchmark", () => {
  test("workflow optimization removes only non-decision calls and preserves quality gates", () => {
    const workflows = runZeroWasteWorkflowBenchmark();

    expect(workflows).toHaveLength(9);
    for (const workflow of workflows) {
      expect(workflow.quality_preserved, workflow.workflow).toBe(true);
      expect(
        Object.values(workflow.quality_checks).every(Boolean),
        workflow.workflow
      ).toBe(true);
      expect(
        workflow.optimized.ai_payload_bytes,
        workflow.workflow
      ).toBeLessThan(workflow.baseline.ai_payload_bytes);
      expect(workflow.optimized.calls, workflow.workflow).toBeLessThanOrEqual(
        workflow.baseline.calls
      );

      const removedCalls =
        workflow.baseline.calls - workflow.optimized.calls;
      expect(removedCalls, workflow.workflow).toBeLessThanOrEqual(
        workflow.redundant_baseline_calls_removed
      );
    }
  });

  test("known-target and visual paths never trade verification for lower call count", () => {
    const byName = new Map(
      runZeroWasteWorkflowBenchmark().map(
        (workflow) => [workflow.workflow, workflow] as const
      )
    );
    const known = byName.get("known_target_geometry_edit")!;
    const unknown = byName.get("unknown_target_geometry_edit")!;

    for (const workflow of [known, unknown]) {
      expect(
        workflow.optimized.steps.some((item) => item.kind === "verify")
      ).toBe(true);
      expect(
        workflow.optimized.steps.filter((item) => item.kind === "verify")
          .every((item) => item.required_for_decision)
      ).toBe(true);
    }
  });

  test("inspect accounting excludes describe/schema payload", () => {
    const workflow = runZeroWasteWorkflowBenchmark().find(
      (item) => item.workflow === "unknown_target_geometry_edit"
    )!;
    const baselineRequiredInspect = workflow.baseline.steps.find(
      (item) => item.kind === "inspect" && item.required_for_decision
    )!;
    const optimizedInspect = workflow.optimized.steps.find(
      (item) => item.kind === "inspect"
    )!;

    expect(optimizedInspect.ai_payload_bytes).toBeLessThan(
      baselineRequiredInspect.ai_payload_bytes
    );
    expect(optimizedInspect.reason).toContain(
      "omits redundant NO_CHANGE control_delta"
    );
  });

  test("receipt-only workflows eliminate confirmation reads but keep authoritative state", () => {
    const receiptWorkflows = runZeroWasteWorkflowBenchmark().filter(
      (workflow) =>
        workflow.workflow === "hierarchy_receipt_edit" ||
        workflow.workflow === "material_receipt_edit" ||
        workflow.workflow === "animation_effect_receipt_edit"
    );

    for (const workflow of receiptWorkflows) {
      expect(
        workflow.baseline.steps.some(
          (item) => item.kind === "inspect" && !item.required_for_decision
        )
      ).toBe(true);
      expect(
        workflow.optimized.steps.some((item) => item.kind === "inspect")
      ).toBe(false);
      expect(workflow.quality_preserved).toBe(true);
    }
  });

  test("visual correction reduces image/context load without weakening the quality gate", () => {
    const visual = runZeroWasteWorkflowBenchmark().find(
      (workflow) => workflow.workflow === "visual_local_correction"
    )!;

    expect(visual.quality_preserved).toBe(true);
    expect(visual.optimized.image_inputs).toBeLessThan(visual.baseline.image_inputs);
    expect(visual.optimized.image_inputs).toBe(2);
    expect(visual.baseline.image_inputs).toBe(10);
    expect(visual.optimized.image_pixel_area).toBe(2 * 256 * 256);
    expect(visual.baseline.image_pixel_area).toBe(10 * 512 * 512);
    expect(visual.optimized.image_pixel_area).toBeLessThan(
      visual.baseline.image_pixel_area
    );
    expect(visual.optimized.high_reasoning_decisions).toBeLessThan(
      visual.baseline.high_reasoning_decisions
    );
    expect(visual.optimized.steps.some(
      (step) => step.kind === "mutate" && step.reasoning_class === "LOW"
    )).toBe(true);
    expect(visual.quality_checks.visual_verification_kept).toBe(true);
    expect(visual.quality_checks.pre_and_post_evidence_kept).toBe(true);
    expect(visual.quality_checks.convergence_gate_kept).toBe(true);
    expect(
      visual.quality_checks.cross_view_expansion_available_if_risk_detected
    ).toBe(true);
    expect(
      visual.quality_checks.unrelated_discrepancy_history_retained_locally
    ).toBe(true);
    expect(visual.quality_checks.targeted_reverification_only).toBe(true);
    const optimizedVerification = visual.optimized.steps.find(
      (step) =>
        step.kind === "verify" &&
        JSON.stringify(step).includes("replayed_discrepancies")
    );
    expect(optimizedVerification).toBeDefined();
    expect(JSON.stringify(optimizedVerification)).toContain("WIDTH_HIGH");
    expect(JSON.stringify(optimizedVerification)).not.toContain(
      "shoulder contact needs independent review"
    );
  });

  test("cross-view reuse recaptures only stale evidence while retaining quality guards", () => {
    const workflow = runZeroWasteWorkflowBenchmark().find(
      (item) => item.workflow === "visual_cross_view_reuse"
    )!;
    expect(workflow.quality_preserved).toBe(true);
    expect(workflow.optimized.image_inputs).toBe(4);
    expect(workflow.baseline.image_inputs).toBe(6);
    expect(workflow.optimized.image_pixel_area).toBeLessThan(
      workflow.baseline.image_pixel_area
    );
    expect(workflow.quality_checks.targeted_stale_view_recaptured).toBe(true);
    expect(workflow.quality_checks.unaffected_view_reused).toBe(true);
    expect(workflow.quality_checks.cross_view_guard_retained).toBe(true);
    expect(
      workflow.quality_checks.incomplete_provenance_falls_back_conservatively
    ).toBe(true);
    expect(workflow.quality_checks.per_view_handles_survive_multiple_rounds).toBe(
      true
    );
    expect(
      workflow.quality_checks.unrelated_discrepancies_survive_targeted_updates
    ).toBe(true);
  });

  test("candidate economy shrinks ambiguity output without changing the chosen correction", () => {
    const workflow = runZeroWasteWorkflowBenchmark().find(
      (item) => item.workflow === "correction_candidate_economy"
    )!;
    expect(workflow.quality_preserved).toBe(true);
    expect(workflow.optimized.ai_payload_bytes).toBeLessThan(
      workflow.baseline.ai_payload_bytes
    );
    expect(workflow.quality_checks.same_selected_candidate).toBe(true);
    expect(workflow.quality_checks.same_correction_family).toBe(true);
    expect(workflow.quality_checks.convergence_gate_kept).toBe(true);
    expect(workflow.quality_checks.candidate_budget_respected).toBe(true);
    expect(workflow.quality_checks.unsupported_family_candidates_removed).toBe(
      true
    );
    expect(
      workflow.quality_checks.full_candidate_payload_not_carried_forward
    ).toBe(true);
    expect(workflow.quality_checks.rejected_candidates_reduced_to_ids).toBe(true);
    const continuation = workflow.optimized.steps.find(
      (step) =>
        step.kind === "mutate" &&
        JSON.stringify(step).includes("decision_summary")
    );
    expect(continuation).toBeDefined();
    expect(JSON.stringify(continuation)).toContain("resize-096");
    expect(JSON.stringify(continuation)).not.toContain("predicted_error\":0.07");

  });

  test("failed mutations remove unsafe retries rather than hiding uncertainty", () => {
    const failure = runZeroWasteWorkflowBenchmark().find(
      (workflow) => workflow.workflow === "failed_mutation_recovery"
    )!;

    expect(
      failure.baseline.steps.some(
        (item) => item.kind === "mutate" && !item.required_for_decision
      )
    ).toBe(true);
    expect(failure.optimized.steps.map((item) => item.kind)).toEqual([
      "recovery",
    ]);
    expect(failure.quality_checks.unknown_scope_complete).toBe(true);
    expect(failure.quality_checks.no_false_retry).toBe(true);
  });

  test("aggregate workflow proxy produces material savings without claiming model tokens", () => {
    const workflows = runZeroWasteWorkflowBenchmark();
    const beforeBytes = workflows.reduce(
      (sum, item) => sum + item.baseline.ai_payload_bytes,
      0
    );
    const afterBytes = workflows.reduce(
      (sum, item) => sum + item.optimized.ai_payload_bytes,
      0
    );
    const beforeCalls = workflows.reduce(
      (sum, item) => sum + item.baseline.calls,
      0
    );
    const afterCalls = workflows.reduce(
      (sum, item) => sum + item.optimized.calls,
      0
    );

    expect(afterBytes).toBeLessThan(beforeBytes);
    expect(afterCalls).toBeLessThan(beforeCalls);
    expect(((beforeBytes - afterBytes) / beforeBytes) * 100).toBeGreaterThan(10);
    expect(workflows.every((item) => item.quality_preserved)).toBe(true);
  });
});
