import "@/server/tools";
import { z } from "zod";
import {
  getAllToolDefinitions,
  getEnabledToolDefinitions,
} from "../lib/factories";
import {
  aggregateEfficiencyScores,
  scoreEfficiencyWorkflow,
  type EfficiencyDomain,
  type EfficiencyStep,
  type EfficiencyStepKind,
} from "../lib/efficiencyScorecard";

const SCORECARD_RUNTIME_PRIMITIVES = [
  "manage_cubes",
  "manage_animation_timeline",
  "paint_texture_transaction",
  "reparent_element",
  "inspect_elements",
  "manage_particle",
  "manage_render_profile",
  "remove_element",
  "bone_rigging",
  "list_textures",
  "paint_with_brush",
  "texture_layer_management",
] as const;

function runtimePrimitiveStaticCost() {
  const definitions = getAllToolDefinitions();
  const rows = SCORECARD_RUNTIME_PRIMITIVES.map((name) => {
    const definition = definitions[name];
    if (!definition) {
      throw new Error(`Efficiency primitive ${name} is not registered.`);
    }
    const schema = z.toJSONSchema(definition.parameterSchema, {
      io: "input",
      target: "draft-2020-12",
      unrepresentable: "any",
      reused: "inline",
    });
    const descriptionBytes = new TextEncoder().encode(
      definition.description
    ).byteLength;
    const schemaBytes = new TextEncoder().encode(
      JSON.stringify(schema)
    ).byteLength;
    return {
      capability: name,
      schema_bytes: schemaBytes,
      description_bytes: descriptionBytes,
      static_bytes: schemaBytes + descriptionBytes,
    };
  });

  return {
    runtime_tool_count: Object.keys(getEnabledToolDefinitions()).length,
    reused_primitive_count: rows.length,
    reused_primitives: rows,
    reused_primitive_static_bytes: rows.reduce(
      (sum, row) => sum + row.static_bytes,
      0
    ),
    new_public_capabilities_required: 0,
  };
}

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

  const textureInventoryDefault = workflow(
    "texture_inventory_default",
    "TEXTURING",
    [
      step(
        "inspect",
        {
          tool: "list_textures",
          diagnostics: true,
          diagnostic_scope: "full",
          uv_audit: "included",
          coverage: "included",
          seam: "included",
          pbr: "included",
        },
        true
      ),
    ],
    [
      step(
        "inspect",
        {
          tool: "list_textures",
          diagnostics: false,
          inventory_only: true,
        },
        true
      ),
    ],
    {
      texture_identity_kept: true,
      atlas_state_kept: true,
      logical_uv_kept: true,
      diagnostics_remain_opt_in: true,
    }
  );

  const textureLayerMetadataBatch = workflow(
    "texture_layer_metadata_batch",
    "TEXTURING",
    [
      step("mutate", { tool: "texture_layer_management", action: "rename_layer" }, true),
      step("mutate", { tool: "texture_layer_management", action: "set_opacity" }, true),
      step("mutate", { tool: "texture_layer_management", action: "set_blend_mode" }, true),
      step("mutate", { tool: "texture_layer_management", action: "move_layer" }, true),
    ],
    [
      step(
        "mutate",
        {
          tool: "texture_layer_management",
          action: "batch_metadata",
          update_count: 4,
          one_undo: true,
          one_recompose_max: true,
          one_refresh: true,
        },
        true
      ),
    ],
    {
      same_layer_targets: true,
      same_final_metadata: true,
      one_undo_unit: true,
      one_recompose_max: true,
      explicit_identity_kept: true,
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

  const particleReceipt = workflow(
    "particle_verified_write_receipt",
    "ANIMATION",
    [
      step(
        "mutate",
        {
          tool: "manage_particle",
          write: "verified_atomic",
          summary: "complete",
        },
        true
      ),
      step(
        "inspect",
        {
          tool: "inspect_particle",
          mode: "summary",
          confirmation_only: true,
        },
        false
      ),
    ],
    [
      step(
        "mutate",
        {
          tool: "manage_particle",
          write: "verified_atomic",
          summary: "complete",
          receipt: "continuation_authoritative",
        },
        true
      ),
    ],
    {
      verified_write_kept: true,
      particle_identity_kept: true,
      diagnostics_kept: true,
      freshness_scope_kept: true,
    }
  );

  const boneRiggingReceipt = workflow(
    "bone_rigging_final_state_receipt",
    "RIGGING",
    [
      step(
        "mutate",
        {
          tool: "bone_rigging",
          action: "set_ik",
          target: "leg",
        },
        true
      ),
      step(
        "inspect",
        {
          tool: "inspect_elements",
          mode: "detail",
          target: "leg",
          confirmation_only: true,
        },
        false
      ),
    ],
    [
      step(
        "mutate",
        {
          tool: "bone_rigging",
          action: "set_ik",
          target: "leg",
          receipt: "complete_final_bone_state",
        },
        true
      ),
    ],
    {
      bone_identity_kept: true,
      parent_state_kept: true,
      pivot_rotation_state_kept: true,
      ik_state_kept: true,
      geometry_animation_invalidation_kept: true,
    }
  );

  const elementRemovalReceipt = workflow(
    "element_removal_receipt",
    "GEOMETRY",
    [
      step(
        "mutate",
        {
          tool: "remove_element",
          target: "group-a",
          result: "native_delete",
        },
        true
      ),
      step(
        "inspect",
        {
          tool: "inspect_elements",
          mode: "search",
          target: "group-a",
          confirmation_only: true,
        },
        false
      ),
    ],
    [
      step(
        "mutate",
        {
          tool: "remove_element",
          target: "group-a",
          receipt: "removed_identity_counts_and_animation_impact",
        },
        true
      ),
    ],
    {
      removed_identity_kept: true,
      subtree_count_kept: true,
      affected_animation_count_kept: true,
      undo_boundary_kept: true,
    }
  );

  const renderProfileReceipt = workflow(
    "render_profile_verified_write_receipt",
    "TEXTURING",
    [
      step(
        "mutate",
        {
          tool: "manage_render_profile",
          operation: "assign",
          write: "verified_atomic",
        },
        true
      ),
      step(
        "inspect",
        {
          tool: "manage_render_profile",
          operation: "inspect",
          confirmation_only: true,
        },
        false
      ),
    ],
    [
      step(
        "mutate",
        {
          tool: "manage_render_profile",
          operation: "assign",
          write: "verified_atomic",
          receipt: "mutation_identity_complete",
        },
        true
      ),
    ],
    {
      verified_write_kept: true,
      controller_identity_kept: true,
      bone_pattern_kept: true,
      slot_identity_kept: true,
      material_render_freshness_scope_kept: true,
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
    textureInventoryDefault,
    textureLayerMetadataBatch,
    textureTransaction,
    receiptContinuation,
    particleReceipt,
    boneRiggingReceipt,
    elementRemovalReceipt,
    renderProfileReceipt,
    focusedDiscovery,
  ];

  return {
    schema: 1,
    measurement: "mcp-efficiency-scorecard",
    proof_scope:
      "Deterministic REMOTE_GITHUB workflow proxy. Call and payload reductions are representative architecture measurements, not live Codex token telemetry or native Blockbench latency.",
    scores,
    aggregate: aggregateEfficiencyScores(scores),
    static_surface: runtimePrimitiveStaticCost(),
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
        id: "texture_inventory_default",
        status: "implemented",
        primitive: "list_textures",
        next_gate: "retain cheap default; request scoped diagnostics only when decision-changing",
      },
      {
        id: "texture_layer_metadata_batch",
        status: "implemented",
        primitive: "texture_layer_management(batch_metadata)",
        next_gate: "retain metadata-only batching; keep structural/bitmap layer actions separate",
      },
      {
        id: "texture_atomic_region_transaction",
        status: "implemented",
        primitive: "paint_texture_transaction",
        next_gate: "retain",
      },
      {
        id: "texture_exact_pixel_ui_bypass",
        status: "implemented",
        primitive: "paint_with_brush",
        next_gate: "retain direct bitmap path before native Painter setup",
      },
      {
        id: "receipt_only_continuation",
        status: "implemented",
        primitive: "Control mutation receipts",
        next_gate: "expand only when a mutation already returns complete final state",
      },
      {
        id: "render_profile_verified_write_receipt",
        status: "implemented",
        primitive: "manage_render_profile",
        next_gate: "retain",
      },
      {
        id: "element_removal_receipt",
        status: "implemented",
        primitive: "remove_element",
        next_gate: "retain",
      },
      {
        id: "bone_rigging_final_state_receipt",
        status: "implemented",
        primitive: "bone_rigging",
        next_gate: "retain",
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
