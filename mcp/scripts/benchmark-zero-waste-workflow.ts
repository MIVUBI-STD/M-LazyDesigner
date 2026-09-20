import { runZeroWasteGoldenBenchmark } from "./benchmark-zero-waste-golden";

type StepKind =
  | "status"
  | "search"
  | "describe"
  | "inspect"
  | "mutate"
  | "verify"
  | "recovery";

type WorkflowStep = {
  kind: StepKind;
  ai_payload_bytes: number;
  required_for_decision: boolean;
  reason: string;
};

export type WorkflowGoldenResult = {
  workflow: string;
  baseline: {
    steps: WorkflowStep[];
    calls: number;
    ai_payload_bytes: number;
  };
  optimized: {
    steps: WorkflowStep[];
    calls: number;
    ai_payload_bytes: number;
  };
  saved_calls: number;
  saved_bytes: number;
  reduction_percent: number;
  redundant_baseline_calls_removed: number;
  quality_checks: Record<string, boolean>;
  quality_preserved: boolean;
};

function payloadBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function step(
  kind: StepKind,
  payload: unknown,
  requiredForDecision: boolean,
  reason: string
): WorkflowStep {
  return {
    kind,
    ai_payload_bytes: payloadBytes(payload),
    required_for_decision: requiredForDecision,
    reason,
  };
}

function summarize(
  workflow: string,
  baselineSteps: WorkflowStep[],
  optimizedSteps: WorkflowStep[],
  qualityChecks: Record<string, boolean>
): WorkflowGoldenResult {
  const baselineBytes = baselineSteps.reduce(
    (sum, item) => sum + item.ai_payload_bytes,
    0
  );
  const optimizedBytes = optimizedSteps.reduce(
    (sum, item) => sum + item.ai_payload_bytes,
    0
  );
  const savedBytes = Math.max(0, baselineBytes - optimizedBytes);
  const savedCalls = Math.max(0, baselineSteps.length - optimizedSteps.length);
  return {
    workflow,
    baseline: {
      steps: baselineSteps,
      calls: baselineSteps.length,
      ai_payload_bytes: baselineBytes,
    },
    optimized: {
      steps: optimizedSteps,
      calls: optimizedSteps.length,
      ai_payload_bytes: optimizedBytes,
    },
    saved_calls: savedCalls,
    saved_bytes: savedBytes,
    reduction_percent:
      baselineBytes === 0
        ? 0
        : Number(((savedBytes / baselineBytes) * 100).toFixed(2)),
    redundant_baseline_calls_removed: baselineSteps.filter(
      (item) => !item.required_for_decision
    ).length,
    quality_checks: qualityChecks,
    quality_preserved: Object.values(qualityChecks).every(Boolean),
  };
}

const representativeInspect = {
  element: {
    uuid: "cube-leg",
    name: "leg",
    type: "cube",
    parent: { uuid: "group-leg", name: "leg_root" },
    from: [0, 0, 0],
    to: [2, 8, 2],
    origin: [1, 0, 1],
    rotation: [0, 0, 0],
  },
};

const representativeSearch = {
  capabilities: [
    {
      capability_id: "manage_cubes",
      description: "Create or update Bedrock cubes.",
      tier: "primary",
      authoring_domain: "GEOMETRY",
      flags: ["destructive"],
    },
  ],
};

const representativeVisualVerify = {
  capture: {
    view: "front",
    project_uuid: "project-a",
    changed_targets: ["cube-leg"],
    evidence_state: "CURRENT",
  },
};

function goldenByTask() {
  return new Map(
    runZeroWasteGoldenBenchmark().map((item) => [item.task, item] as const)
  );
}

