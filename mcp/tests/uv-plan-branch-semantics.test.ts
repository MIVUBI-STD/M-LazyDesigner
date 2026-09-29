import { describe, expect, test } from "bun:test";
import { manifestEntryForBranch } from "@/gateway/capabilities/manifest";
import { buildControlDelta } from "@/gateway/control";

describe("UV plan/apply branch semantics", () => {
  test("plan is workflow CONTROL while apply is authored MUTATION", () => {
    expect(
      manifestEntryForBranch("manage_uv_layout", {
        field: "operation",
        value: "plan",
      })
    ).toMatchObject({
      operationClass: "CONTROL",
      verificationClass: "not_applicable",
    });

    expect(
      manifestEntryForBranch("manage_uv_layout", {
        field: "operation",
        value: "apply",
      })
    ).toMatchObject({
      operationClass: "MUTATION",
      verificationClass: "visual",
    });
  });

  test("planning does not invalidate authored UV or texture evidence", () => {
    const delta = buildControlDelta({
      capability: "manage_uv_layout",
      branch: { field: "operation", value: "plan" },
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        plan_id: "uvplan:" + "a".repeat(64),
        source_fingerprint: "sha256:" + "b".repeat(64),
        report: { apply_allowed: true },
      },
    });

    expect(delta.freshness.basis).toBe("NO_CHANGE");
    expect(delta.freshness.stale).toEqual([]);
    expect(delta.invalidates.authoring_domains).toEqual([]);
    expect(delta.invalidates.acceptance_gates).toBe(false);
    expect(delta.verification_class).toBe("not_applicable");
  });

  test("apply keeps normal authored invalidation", () => {
    const delta = buildControlDelta({
      capability: "manage_uv_layout",
      branch: { field: "operation", value: "apply" },
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        receipt: {
          changed_island_ids: ["face:a:north"],
        },
      },
    });

    expect(delta.freshness.basis).not.toBe("NO_CHANGE");
    expect(delta.freshness.stale).toEqual([
      "UV_MAPPING",
      "TEXTURE_APPEARANCE",
    ]);
    expect(delta.invalidates.authoring_domains).toEqual(["TEXTURING"]);
  });
});
