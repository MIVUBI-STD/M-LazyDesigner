import { describe, expect, test } from "bun:test";
import { taskContextId } from "./packetContext";
import type { ControlSnapshot } from "./types";
import type { ControlWorkspaceProjection } from "./workspace";
import type { ControlReferenceProjection } from "./referenceTypes";

const snapshot: ControlSnapshot = {
  protocol: "lazydesigner-control-v1",
  system: "READY",
  mode: "ASSET_AUTHORING",
  project: {
    affinity_uuid: "project|one",
    active_uuid: "project|one",
    open_project_count: 1,
    binding: "BOUND",
  },
  authoring: {
    phase: "geometry",
    domain: "GEOMETRY",
    next_intent: "",
  },
  runtime: {
    online: true,
    build_identity: "build|one",
    runtime_signature: null,
    catalog_count: 1,
    catalog_stale: false,
  },
  context: { required: [], optional: [] },
  blockers: [],
};

const workspace: ControlWorkspaceProjection = {
  available: true,
  source_path: null,
  fingerprint: "workspace|one",
  asset: "Chair",
  current_stage: "Geometry",
  gates: {
    geometry: "IN_PROGRESS",
    uv_layout: "NOT_STARTED",
    texturing: "NOT_STARTED",
    animation: "NOT_STARTED",
  },
  next_step: null,
  blockers: [],
};

const reference: ControlReferenceProjection = {
  available: true,
  source_path: null,
  package_root: null,
  fingerprint: "reference|one",
  schema: "lazydesigner-reference-v1",
  asset_name: "Chair",
  asset_kind: "MODEL",
  intent: "build chair",
  selected_profile: "PROP_FURNITURE",
  requirements: {
    dimensions_blocks: null,
    player_relative_scale: null,
    animation_required: false,
  },
  readiness: {
    overall: "READY",
    geometry: "READY",
    texture: "UNKNOWN",
    animation: "UNKNOWN",
  },
  particle: null,
  blocking_unknowns: [],
  non_blocking_unknowns: [],
  documents: {},
  images: [],
};

describe("task context identity", () => {
  test("structured hashing remains stable and safe with delimiter characters", () => {
    const first = taskContextId(
      snapshot,
      workspace,
      reference,
      "ASSET_AUTHORING",
      null,
      "delta|one"
    );
    const second = taskContextId(
      snapshot,
      workspace,
      reference,
      "ASSET_AUTHORING",
      null,
      "delta|one"
    );

    expect(first).toBe(second);
    expect(first).toMatch(/^task:[a-f0-9]{20}$/);
  });

  test("material task fields change the context identity", () => {
    const base = taskContextId(
      snapshot,
      workspace,
      reference,
      "ASSET_AUTHORING",
      null,
      "delta|one"
    );
    const changed = taskContextId(
      snapshot,
      workspace,
      { ...reference, fingerprint: "reference|two" },
      "ASSET_AUTHORING",
      null,
      "delta|one"
    );

    expect(base).not.toBe(changed);
  });
});
