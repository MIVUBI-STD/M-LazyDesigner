import { describe, expect, test } from "bun:test";
import { runZeroWasteWorkflowBenchmark } from "@/scripts/benchmark-zero-waste-workflow";

describe("Zero-Waste workflow benchmark", () => {
  test("workflow optimization removes only non-decision calls and preserves quality gates", () => {
    const workflows = runZeroWasteWorkflowBenchmark();

    expect(workflows).toHaveLength(6);
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
