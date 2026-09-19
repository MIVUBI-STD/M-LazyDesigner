import { describe, expect, test } from "bun:test";
import { projectGatewayStatus } from "./statusProjection";

describe("projectGatewayStatus", () => {
  test("keeps stable runtime identity without exposing raw health", () => {
    const projected = projectGatewayStatus({
      gateway: "ready",
      affinity: { project_uuid: "project-1", authoring_phase: "geometry" },
      runtime: {
        online: true,
        endpoint: "http://127.0.0.1:3000/bb-mcp",
        mcp_client_ready: true,
        catalog_stale: false,
        runtime_signature: "signature",
        connected_signature: "signature",
        catalog_count: 42,
        health: {
          build_identity: "build-1",
          instance_id: "instance-1",
          startup_time: "now",
          exposed_tool_count: 42,
          noisy_internal_field: { should_not_escape: true },
          product: {
            id: "lazydesigner",
            version: "1.0.0",
            profile: "default",
          },
        },
      },
      connection: {
        state: "ready",
        generation: 1,
        reconnect_count: 0,
        catalog_refresh_count: 1,
        last_ready_at: "now",
        last_transition_at: "now",
        reconnect: { failures: 0, retry_after_ms: 0 },
      },
      operations: {
        active: 0,
        queued: 0,
        max_queue_depth: 8,
        completed: 1,
        failed: 0,
        timed_out: 0,
        rejected_busy: 0,
        last_queue_wait_ms: 3,
        max_queue_wait_ms: 8,
        last_duration_ms: 12,
        max_duration_ms: 24,
      },
      last_error: null,
    });

    expect(projected.runtime.identity.build_identity).toBe("build-1");
    expect(projected.runtime.identity.exposed_tool_count).toBe(42);
    expect("health" in projected.runtime).toBe(false);
    expect("endpoint" in projected.runtime).toBe(false);
    expect("runtime_signature" in projected.runtime).toBe(false);
    expect(projected.operations.last_queue_wait_ms).toBe(3);
    expect(projected.operations.max_duration_ms).toBe(24);
  });
});
