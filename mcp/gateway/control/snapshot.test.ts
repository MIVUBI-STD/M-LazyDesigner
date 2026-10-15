import { describe, expect, test } from "bun:test";
import { buildControlSnapshot } from "./snapshot";
import { buildReadiness, NOT_REQUIRED_LIFECYCLE } from "./readiness";
import { emptyReference } from "./referenceParser";
import { emptyWorkspace } from "./packetData";
import type { GatewayRuntimeStatus } from "../runtime/backend";

const boundUuid = "project-1";
function runtimeStatus(input: {
  online?: boolean;
  clientReady?: boolean;
  bound?: string | null;
  health?: Record<string, unknown> | null;
} = {}): GatewayRuntimeStatus {
  const {
    online = true, clientReady = true, bound = boundUuid,
    health = { project_context: {
      active_project_uuid: boundUuid,
      requested_project_uuid: bound,
      requested_project_available: true,
      open_project_count: 1,
    } },
  } = input;
  return {
    gateway: "ready",
    affinity: { project_uuid: bound, authoring_phase: "geometry" },
    runtime: {
      online, mcp_client_ready: clientReady,
      catalog_stale: false, catalog_count: 47,
      health, runtime_signature: "fixture-runtime",
    },
  } as GatewayRuntimeStatus;
}

describe("R02 Gateway/Runtime/project identity verification", () => {
  test("matching requested project remains bound", () => {
    const snapshot = buildControlSnapshot(runtimeStatus());
    expect(snapshot.project.binding).toBe("BOUND");
    expect(snapshot.system).toBe("READY");
  });

  test("health without project context cannot certify BOUND", () => {
    const snapshot = buildControlSnapshot(runtimeStatus({ health: {} }));
    expect(snapshot.project.binding).toBe("UNKNOWN");
    expect(snapshot.system).toBe("DEGRADED");
    expect(snapshot.blockers).toContain("PROJECT_CONTEXT_UNVERIFIED");
  });

  test("a different returned project identity cannot certify requested affinity", () => {
    const snapshot = buildControlSnapshot(runtimeStatus({ health: {
      project_context: {
        active_project_uuid: "project-2",
        requested_project_uuid: "project-2",
        requested_project_available: true,
        open_project_count: 2,
      },
    } }));
    expect(snapshot.project.binding).toBe("UNKNOWN");
    expect(snapshot.blockers).toContain("PROJECT_CONTEXT_UNVERIFIED");
  });

  test("explicit missing bound project stays LOST", () => {
    const snapshot = buildControlSnapshot(runtimeStatus({ health: {
      project_context: {
        active_project_uuid: "project-2",
        requested_project_uuid: boundUuid,
        requested_project_available: false,
        open_project_count: 1,
      },
    } }));
    expect(snapshot.project.binding).toBe("LOST");
    expect(snapshot.blockers).toContain("PROJECT_CONTEXT_LOST");
  });

  test("first healthy Runtime probe is not mistaken for a failed MCP connection", () => {
    const firstProbe = runtimeStatus({ clientReady: false });
    firstProbe.runtime.connected_signature = null;
    firstProbe.connection = {
      state: "probing",
      last_ready_at: null,
    } as GatewayRuntimeStatus["connection"];
    const snapshot = buildControlSnapshot(firstProbe);
    expect(snapshot.system).toBe("READY");
    expect(snapshot.project.binding).toBe("BOUND");
    expect(snapshot.blockers).not.toContain("RUNTIME_CLIENT_NOT_READY");
    expect(firstProbe.runtime.mcp_client_ready).toBe(false);
  });

  test("previously connected MCP becoming unavailable is degraded, not cold start", () => {
    const later = runtimeStatus({ clientReady: false });
    later.runtime.connected_signature = null;
    later.connection = {
      state: "probing",
      last_ready_at: "2026-10-15T00:00:00.000Z",
    } as GatewayRuntimeStatus["connection"];
    expect(buildControlSnapshot(later).blockers).toContain("RUNTIME_CLIENT_NOT_READY");
  });

  test("online health does not imply MCP client connection", () => {
    const snapshot = buildControlSnapshot(runtimeStatus({ clientReady: false }));
    expect(snapshot.system).toBe("DEGRADED");
    expect(snapshot.blockers).toContain("RUNTIME_CLIENT_NOT_READY");
    const readiness = buildReadiness(
      { ...snapshot, context: {
        required: [{
          id: "ctx:skill/modelling@aaa.bbb", path: "skill",
          sha256: "a".repeat(64), semantic_dependencies: ["routing"],
          semantic_revision: "b".repeat(64),
        }], optional: [],
      } },
      emptyWorkspace(),
      { ...emptyReference("REFERENCE_PATH_UNAVAILABLE"), available: true },
      "ASSET_AUTHORING", NOT_REQUIRED_LIFECYCLE, "READY"
    );
    expect(readiness.runtime_ready).toBe(false);
    expect(readiness.modelling_start).toBe("BLOCKED");
    expect(readiness.reasons).toContain("RUNTIME_CLIENT_NOT_READY");
  });

  test("offline Runtime stays OFFLINE rather than falsely READY", () => {
    const snapshot = buildControlSnapshot(runtimeStatus({ online: false, health: null }));
    expect(snapshot.system).toBe("OFFLINE");
    expect(snapshot.blockers).toContain("RUNTIME_OFFLINE");
  });
});
