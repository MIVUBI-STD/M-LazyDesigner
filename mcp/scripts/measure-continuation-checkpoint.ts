import {
  buildControlContinuationCheckpoint,
  buildControlDelta,
  buildControlPacket,
} from "../gateway/control";
import type { GatewayRuntimeStatus } from "../gateway/backend";

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
    last_ready_at: null, last_transition_at: null,
    reconnect: { failures: 0, retry_after_ms: 0 },
  },
  operations: { active: 0, queued: 0, max_queue_depth: 8, completed: 0, failed: 0, timed_out: 0, rejected_busy: 0 },
  last_error: null,
};

const packet = await buildControlPacket(status, {
  currentUserDelta: "Continue the bounded geometry correction.",
});
const delta = buildControlDelta({
  capability: "manage_cubes",
  phaseBefore: "geometry",
  phaseAfter: "geometry",
  projectUuid: "fixture-project",
  succeeded: true,
  result: { geometry_effect: { changed_fields: ["rotation"] } },
});
const checkpoint = buildControlContinuationCheckpoint(packet, delta);
const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value)).byteLength;
console.log(JSON.stringify({
  proof_scope:
    "deterministic compaction checkpoint proxy; not an OpenAI Responses compaction or token-saving claim",
  full_internal_bytes: bytes({ packet, delta }),
  checkpoint_bytes: bytes(checkpoint),
  saved_bytes: Math.max(0, bytes({ packet, delta }) - bytes(checkpoint)),
  checkpoint,
}, null, 2));
