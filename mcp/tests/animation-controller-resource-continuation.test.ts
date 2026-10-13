import { describe, expect, test } from "bun:test";
import { manifestEntryForBranch } from "@/gateway/capabilities/manifest";
import { buildControlDelta } from "@/gateway/control";
import { animationControllerResourceStateNeutral } from "@/gateway/control/delta/receipts";

describe("animation controller resource continuation", () => {
  test("resource branches are explicit authored resource mutations", () => {
    expect(
      manifestEntryForBranch("manage_animation_controller", {
        field: "resource_kind",
        value: "client_entity",
      })
    ).toMatchObject({
      operationClass: "MUTATION",
      verificationClass: "focused_read",
    });

    expect(
      manifestEntryForBranch("manage_animation_controller", {
        field: "resource_kind",
        value: "animation_controller",
      })
    ).toMatchObject({
      operationClass: "MUTATION",
      verificationClass: "focused_read",
    });
  });

  test("compile-only resource transformation is state-neutral", () => {
    const result = {
      execution: "applied",
      action: "runtime_resource",
      resource_kind: "client_entity",
      source_path: null,
      write: null,
      content: "{}",
      truncated: false,
    };

    const branch = { field: "resource_kind", value: "client_entity" };
    expect(animationControllerResourceStateNeutral(result, branch)).toBe(true);
    expect(animationControllerResourceStateNeutral(result)).toBe(false);

    const delta = buildControlDelta({
      capability: "manage_animation_controller",
      branch: { field: "resource_kind", value: "client_entity" },
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
      result,
    });

    expect(delta.freshness.basis).toBe("NO_CHANGE");
    expect(delta.invalidates.authoring_domains).toEqual([]);
    expect(delta.invalidates.acceptance_gates).toBe(false);
    expect(delta.verification_class).toBe("receipt_only");
  });

  test("a compile-only receipt cannot suppress an unrelated native controller mutation", () => {
    const compiled = {
      execution: "applied",
      action: "runtime_resource",
      resource_kind: "client_entity",
      source_path: null,
      write: null,
      content: "{}", truncated: false,
    };
    const base = {
      capability: "manage_animation_controller",
      phaseBefore: "animation" as const,
      phaseAfter: "animation" as const,
      projectUuid: "project-a",
      succeeded: true,
    };
    for (const [branch, result] of [
      [undefined, compiled],
      [{field:"resource_kind",value:"animation_controller"}, compiled],
      [{field:"resource_kind",value:"client_entity"},
        {...compiled,source_path:"/tmp/client_entity.json"}],
      [{field:"resource_kind",value:"client_entity"},
        {...compiled,write:{path:"/tmp/output.json",byte_length:10}}],
      [{field:"resource_kind",value:"client_entity"},
        {...compiled,action:"updated"}],
    ] as const) {
      expect(animationControllerResourceStateNeutral(result, branch)).toBe(false);
      const delta = buildControlDelta({ ...base, branch, result });
      expect(delta.freshness.basis).not.toBe("NO_CHANGE");
      expect(delta.freshness.stale).toContain("ANIMATION_CONTROLLER");
      expect(delta.invalidates.authoring_domains).toEqual(["ANIMATION"]);
    }
  });

  test("persisted resource write remains mutation", () => {
    const result = {
      execution: "applied",
      action: "runtime_resource",
      resource_kind: "client_entity",
      write: {
        path: "/tmp/client_entity.json",
        byte_length: 42,
        replaced_existing: false,
      },
    };

    expect(animationControllerResourceStateNeutral(result)).toBe(false);

    const delta = buildControlDelta({
      capability: "manage_animation_controller",
      branch: { field: "resource_kind", value: "client_entity" },
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
      result,
    });

    expect(delta.freshness.basis).not.toBe("NO_CHANGE");
    expect(delta.invalidates.authoring_domains).toEqual(["ANIMATION"]);
  });
});
