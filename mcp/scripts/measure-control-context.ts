import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildControlDelta,
  buildControlPacket,
  projectControlPacketForGateway,
  projectControlStageContextWithHeadroom,
  type ControlPacket,
} from "../gateway/control";
import type { GatewayRuntimeStatus } from "../gateway/backend";
import { projectGatewayStatus } from "../gateway/statusProjection";

const status: GatewayRuntimeStatus = {
  gateway: "ready",
  affinity: { project_uuid: "fixture-project", authoring_phase: "geometry" },
  runtime: {
    online: true,
    endpoint: "http://127.0.0.1:3000/bb-mcp",
    mcp_client_ready: true,
    catalog_stale: false,
    runtime_signature: "fixture-runtime",
    connected_signature: "fixture-runtime",
    catalog_count: 47,
    health: {
      build_identity: "sha256:fixture",
      product: { authoring_phase: "geometry" },
      project_context: {
        active_project_uuid: "fixture-project",
        requested_project_uuid: "fixture-project",
        requested_project_available: true,
        open_project_count: 1,
      },
    },
  },
  connection: {
    state: "ready", generation: 1, reconnect_count: 0, catalog_refresh_count: 1,
    last_ready_at: "2026-09-12T00:00:00.000Z", last_transition_at: "2026-09-12T00:00:00.000Z",
    reconnect: { failures: 0, retry_after_ms: 0 },
  },
  operations: { active: 0, queued: 0, max_queue_depth: 8, completed: 0, failed: 0, timed_out: 0, rejected_busy: 0 },
  last_error: null,
};

function chars(value: unknown): number {
  return JSON.stringify(value).length;
}

function statusOrientationProjection(value: GatewayRuntimeStatus) {
  return {
    project_uuid: value.affinity.project_uuid,
    authoring_phase: value.affinity.authoring_phase,
    runtime_online: value.runtime.online,
    runtime_signature: value.runtime.runtime_signature,
    catalog_count: value.runtime.catalog_count,
    catalog_stale: value.runtime.catalog_stale,
  };
}

function controlOrientationProjection(value: ControlPacket) {
  return {
    project_uuid: value.project.affinity_uuid,
    authoring_phase: value.authoring.phase,
    runtime_online: value.runtime.online,
    runtime_signature: value.runtime.runtime_signature,
    catalog_count: value.runtime.catalog_count,
    catalog_stale: value.runtime.catalog_stale,
  };
}

const directory = await mkdtemp(join(tmpdir(), "lazydesigner-control-measure-"));
try {
  await writeFile(
    join(directory, "README.md"),
    "# Fixture\n\nCurrent Stage: GEOMETRY\n\nGeometry: IN_PROGRESS\n\nUV Layout: NOT_STARTED\n\nTexturing: NOT_STARTED\n\nAnimation: NOT_STARTED\n\nCurrent next step: Continue primary geometry\n\nKnown blocker(s): None\n"
  );

  const full: ControlPacket = await buildControlPacket(status, { workspacePath: directory });
  const known = full.context.required.map((handle) => handle.id);
  const cached = await buildControlPacket(status, { knownContextIds: known, workspacePath: directory });
  const delta = buildControlDelta({
    capability: "manage_cubes",
    phaseBefore: "geometry",
    phaseAfter: "geometry",
    projectUuid: "fixture-project",
    succeeded: true,
  });

  const fullChars = chars(full);
  const cachedChars = chars(cached);
  const deltaChars = chars(delta);
  const statusChars = chars(status);
  const projectedStatus = projectGatewayStatus(status);
  const projectedStatusChars = chars(projectedStatus);
  const fullEnvelopeChars = chars({ ...status, control: full });
  const cachedEnvelopeChars = chars({ ...status, control: cached });
  const projectedFull = projectControlPacketForGateway(full);
  const projectedCached = projectControlPacketForGateway(cached);
  const headroom = full.stage_context
    ? projectControlStageContextWithHeadroom(full.stage_context)
    : null;
  const projectedFullEnvelopeChars = chars({ ...status, control: projectedFull });
  const projectedCachedEnvelopeChars = chars({ ...status, control: projectedCached });
  const statusOrientation = statusOrientationProjection(status);
  const controlOrientation = controlOrientationProjection(full);
  const cachedReduction = fullChars > 0
    ? Number((((fullChars - cachedChars) / fullChars) * 100).toFixed(2))
    : 0;

  console.log(JSON.stringify({
    proof: "static Control/Gateway payload footprint; not whole-session model-token usage",
    full_packet_chars: fullChars,
    cached_packet_chars: cachedChars,
    delta_chars: deltaChars,
    gateway_status_chars: statusChars,
    gateway_status_projected_chars: projectedStatusChars,
    gateway_status_saved_chars: Math.max(0, statusChars - projectedStatusChars),
    gateway_envelope_full_chars: fullEnvelopeChars,
    gateway_envelope_cached_chars: cachedEnvelopeChars,
    gateway_envelope_projected_full_chars: projectedFullEnvelopeChars,
    gateway_envelope_projected_cached_chars: projectedCachedEnvelopeChars,
    status_projection_saved_chars: Math.max(0, fullEnvelopeChars - projectedFullEnvelopeChars),
    cached_packet_reduction_percent: cachedReduction,
    required_context_handles_full: full.context.required.length,
    required_context_handles_cached: cached.context.required.length,
    echoed_cached_context_ids_internal: cached.context.cached_ids.length,
    echoed_cached_context_ids_gateway: Object.prototype.hasOwnProperty.call(
      projectedCached.context,
      "cached_ids"
    ) ? (projectedCached.context as { cached_ids?: string[] }).cached_ids?.length ?? 0 : 0,
    repeated_orientation_projection_chars: chars(controlOrientation),
    repeated_orientation_values_equal:
      JSON.stringify(statusOrientation) === JSON.stringify(controlOrientation),
    stage_context_before_bytes: headroom?.diagnostics.before_bytes ?? 0,
    stage_context_after_bytes: headroom?.diagnostics.after_bytes ?? 0,
    stage_context_required_bytes: headroom?.diagnostics.required_bytes ?? 0,
    stage_context_useful_bytes: headroom?.diagnostics.useful_bytes ?? 0,
    stage_context_optional_bytes: headroom?.diagnostics.optional_bytes ?? 0,
    stage_context_dropped_optional_fields:
      headroom?.diagnostics.dropped_optional_fields ?? [],
    stage_context_required_over_budget:
      headroom?.diagnostics.required_over_budget ?? false,
    stage_context_headroom_state: headroom?.diagnostics.state ?? null,
    note:
      "Gateway client projection removes only orientation values already present in the sibling status payload. Static characters remain a regression signal, not a claim of Astra token savings.",
  }, null, 2));
} finally {
  await rm(directory, { recursive: true, force: true });
}
