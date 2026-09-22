import { describe, expect, test } from "bun:test";
import {
  gatewayDescribeOutputSchema,
  gatewayErrorOutputSchema,
  gatewaySearchOutputSchema,
  gatewayStatusOutputSchema,
} from "../gateway/outputSchemas";

describe("Gateway output schemas", () => {
  test("status contract accepts compact semantic status and rejects malformed revisions", () => {
    const value = {
      gateway: "ready",
      affinity: { project_uuid: null, authoring_phase: "geometry" },
      runtime: {
        online: true,
        mcp_client_ready: true,
        catalog_stale: false,
        catalog_count: 54,
        semantic_catalog_revision: "a".repeat(64),
        identity: {},
      },
      connection: { state: "ready" },
      operations: { active: 0, queued: 0 },
      control: {
        system: "READY",
        task_context_id: "task:" + "b".repeat(20),
        context: {},
      },
    };

    expect(gatewayStatusOutputSchema.safeParse(value).success).toBe(true);
    expect(
      gatewayStatusOutputSchema.safeParse({
        ...value,
        runtime: {
          ...value.runtime,
          semantic_catalog_revision: "stale",
        },
      }).success
    ).toBe(false);
  });

  test("search contract preserves bounded routing fields", () => {
    expect(
      gatewaySearchOutputSchema.safeParse({
        capabilities: [
          {
            capability_id: "manage_cubes",
            branch: { field: "operation", value: "update" },
            tier: "primary",
            authoring_domain: "GEOMETRY",
            flags: ["destructive"],
          },
        ],
      }).success
    ).toBe(true);
  });

  test("describe contract requires content-addressed schema identity", () => {
    expect(
      gatewayDescribeOutputSchema.safeParse({
        capability: {
          semantic_id: "branch:manage_cubes/operation=update",
          semantic_revision: "c".repeat(64),
          inputSchema: { type: "object" },
        },
      }).success
    ).toBe(true);
  });

  test("all typed Gateway read tools share the explicit error envelope", () => {
    const error = {
      code: "BACKEND_UNAVAILABLE",
      message: "offline",
      recovery: { action: "retry_later" },
    };
    expect(gatewayErrorOutputSchema.safeParse(error).success).toBe(true);
    for (const schema of [
      gatewayStatusOutputSchema,
      gatewaySearchOutputSchema,
      gatewayDescribeOutputSchema,
    ]) {
      expect(schema.safeParse(error).success).toBe(true);
    }
  });
});
