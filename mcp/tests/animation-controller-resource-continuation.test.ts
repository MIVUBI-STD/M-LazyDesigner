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
      write: null,
      content: "{}",
      truncated: false,
    };

    expect(animationControllerResourceStateNeutral(result)).toBe(true);

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
