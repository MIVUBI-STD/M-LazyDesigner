import {
  compactGatewayCapabilityContent,
  compactGatewayCapabilityStructuredContent,
} from "../gateway/contract";
import {
  buildControlDelta,
  projectControlDeltaForGateway,
} from "../gateway/control";
import { projectCapabilityInputSchema } from "../gateway/schemaProjection";

export type GoldenTaskResult = {
  task: string;
  before_bytes: number;
  after_bytes: number;
  saved_bytes: number;
  reduction_percent: number;
  semantic_checks: Record<string, boolean>;
  quality_preserved: boolean;
};

function bytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function result(
  task: string,
  before: unknown,
  after: unknown,
  semanticChecks: Record<string, boolean>
): GoldenTaskResult {
  const beforeBytes = bytes(before);
  const afterBytes = bytes(after);
  const savedBytes = Math.max(0, beforeBytes - afterBytes);
  return {
    task,
    before_bytes: beforeBytes,
    after_bytes: afterBytes,
    saved_bytes: savedBytes,
    reduction_percent:
      beforeBytes === 0
        ? 0
        : Number(((savedBytes / beforeBytes) * 100).toFixed(2)),
    semantic_checks: semanticChecks,
    quality_preserved: Object.values(semanticChecks).every(Boolean),
  };
}

function knownGeometryTransform(): GoldenTaskResult {
  const runtime = {
    execution: "applied",
    modified: 1,
    before: {
      uuid: "cube-leg",
      name: "leg",
      from: [0, 0, 0],
      to: [2, 8, 2],
      rotation: [0, 0, 0],
      origin: [1, 0, 1],
      face_uvs: { north: [0, 0, 2, 8] },
    },
    after: {
      uuid: "cube-leg",
      name: "leg",
      from: [1, 0, 0],
      to: [3, 8, 2],
      rotation: [0, 0, 0],
      origin: [1, 0, 1],
      box_uv_region: { logical_rect: [0, 0, 8, 12] },
      face_uvs: { north: [0, 0, 2, 8] },
    },
    geometry_effect: {
      changed_fields: ["from", "to"],
      center_delta: [1, 0, 0],
      size_delta: [0, 0, 0],
    },
    visual_scope: {
      cube_uuids: ["cube-leg"],
      framing: { min: [0, 0, 0], max: [4, 9, 3] },
    },
  };
  const delta = buildControlDelta({
    capability: "manage_cubes",
    phaseBefore: "geometry",
    phaseAfter: "geometry",
    projectUuid: "project-a",
    succeeded: true,
    result: runtime,
  });
  const compactedRuntime = compactGatewayCapabilityStructuredContent(
    "manage_cubes",
    runtime
  ) as any;
  const compactedDelta = projectControlDeltaForGateway(delta) as any;
  const before = { runtime_result: runtime, control_delta: delta };
  const after = {
    runtime_result: compactedRuntime,
    control_delta: compactedDelta,
  };

  return result("known_geometry_transform", before, after, {
    target_identity: compactedRuntime.after?.uuid === "cube-leg",
    changed_coordinates:
      JSON.stringify(compactedRuntime.after?.from) === JSON.stringify([1, 0, 0]) &&
      JSON.stringify(compactedRuntime.after?.to) === JSON.stringify([3, 8, 2]),
    effect_preserved:
      JSON.stringify(compactedRuntime.geometry_effect?.changed_fields) ===
      JSON.stringify(["from", "to"]),
    visual_verification_preserved:
      compactedDelta.verification_class === "visual" &&
      compactedDelta.verification_scope?.kind === "CUBE_TARGETS",
    freshness_preserved:
      compactedDelta.freshness?.basis === delta.freshness.basis &&
      JSON.stringify(compactedDelta.freshness?.stale) ===
        JSON.stringify(delta.freshness.stale),
  });
}

