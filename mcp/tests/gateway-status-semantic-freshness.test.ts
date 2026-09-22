import { describe, expect, test } from "bun:test";
import { projectGatewayStatus } from "../gateway/statusProjection";
import { CAPABILITY_SEMANTIC_CATALOG_REVISIONS } from "../gateway/capabilities/semanticRegistry";

const baseStatus = {
  gateway: "ready",
  affinity: { project_uuid: null, authoring_phase: null },
  runtime: {
    online: false,
    endpoint: "http://127.0.0.1",
    mcp_client_ready: false,
    protocol_era: null,
    catalog_stale: false,
    runtime_signature: null,
    connected_signature: null,
    catalog_count: 0,
    health: null,
  },
  connection: {
    state: "offline",
    reconnect_count: 0,
    reconnect: null,
  },
  operations: { active: 0, queued: 0, max_queue_depth: 0 },
  last_error: null,
} as any;

describe("gateway status semantic freshness", () => {
  test("does not add consumer freshness noise unless revisions are supplied", () => {
    const projected = projectGatewayStatus(baseStatus);
    expect(projected.runtime.semantic_freshness).toBeUndefined();
    expect(projected.runtime.semantic_catalog_revisions).toEqual(
      CAPABILITY_SEMANTIC_CATALOG_REVISIONS
    );
  });

  test("returns minimal refresh advice for stale client revisions", () => {
    const projected = projectGatewayStatus(baseStatus, {
      ...CAPABILITY_SEMANTIC_CATALOG_REVISIONS,
      schema_projection: "0".repeat(64),
      aggregate: "1".repeat(64),
    });
    expect(projected.runtime.semantic_freshness?.status).toBe("STALE");
    expect(projected.runtime.semantic_freshness?.refresh_surfaces).toEqual([
      "DESCRIBE_SCHEMA",
    ]);
  });
});
