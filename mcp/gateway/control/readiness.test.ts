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