function hierarchyReceipt(): GoldenTaskResult {
  const runtime = {
    execution: "applied",
    id: "group-arm",
    name: "arm",
    changed_fields: ["rotation"],
    group: {
      uuid: "group-arm",
      name: "arm",
      origin: [0, 12, 0],
      rotation: [0, 10, 0],
      visibility: true,
      parent: "root",
    },
  };
  const verboseContent = [
    {
      type: "text",
      text: "Modified Group arm (group-arm); changed: rotation.",
    },
  ];
  const delta = buildControlDelta({
    capability: "modify_group",
    phaseBefore: "geometry",
    phaseAfter: "geometry",
    projectUuid: "project-a",
    succeeded: true,
    result: runtime,
  });
  const compactedContent = compactGatewayCapabilityContent(
    "modify_group",
    runtime,
    verboseContent,
    delta.verification_class
  );
  const compactedDelta = projectControlDeltaForGateway(delta) as any;

  return result(
    "hierarchy_receipt",
    { content: verboseContent, structuredContent: runtime, control_delta: delta },
    {
      content: compactedContent,
      structuredContent: runtime,
      control_delta: compactedDelta,
    },
    {
      authoritative_group_state:
        runtime.group.uuid === "group-arm" &&
        runtime.group.rotation[1] === 10 &&
        runtime.group.parent === "root",
      receipt_gate_preserved:
        delta.verification_class === "receipt_only" &&
        compactedDelta.verification_class === "receipt_only",
      invalidation_preserved:
        JSON.stringify(compactedDelta.invalidates) ===
        JSON.stringify(delta.invalidates),
    }
  );
}

function materialReceipt(): GoldenTaskResult {
  const runtime = {
    operation: "configure",
    material: {
      uuid: "mat-a",
      name: "body",
      channels: {
        color: "tex-color",
        normal: null,
        height: null,
        mer: null,
      },
      config: {
        color_value: null,
        mer_value: null,
        subsurface_value: null,
        saved: false,
      },
    },
  };
  const verboseContent = [
    { type: "text", text: 'Configured material "body".' },
  ];
  const delta = buildControlDelta({
    capability: "manage_material",
    phaseBefore: "texturing",
    phaseAfter: "texturing",
    projectUuid: "project-a",
    succeeded: true,
    result: runtime,
  });
  const compactedContent = compactGatewayCapabilityContent(
    "manage_material",
    runtime,
    verboseContent,
    delta.verification_class
  );
  const compactedDelta = projectControlDeltaForGateway(delta) as any;

  return result(
    "material_receipt",
    { content: verboseContent, structuredContent: runtime, control_delta: delta },
    {
      content: compactedContent,
      structuredContent: runtime,
      control_delta: compactedDelta,
    },
    {
      material_identity:
        runtime.material.uuid === "mat-a" && runtime.material.name === "body",
      channel_state_preserved:
        runtime.material.channels.color === "tex-color" &&
        runtime.material.config.saved === false,
      receipt_gate_preserved:
        delta.verification_class === "receipt_only" &&
        compactedDelta.verification_class === "receipt_only",
      texture_scope_preserved:
        JSON.stringify(compactedDelta.freshness?.stale) ===
        JSON.stringify(delta.freshness.stale),
    }
  );
}

function animationEffectsReceipt(): GoldenTaskResult {
  const runtime = {
    animation: { uuid: "anim-a", name: "idle" },
    operation_count: 1,
    results: [
      {
        channel: "particle",
        keyframe_uuid: "kf-a",
        time: 0.25,
        data_point_index: 0,
        effect: "mivubi:dust",
        locator: "hand",
      },
    ],
  };
  const verboseContent = [
    { type: "text", text: "Managed 1 animation effect operation(s)." },
  ];
  const delta = buildControlDelta({
    capability: "manage_animation_effects",
    phaseBefore: "animation",
    phaseAfter: "animation",
    projectUuid: "project-a",
    succeeded: true,
    result: runtime,
  });
  const compactedContent = compactGatewayCapabilityContent(
    "manage_animation_effects",
    runtime,
    verboseContent,
    delta.verification_class
  );
  const compactedDelta = projectControlDeltaForGateway(delta) as any;

  return result(
    "animation_effects_receipt",
    { content: verboseContent, structuredContent: runtime, control_delta: delta },
    {
      content: compactedContent,
      structuredContent: runtime,
      control_delta: compactedDelta,
    },
    {
      animation_identity: runtime.animation.uuid === "anim-a",
      effect_identity:
        runtime.results[0]?.effect === "mivubi:dust" &&
        runtime.results[0]?.locator === "hand",
      receipt_gate_preserved:
        delta.verification_class === "receipt_only" &&
        compactedDelta.verification_class === "receipt_only",
      animation_effect_scope:
        JSON.stringify(compactedDelta.freshness?.stale) ===
        JSON.stringify(["ANIMATION_EFFECTS"]),
    }
  );
}

