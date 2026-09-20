import { measureModelContextFootprint } from "./measure-model-context-footprint";
import { runZeroWasteWorkflowBenchmark } from "./benchmark-zero-waste-workflow";
import {
  buildControlContinuationCheckpoint,
  buildControlDelta,
  buildControlPacket,
  DEFAULT_CONTROL_HEADROOM_POLICY,
} from "../gateway/control";
import type { GatewayRuntimeStatus } from "../gateway/backend";

function bytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

const status: GatewayRuntimeStatus = {
  gateway: "ready",
  affinity: { project_uuid: "benchmark-project", authoring_phase: "geometry" },
  runtime: {
    online: true,
    endpoint: "http://127.0.0.1:3000/bb-mcp",
    mcp_client_ready: true,
    catalog_stale: false,
    runtime_signature: "benchmark-runtime",
    connected_signature: "benchmark-runtime",
    catalog_count: 47,
    health: {
      build_identity: "sha256:benchmark",
      product: { authoring_phase: "geometry" },
      project_context: {
        active_project_uuid: "benchmark-project",
        requested_project_uuid: "benchmark-project",
        requested_project_available: true,
        open_project_count: 1,
      },
    },
  },
  connection: {
    state: "ready",
    generation: 1,
    reconnect_count: 0,
    catalog_refresh_count: 1,
    last_ready_at: "2026-09-20T00:00:00.000Z",
    last_transition_at: "2026-09-20T00:00:00.000Z",
    reconnect: { failures: 0, retry_after_ms: 0 },
  },
  operations: {
    active: 0,
    queued: 0,
    max_queue_depth: 8,
    completed: 0,
    failed: 0,
    timed_out: 0,
    rejected_busy: 0,
  },
  last_error: null,
};

export async function runZeroWasteTotalContextBenchmark() {
  const staticContext = await measureModelContextFootprint();
  const workflows = runZeroWasteWorkflowBenchmark();
  const workflowBefore = workflows.reduce(
    (sum, item) => sum + item.baseline.ai_payload_bytes,
    0
  );
  const workflowAfter = workflows.reduce(
    (sum, item) => sum + item.optimized.ai_payload_bytes,
    0
  );
  const baselineCalls = workflows.reduce(
    (sum, item) => sum + item.baseline.calls,
    0
  );
  const optimizedCalls = workflows.reduce(
    (sum, item) => sum + item.optimized.calls,
    0
  );

  const packet = await buildControlPacket(status, {
    currentUserDelta: "Continue the benchmark correction without broad rereads.",
  });
  const delta = buildControlDelta({
    capability: "manage_cubes",
    phaseBefore: "geometry",
    phaseAfter: "geometry",
    projectUuid: "benchmark-project",
    succeeded: true,
    result: { geometry_effect: { changed_fields: ["rotation"] } },
  });
  const checkpoint = buildControlContinuationCheckpoint(packet, delta);
  const fullContinuationBytes = bytes({ packet, delta });
  const checkpointBytes = bytes(checkpoint);

  return {
    schema: 2,
    benchmark: "zero-waste-total-context-proxy",
    proof_scope:
      "REMOTE_GITHUB deterministic proxies only. Static prefix bytes, dynamic tool payload bytes and checkpoint bytes are reported separately because prompt caching/history reuse means they must not be summed into model tokens.",
    static_prefix: staticContext,
    dynamic_workflow: {
      quality_preserved: workflows.every((item) => item.quality_preserved),
      workflow_count: workflows.length,
      baseline_calls: baselineCalls,
      optimized_calls: optimizedCalls,
      baseline_bytes: workflowBefore,
      optimized_bytes: workflowAfter,
      saved_bytes: Math.max(0, workflowBefore - workflowAfter),
    },
    control_headroom: {
      envelope_proxy_bytes: DEFAULT_CONTROL_HEADROOM_POLICY.envelope_bytes,
      continuation_reserve_proxy_bytes:
        DEFAULT_CONTROL_HEADROOM_POLICY.continuation_reserve_bytes,
      note:
        "Byte proxy protects LazyDesigner-owned Control delivery only; it is not a model context-window limit.",
    },
    compaction_checkpoint: {
      full_internal_bytes: fullContinuationBytes,
      checkpoint_bytes: checkpointBytes,
      saved_bytes: Math.max(0, fullContinuationBytes - checkpointBytes),
      schema: checkpoint.schema,
      note:
        "Checkpoint is ready for an upstream conversation-compaction owner; LazyDesigner does not own the Codex/OpenAI conversation API.",
    },
    live_measurement_required: {
      actual_token_claim: false,
      fields: [
        "total_tokens per response/compaction event",
        "cached_input_tokens when exposed",
        "cache_missed_tokens when exposed",
        "comparison_reusable_tokens when exposed",
        "reasoning/output tokens when exposed",
        "quality verdict",
        "task success",
        "user correction count",
      ],
    },
  };
}

export function assertZeroWasteTotalContextBenchmark(
  report: Awaited<ReturnType<typeof runZeroWasteTotalContextBenchmark>>
): void {
  const failures: string[] = [];
  if (!report.dynamic_workflow.quality_preserved) {
    failures.push("workflow quality invariants are not preserved");
  }
  if (
    report.dynamic_workflow.optimized_bytes >=
    report.dynamic_workflow.baseline_bytes
  ) {
    failures.push("optimized dynamic workflow payload is not smaller");
  }
  if (
    report.dynamic_workflow.optimized_calls >=
    report.dynamic_workflow.baseline_calls
  ) {
    failures.push("optimized workflow call count is not smaller");
  }
  if (
    report.compaction_checkpoint.checkpoint_bytes >=
    report.compaction_checkpoint.full_internal_bytes
  ) {
    failures.push("continuation checkpoint is not smaller than internal state");
  }
  if (
    report.control_headroom.continuation_reserve_proxy_bytes <= 0 ||
    report.control_headroom.continuation_reserve_proxy_bytes >=
      report.control_headroom.envelope_proxy_bytes
  ) {
    failures.push("Control continuation reserve is invalid");
  }
  for (const [name, task] of Object.entries(report.static_prefix.task_classes)) {
    if (task.bytes <= 0) failures.push(`${name} static-prefix proxy is empty`);
  }
  if (report.live_measurement_required.actual_token_claim !== false) {
    failures.push("remote proxy must not claim actual token savings");
  }
  if (failures.length > 0) {
    throw new Error(
      `Zero-Waste total-context regression:\n- ${failures.join("\n- ")}`
    );
  }
}

if (import.meta.main) {
  const report = await runZeroWasteTotalContextBenchmark();
  assertZeroWasteTotalContextBenchmark(report);
  console.log(JSON.stringify(report, null, 2));
}
