import { describe, expect, test } from "bun:test";
import {
  resolveAuthoringPhaseAffinity,
  resolveProjectAffinity,
} from "./affinityPolicy";
import { GatewayBackendError } from "./backendContract";

function health(input: {
  phase?: string;
  active?: string | null;
  requested?: string | null;
  available?: boolean | null;
  count?: number;
}) {
  return {
    product: {
      authoring_phase: input.phase ?? "geometry",
    },
    project_context: {
      active_project_uuid: input.active ?? "project-a",
      requested_project_uuid: input.requested ?? null,
      requested_project_available: input.available ?? null,
      open_project_count: input.count ?? 1,
    },
  };
}

describe("Gateway affinity policy", () => {
  test("adopts Runtime phase when Gateway phase is unset", () => {
    expect(
      resolveAuthoringPhaseAffinity(null, health({ phase: "texturing" }))
    ).toEqual({ value: "texturing", changed: true });
  });

  test("rejects Runtime phase drift from bound affinity", () => {
    expect(() =>
      resolveAuthoringPhaseAffinity(
        "geometry",
        health({ phase: "animation" })
      )
    ).toThrow(GatewayBackendError);
  });

  test("binds the only active project when explicitly requested", () => {
    expect(
      resolveProjectAffinity(
        null,
        health({
          active: "project-a",
          requested: null,
          available: null,
          count: 1,
        }),
        true
      )
    ).toEqual({ value: "project-a", changed: true });
  });

  test("fails closed when multiple projects are open", () => {
    expect(() =>
      resolveProjectAffinity(
        null,
        health({
          active: "project-a",
          requested: null,
          available: null,
          count: 2,
        }),
        true
      )
    ).toThrow(GatewayBackendError);
  });

  test("can clear a missing bound project only for explicit transition flows", () => {
    expect(
      resolveProjectAffinity(
        "project-a",
        health({
          active: "project-b",
          requested: "project-a",
          available: false,
          count: 1,
        }),
        false,
        true
      )
    ).toEqual({ value: null, changed: true });
  });
});