export function runZeroWasteWorkflowBenchmark(): WorkflowGoldenResult[] {
  const golden = goldenByTask();

  const geometry = golden.get("known_geometry_transform")!;
  const hierarchy = golden.get("hierarchy_receipt")!;
  const material = golden.get("material_receipt")!;
  const animation = golden.get("animation_effects_receipt")!;
  const discovery = golden.get("unknown_target_discovery")!;
  const failure = golden.get("failed_mutation_recovery")!;

  const knownTarget = summarize(
    "known_target_geometry_edit",
    [
      step(
        "inspect",
        representativeInspect,
        false,
        "Baseline reassurance read; target identity and relative mutation are already known."
      ),
      step(
        "mutate",
        { bytes: geometry.before_bytes },
        true,
        "Requested authored change."
      ),
      step(
        "inspect",
        representativeInspect,
        false,
        "Confirmation readback superseded by authoritative mutation receipt."
      ),
      step(
        "verify",
        representativeVisualVerify,
        true,
        "Geometry mutation remains visual and still requires decision-changing evidence."
      ),
    ],
    [
      step(
        "mutate",
        { bytes: geometry.after_bytes },
        true,
        "Direct known-target mutation with compact continuation receipt."
      ),
      step(
        "verify",
        representativeVisualVerify,
        true,
        "Visual quality gate is preserved."
      ),
    ],
    {
      task_semantics: geometry.quality_preserved,
      visual_verification_kept: true,
      target_identity_kept:
        geometry.semantic_checks.target_identity === true,
      freshness_kept:
        geometry.semantic_checks.freshness_preserved === true,
    }
  );

  const unknownTarget = summarize(
    "unknown_target_geometry_edit",
    [
      step(
        "search",
        {
          query: "leg cube geometry",
          count: 1,
          capabilities: representativeSearch.capabilities,
        },
        true,
        "Capability is unresolved."
      ),
      step(
        "describe",
        {
          capability: "inspect_elements",
          full_schema_bytes: discovery.before_bytes,
        },
        false,
        "Baseline schema reassurance after bounded discovery."
      ),
      step(
        "inspect",
        representativeInspect,
        true,
        "Target identity is unknown and must be resolved."
      ),
      step(
        "mutate",
        { bytes: geometry.before_bytes },
        true,
        "Requested authored change."
      ),
      step(
        "inspect",
        representativeInspect,
        false,
        "Confirmation readback superseded by receipt."
      ),
      step(
        "verify",
        representativeVisualVerify,
        true,
        "Visual decision remains required."
      ),
    ],
    [
      step(
        "search",
        representativeSearch,
        true,
        "One bounded search only because capability/target route is unresolved."
      ),
      step(
        "inspect",
        {
          projected_schema_bytes: discovery.after_bytes,
          result: representativeInspect,
        },
        true,
        "One focused target-resolution read."
      ),
      step(
        "mutate",
        { bytes: geometry.after_bytes },
        true,
        "Compact mutation continuation."
      ),
      step(
        "verify",
        representativeVisualVerify,
        true,
        "Visual decision remains required."
      ),
    ],
    {
      discovery_semantics: discovery.quality_preserved,
      geometry_semantics: geometry.quality_preserved,
      target_resolution_kept: true,
      visual_verification_kept: true,
    }
  );

  const hierarchyEdit = summarize(
    "hierarchy_receipt_edit",
    [
      step(
        "mutate",
        { bytes: hierarchy.before_bytes },
        true,
        "Hierarchy mutation."
      ),
      step(
        "inspect",
        representativeInspect,
        false,
        "Receipt is complete; reread does not change the next decision."
      ),
    ],
    [
      step(
        "mutate",
        { bytes: hierarchy.after_bytes },
        true,
        "Receipt-only hierarchy continuation."
      ),
    ],
    {
      receipt_complete: hierarchy.quality_preserved,
      hierarchy_state_kept:
        hierarchy.semantic_checks.authoritative_group_state === true,
      invalidation_kept:
        hierarchy.semantic_checks.invalidation_preserved === true,
    }
  );

  const materialEdit = summarize(
    "material_receipt_edit",
    [
      step(
        "mutate",
        { bytes: material.before_bytes },
        true,
        "Material mutation."
      ),
      step(
        "inspect",
        {
          material: "body",
          channels: ["color", "normal", "height", "mer"],
          saved: false,
        },
        false,
        "Structured material receipt already carries complete continuation state."
      ),
    ],
    [
      step(
        "mutate",
        { bytes: material.after_bytes },
        true,
        "Receipt-only material continuation."
      ),
    ],
    {
      receipt_complete: material.quality_preserved,
      material_identity_kept:
        material.semantic_checks.material_identity === true,
      channel_state_kept:
        material.semantic_checks.channel_state_preserved === true,
    }
  );

  const animationEffectEdit = summarize(
    "animation_effect_receipt_edit",
    [
      step(
        "mutate",
        { bytes: animation.before_bytes },
        true,
        "Animation-effect mutation."
      ),
      step(
        "inspect",
        {
          animation_uuid: "anim-a",
          effects: [{ keyframe_uuid: "kf-a", channel: "particle" }],
        },
        false,
        "Complete effect receipt already identifies the exact keyframe/effect."
      ),
    ],
    [
      step(
        "mutate",
        { bytes: animation.after_bytes },
        true,
        "Receipt-only animation-effect continuation."
      ),
    ],
    {
      receipt_complete: animation.quality_preserved,
      animation_identity_kept:
        animation.semantic_checks.animation_identity === true,
      effect_identity_kept:
        animation.semantic_checks.effect_identity === true,
    }
  );

  const failedMutation = summarize(
    "failed_mutation_recovery",
    [
      step(
        "mutate",
        { bytes: failure.before_bytes },
        true,
        "Mutation outcome is unknown."
      ),
      step(
        "mutate",
        { retry: "automatic" },
        false,
        "Unsafe baseline retry; a mutation may already have been applied."
      ),
    ],
    [
      step(
        "recovery",
        { bytes: failure.after_bytes },
        true,
        "Fail-closed UNKNOWN_OUTCOME continuation; no automatic retry."
      ),
    ],
    {
      recovery_semantics: failure.quality_preserved,
      unknown_scope_complete:
        failure.semantic_checks.unknown_scope_complete === true,
      no_false_retry: true,
    }
  );

  return [
    knownTarget,
    unknownTarget,
    hierarchyEdit,
    materialEdit,
    animationEffectEdit,
    failedMutation,
  ];
}

if (import.meta.main) {
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

  console.log(
    JSON.stringify(
      {
        schema: 1,
        benchmark: "zero-waste-workflow-proxy",
        proof_scope:
          "REMOTE_GITHUB deterministic workflow projection; call removal is allowed only by existing LazyDesigner routing/verification contracts. This is not Codex Astra token telemetry or live Blockbench visual proof.",
        workflows,
        aggregate: {
          workflow_count: workflows.length,
          quality_preserved: workflows.every(
            (workflow) => workflow.quality_preserved
          ),
          baseline_calls: beforeCalls,
          optimized_calls: afterCalls,
          saved_calls: Math.max(0, beforeCalls - afterCalls),
          before_bytes: beforeBytes,
          after_bytes: afterBytes,
          saved_bytes: Math.max(0, beforeBytes - afterBytes),
          reduction_percent:
            beforeBytes === 0
              ? 0
              : Number(
                  (((beforeBytes - afterBytes) / beforeBytes) * 100).toFixed(2)
                ),
        },
      },
      null,
      2
    )
  );
}
