import { describe, expect, test } from "bun:test";
import {
  buildControlContinuationCheckpoint,
  buildControlDelta,
  buildControlPacket,
} from "@/gateway/control";
import type { GatewayRuntimeStatus } from "@/gateway/backend";

const status: GatewayRuntimeStatus = {
  gateway: "ready",
  affinity: { project_uuid: "project-a", authoring_phase: "geometry" },
  runtime: {
    online: true,
    endpoint: "http://127.0.0.1:3000/bb-mcp",
    mcp_client_ready: true,
    catalog_stale: false,
    runtime_signature: "runtime-a",
    connected_signature: "runtime-a",
    catalog_count: 47,
    health: {
      build_identity: "sha256:build-a",
      product: { authoring_phase: "geometry" },
      project_context: {
        active_project_uuid: "project-a",
        requested_project_uuid: "project-a",
        requested_project_available: true,
        open_project_count: 1,
      },
    },
  },
  connection: {
    state: "ready", generation: 1, reconnect_count: 0, catalog_refresh_count: 1,
    last_ready_at: "2026-09-20T00:00:00.000Z", last_transition_at: "2026-09-20T00:00:00.000Z",
    reconnect: { failures: 0, retry_after_ms: 0 },
  },
  operations: {
    active: 0, queued: 0, max_queue_depth: 8, completed: 0,
    failed: 0, timed_out: 0, rejected_busy: 0,
  },
  last_error: null,
};

describe("Control compaction-safe continuation checkpoint", () => {
  test("keeps current task identity and authoritative failure uncertainty", async () => {
    const packet = await buildControlPacket(status, {
      currentUserDelta: "Preserve approved proportions; correct the front attachment.",
    });
    const delta = buildControlDelta({
      capability: "manage_cubes",
      phaseBefore: "geometry",
      phaseAfter: "geometry",
      projectUuid: "project-a",
      succeeded: false,
    });

    const checkpoint = buildControlContinuationCheckpoint(packet, delta);

    expect(checkpoint.schema).toBe("lazydesigner-continuation-v1");
    expect(checkpoint.task_context_id).toBe(packet.task_context_id);
    expect(checkpoint.project).toEqual({
      active_uuid: "project-a",
      binding: "BOUND",
    });
    expect(checkpoint.stage_context?.current_user_delta).toBe(
      "Preserve approved proportions; correct the front attachment."
    );
    expect(checkpoint.last_operation?.freshness.basis).toBe("UNKNOWN_OUTCOME");
    expect(checkpoint.last_operation?.freshness.unknown).toHaveLength(8);
    expect(checkpoint.last_operation?.requires_status_refresh).toBe(false);
  });

  test("retains decision-changing visual verification scope but not fresh complement/source ownership", async () => {
    const packet = await buildControlPacket(status);
    const delta = buildControlDelta({
      capability: "manage_cubes",
      phaseBefore: "geometry",
      phaseAfter: "geometry",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        visual_scope: {
          cube_uuids: ["cube-a"],
          framing: { min: [0, 0, 0], max: [4, 8, 4] },
        },
        geometry_effect: { changed_fields: ["rotation"] },
      },
    });

    const checkpoint = buildControlContinuationCheckpoint(packet, delta);
    expect(checkpoint.last_operation?.verification_class).toBe("visual");
    expect(checkpoint.last_operation?.verification_scope).toMatchObject({
      kind: "CUBE_TARGETS",
      cube_uuids: ["cube-a"],
    });
    expect(checkpoint.last_operation?.freshness).not.toHaveProperty("fresh");
    expect(checkpoint.last_operation).not.toHaveProperty("source_owner");
  });


  test("preserves authoritative revision evidence needed after conversation compaction", async () => {
    const packet = await buildControlPacket(status);
    const delta = buildControlDelta({
      capability: "paint_texture_transaction",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        texture: { uuid: "texture-a", name: "atlas" },
        revision: {
          before: "sha256:before",
          after: "sha256:after",
        },
        operation_count: 1,
        pixel_writes: 4,
        affected_rect: [0, 0, 2, 2],
      },
    });

    const checkpoint = buildControlContinuationCheckpoint(packet, delta);
    expect(checkpoint.last_operation?.revision_evidence).toEqual({
      TEXTURE_APPEARANCE: "sha256:after",
    });
  });

  test("keeps cached active context identities across a compaction boundary", async () => {
    const first = await buildControlPacket(status);
    const known = first.context.required.map((handle) => handle.id);
    const cached = await buildControlPacket(status, { knownContextIds: known });

    expect(cached.context.required).toEqual([]);
    expect(cached.context.cached_ids).toEqual(known);

    const checkpoint = buildControlContinuationCheckpoint(cached);
    expect(checkpoint.context.active_ids).toEqual(known);
    expect(checkpoint.context.invalidated_ids).toEqual([]);
    expect(checkpoint.context).not.toHaveProperty("required_ids");
  });

  test("is materially smaller than internal packet plus complete delta", async () => {
    const packet = await buildControlPacket(status);
    const delta = buildControlDelta({
      capability: "manage_cubes",
      phaseBefore: "geometry",
      phaseAfter: "geometry",
      projectUuid: "project-a",
      succeeded: true,
      result: { geometry_effect: { changed_fields: ["rotation"] } },
    });
    const checkpoint = buildControlContinuationCheckpoint(packet, delta);

    const bytes = (value: unknown) =>
      new TextEncoder().encode(JSON.stringify(value)).byteLength;
    expect(bytes(checkpoint)).toBeLessThan(bytes({ packet, delta }));
  });
});
