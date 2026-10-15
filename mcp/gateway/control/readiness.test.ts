import { describe, expect, test } from "bun:test";
import {
  buildReadiness,
  lifecycleForDomain,
  NOT_REQUIRED_LIFECYCLE,
} from "./readiness";
import { emptyReference } from "./referenceParser";
import { emptyWorkspace } from "./packetData";
import type { ControlSnapshot } from "./types";

const baseSnapshot = (): ControlSnapshot => ({
  protocol: "lazydesigner-control-v1",
  system: "READY",
  mode: "ASSET_AUTHORING",
  project: {
    affinity_uuid: "project-1",
    active_uuid: "project-1",
    open_project_count: 1,
    binding: "BOUND",
  },
  authoring: {
    phase: "geometry",
    domain: "GEOMETRY",
    next_intent: "CONTINUE_GEOMETRY_OR_UV",
  },
  runtime: {
    online: true,
    mcp_client_ready: true,
    build_identity: "build",
    runtime_signature: "runtime",
    catalog_count: 54,
    catalog_stale: false,
  },
  context: {
    required: [{
      id: "ctx:skill/modelling@abc.def",
      path: "skill",
      sha256: "a".repeat(64),
      semantic_dependencies: ["routing", "graph"],
      semantic_revision: "b".repeat(64),
    }],
    optional: [],
  },
  blockers: [],
});

describe("Control readiness policy", () => {
  test("Geometry is lifecycle-ready without downstream approvals", () => {
    const lifecycle = lifecycleForDomain("GEOMETRY", emptyWorkspace());
    expect(lifecycle).toMatchObject({
      ready: true,
      blocked: false,
      orientation_required: false,
    });
  });

  test("Texturing requires Geometry approval and UV pass when workspace is available", () => {
    const workspace = {
      ...emptyWorkspace(),
      available: true,
      unavailable_reason: undefined,
      gates: {
        geometry: "APPROVED",
        uv_layout: "PASS",
        texturing: null,
        animation: null,
      },
    };
    expect(lifecycleForDomain("TEXTURING", workspace).blocked).toBe(false);

    workspace.gates.uv_layout = "PENDING";
    expect(lifecycleForDomain("TEXTURING", workspace).reasons).toContain(
      "UV_LAYOUT_PASS_REQUIRED"
    );
  });

  test("missing reference asks for orientation, never signals modelling READY", () => {
    const snapshot = baseSnapshot();
    const missing = buildReadiness(
      snapshot, emptyWorkspace(), emptyReference("REFERENCE_PATH_UNAVAILABLE"),
      "ASSET_AUTHORING", NOT_REQUIRED_LIFECYCLE, null
    );
    expect(missing.modelling_start).toBe("NEEDS_ORIENTATION");
    expect(missing.reasons).toContain("REFERENCE_PACKAGE_UNAVAILABLE");
    const present = buildReadiness(
      snapshot, emptyWorkspace(),
      { ...emptyReference("REFERENCE_PATH_UNAVAILABLE"), available: true },
      "ASSET_AUTHORING", NOT_REQUIRED_LIFECYCLE, null
    );
    expect(present.modelling_start).toBe("READY");
  });

  test("incomplete reference projection requires orientation without blocking the Runtime", () => {
    const truncated = buildReadiness(
      baseSnapshot(), emptyWorkspace(),
      { ...emptyReference("REFERENCE_PATH_UNAVAILABLE"), available: true,
        truncated_sections: ["parts"] },
      "ASSET_AUTHORING", NOT_REQUIRED_LIFECYCLE, null
    );
    expect(truncated.modelling_start).toBe("NEEDS_ORIENTATION");
    expect(truncated.runtime_ready).toBe(true);
    expect(truncated.reasons).toContain("REFERENCE_PROJECTION_INCOMPLETE");
  });

  test("first HTTP-only Runtime probe is orientation rather than MCP execution-ready", () => {
    const baseline = baseSnapshot();
    const cold = {
      ...baseline,
      runtime: { ...baseline.runtime, mcp_client_ready: false },
    };
    const reference = {
      ...emptyReference("REFERENCE_PATH_UNAVAILABLE"),
      available: true,
    };
    const asset = buildReadiness(
      cold, emptyWorkspace(), reference,
      "ASSET_AUTHORING", NOT_REQUIRED_LIFECYCLE, "READY"
    );
    expect(asset.runtime_ready).toBe(false);
    expect(asset.modelling_start).toBe("NEEDS_ORIENTATION");
    expect(asset.reasons).toContain("RUNTIME_HANDSHAKE_PENDING");
    expect(asset.reasons).not.toContain("RUNTIME_CLIENT_NOT_READY");

    const dev = buildReadiness(
      cold, emptyWorkspace(), emptyReference("REFERENCE_PATH_UNAVAILABLE"),
      "SYSTEM_DEVELOPMENT", NOT_REQUIRED_LIFECYCLE, null
    );
    expect(dev.runtime_ready).toBe(false);
    expect(dev.context_ready).toBe(true);
    expect(dev.reasons).toContain("RUNTIME_HANDSHAKE_PENDING");

    const warm = buildReadiness(
      baseline, emptyWorkspace(), reference,
      "ASSET_AUTHORING", NOT_REQUIRED_LIFECYCLE, "READY"
    );
    expect(warm.runtime_ready).toBe(true);
    expect(warm.modelling_start).toBe("READY");
  });

  test("system development does not report Runtime ready when the MCP client is lost", () => {
    const disconnected = {
      ...baseSnapshot(),
      blockers: ["RUNTIME_CLIENT_NOT_READY"],
    };
    const readiness = buildReadiness(
      disconnected,
      emptyWorkspace(),
      emptyReference("REFERENCE_PATH_UNAVAILABLE"),
      "SYSTEM_DEVELOPMENT",
      NOT_REQUIRED_LIFECYCLE,
      null
    );
    expect(readiness.runtime_ready).toBe(false);
    expect(readiness.context_ready).toBe(true);
    expect(readiness.modelling_start).toBe("NEEDS_ORIENTATION");
    expect(readiness.reasons).toContain("RUNTIME_CLIENT_NOT_READY");
    expect(readiness.reasons).toContain("SYSTEM_DEVELOPMENT_MODE");
  });

  test("system development readiness does not require asset context", () => {
    const readiness = buildReadiness(
      baseSnapshot(),
      emptyWorkspace(),
      emptyReference("REFERENCE_PATH_UNAVAILABLE"),
      "SYSTEM_DEVELOPMENT",
      NOT_REQUIRED_LIFECYCLE,
      null
    );
    expect(readiness).toMatchObject({
      modelling_start: "NEEDS_ORIENTATION",
      runtime_ready: true,
      context_ready: true,
      workspace_state: "NOT_REQUIRED",
      reasons: ["SYSTEM_DEVELOPMENT_MODE"],
    });
  });
});
