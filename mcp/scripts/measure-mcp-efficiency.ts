import {
  aggregateEfficiencyScores,
  scoreEfficiencyWorkflow,
  type EfficiencyDomain,
  type EfficiencyStep,
  type EfficiencyStepKind,
} from "../lib/efficiencyScorecard";

function payloadBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function step(
  kind: EfficiencyStepKind,
  payload: unknown,
  requiredForDecision: boolean
): EfficiencyStep {
  return {
    kind,
    payload_bytes: payloadBytes(payload),
    required_for_decision: requiredForDecision,
  };
}

function workflow(
  id: string,
  domain: EfficiencyDomain,
  baseline: readonly EfficiencyStep[],
  optimized: readonly EfficiencyStep[],
  qualityChecks: Readonly<Record<string, boolean>>
) {
  return scoreEfficiencyWorkflow({
    id,
    domain,
    baseline,
    optimized,
    quality_checks: qualityChecks,
  });
}

export function runMcpEfficiencyScorecard() {
  const geometryBatch = workflow(
    "geometry_coherent_cube_batch",
    "GEOMETRY",
    [
      ...Array.from({ length: 8 }, (_, index) =>
        step("mutate", { tool: "manage_cubes", cube: index }, true)
      ),
      ...Array.from({ length: 8 }, (_, index) =>
        step("inspect", { cube: index, confirmation: true }, false)
      ),
      step("verify", { views: ["front", "side"], changed_cubes: 8 }, true),
    ],
    [
      step(
        "mutate",
        {
          tool: "manage_cubes",
          operation: "create",
          elements: Array.from({ length: 8 }, (_, index) => ({
            name: `part_${index}`,
          })),
          receipt: "bounded_final_state",
        },
        true
      ),
      step("verify", { views: ["front", "side"], changed_cubes: 8 }, true),
    ],
    {
      same_cube_count: true,
      one_undo_unit: true,
      final_state_receipt: true,
      visual_verification_kept: true,
    }
  );

  const animationBatch = workflow(
    "animation_coherent_keyframe_batch",
    "ANIMATION",
    [
      ...Array.from({ length: 12 }, (_, index) =>
        step(
          "mutate",
          {
            tool: "manage_animation_timeline",
            keyframe: index,
            channel: index % 2 === 0 ? "rotation" : "position",
          },
          true
        )
      ),
      step("inspect", { animation: "walk", full_clip: true }, false),
      step("verify", { views: ["front", "side"], times: [0, 0.5, 1] }, true),
    ],
    [
      step(
        "mutate",
        {
          tool: "manage_animation_timeline",
          operation: "batch",
          keyframe_count: 12,
          receipt: "bounded_changed_keyframes",
        },
        true
      ),
      step("verify", { views: ["front", "side"], times: [0, 0.5, 1] }, true),
    ],
    {
      same_keyframe_count: true,
      collision_preflight_kept: true,
      one_undo_unit: true,
      representative_visual_evidence_kept: true,
    }
  );

  const textureTransaction = workflow(
    "texture_atomic_region_transaction",
    "TEXTURING",
    [
      ...Array.from({ length: 10 }, (_, index) =>
        step("mutate", { tool: "paint_with_brush", stroke: index }, true)
      ),
      ...Array.from({ length: 10 }, (_, index) =>
        step("inspect", { texture: "atlas", after_stroke: index }, false)
      ),
      step("verify", { atlas_region: [8, 8, 32, 32] }, true),
    ],
    [
      step(
        "mutate",
        {
          tool: "paint_texture_transaction",
          operation_count: 10,
          expected_revision: "content-addressed",
          affected_rect: [8, 8, 32, 32],
          one_undo: true,
        },
        true
      ),
      step("verify", { atlas_region: [8, 8, 32, 32] }, true),
    ],
    {
      same_pixel_intent: true,
      revision_guard_kept: true,
      atomic_undo_kept: true,
      bounded_visual_evidence_kept: true,
    }
  );

  const receiptContinuation = workflow(
    "receipt_only_hierarchy_continuation",
    "INSPECTION",
    [
      step("mutate", { tool: "reparent_element", target: "arm" }, true),
      step("inspect", { target: "arm", full_detail: true }, false),
    ],
    [
      step(
        "mutate",
        {
          tool: "reparent_element",
          target: "arm",
          receipt: "authoritative_final_parent",
        },
        true
      ),
    ],
    {
      target_identity_kept: true,
      final_parent_kept: true,
      invalidation_kept: true,
    }
  );

  const focusedDiscovery = workflow(
    "unknown_target_focused_discovery",
    "INSPECTION",
    [
      step("search", { query: "cube", result_count: 8 }, true),
      step("describe", { capability: "inspect_elements", schema: "full" }, false),
      step("inspect", { mode: "outline", entire_model: true }, true),
      step("inspect", { mode: "detail", target: "leg" }, true),
      step("mutate", { target: "leg", operation: "update" }, true),
    ],
    [
      step("search", { query: "leg cube", limit: 4 }, true),
      step("inspect", { mode: "detail", target: "leg", bounded: true }, true),
      step("mutate", { target: "leg", operation: "update" }, true),
    ],
    {
      bounded_discovery_kept: true,
      exact_target_identity_kept: true,
      mutation_safety_kept: true,
    }
  );

  const scores = [
    geometryBatch,
    animationBatch,
    textureTransaction,
    receiptContinuation,
    focusedDiscovery,
  ];

  return {
    schema: 1,
    measurement: "mcp-efficiency-scorecard",
    proof_scope:
      "Deterministic REMOTE_GITHUB workflow proxy. Call and payload reductions are representative architecture measurements, not live Codex token telemetry or native Blockbench latency.",
    scores,
    aggregate: aggregateEfficiencyScores(scores),
    opportunity_register: [
      {
        id: "geometry_coherent_cube_batch",
        status: "implemented",
        primitive: "manage_cubes",
        next_gate: "retain",
      },
      {
        id: "animation_coherent_keyframe_batch",
        status: "implemented",
        primitive: "manage_animation_timeline(batch)",
        next_gate: "retain",
      },
      {
        id: "texture_atomic_region_transaction",
        status: "implemented",
        primitive: "paint_texture_transaction",
        next_gate: "retain",
      },
      {
        id: "receipt_only_continuation",
        status: "implemented",
        primitive: "Control mutation receipts",
        next_gate: "expand only when a mutation already returns complete final state",
      },
      {
        id: "focused_discovery",
        status: "implemented",
        primitive: "bounded search + focused inspection",
        next_gate: "retain",
      },
      {
        id: "rig_locator_cohort_mutation",
        status: "evidence_required",
        primitive: null,
        next_gate:
          "Measure real repeated locator/Null Object/IK call frequency before widening existing schemas. Prefer one internal transaction only if repeated same-domain mutations materially dominate accepted-result cost.",
      },
      {
        id: "render_target_native_adapter",
        status: "blocked_by_stable_api",
        primitive: null,
        next_gate:
          "Adopt only after Blockbench exposes a stable plugin-facing boundary; do not copy private RenderTarget internals.",
      },
    ],
  };
}

if (import.meta.main) {
  console.log(JSON.stringify(runMcpEfficiencyScorecard(), null, 2));
}