function unknownTargetDiscovery(): GoldenTaskResult {
  const fullSchema = {
    type: "object",
    properties: {
      mode: { type: "string" },
      include_cubes: { type: "boolean" },
      max_depth: { type: "integer" },
      max_nodes: { type: "integer" },
      name_pattern: { type: "string" },
      name_contains: { type: "string" },
      type: { type: "string" },
      parent_group: { type: "string" },
      min_size: { type: "array" },
      max_size: { type: "array" },
      selected_only: { type: "boolean" },
      limit: { type: "integer" },
      id: { type: "string" },
      detail: { type: "string" },
    },
    required: ["mode"],
  };
  const projected = projectCapabilityInputSchema(
    "inspect_elements",
    fullSchema,
    { field: "mode", value: "search" }
  ).inputSchema as any;
  const keys = Object.keys(projected.properties ?? {});

  return result("unknown_target_discovery", fullSchema, projected, {
    discriminator_preserved:
      projected.properties?.mode?.const === "search",
    search_identity_preserved:
      keys.includes("name_pattern") &&
      keys.includes("name_contains") &&
      keys.includes("type") &&
      keys.includes("parent_group") &&
      keys.includes("limit"),
    unrelated_detail_removed:
      !keys.includes("id") && !keys.includes("detail"),
  });
}

function failedMutation(): GoldenTaskResult {
  const delta = buildControlDelta({
    capability: "manage_animation_timeline",
    phaseBefore: "animation",
    phaseAfter: "animation",
    projectUuid: "project-a",
    succeeded: false,
  });
  const projected = projectControlDeltaForGateway(delta) as any;

  return result("failed_mutation_recovery", delta, projected, {
    fail_closed_basis: projected.freshness?.basis === "UNKNOWN_OUTCOME",
    unknown_scope_complete:
      JSON.stringify(projected.freshness?.unknown) ===
      JSON.stringify(delta.freshness.unknown),
    recovery_intent: projected.next_intent === "RECOVER_CURRENT_OPERATION",
    no_false_refresh:
      projected.requires_status_refresh === delta.requires_status_refresh,
  });
}

export function runZeroWasteGoldenBenchmark(): GoldenTaskResult[] {
  return [
    knownGeometryTransform(),
    hierarchyReceipt(),
    materialReceipt(),
    animationEffectsReceipt(),
    unknownTargetDiscovery(),
    failedMutation(),
  ];
}

if (import.meta.main) {
  const tasks = runZeroWasteGoldenBenchmark();
  const totalBefore = tasks.reduce((sum, task) => sum + task.before_bytes, 0);
  const totalAfter = tasks.reduce((sum, task) => sum + task.after_bytes, 0);
  const totalSaved = Math.max(0, totalBefore - totalAfter);

  console.log(
    JSON.stringify(
      {
        schema: 1,
        benchmark: "zero-waste-golden-projection",
        proof_scope:
          "REMOTE_GITHUB deterministic AI-client projection only; not live Blockbench quality and not Codex Astra token telemetry",
        tasks,
        aggregate: {
          task_count: tasks.length,
          quality_preserved: tasks.every((task) => task.quality_preserved),
          before_bytes: totalBefore,
          after_bytes: totalAfter,
          saved_bytes: totalSaved,
          reduction_percent:
            totalBefore === 0
              ? 0
              : Number(((totalSaved / totalBefore) * 100).toFixed(2)),
        },
      },
      null,
      2
    )
  );
}
