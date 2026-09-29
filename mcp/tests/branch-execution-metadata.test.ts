import { describe, expect, test } from "bun:test";
import { manifestEntryForBranch } from "@/gateway/capabilities/manifest";
import { buildControlDelta } from "@/gateway/control";

describe("branch execution metadata", () => {
  test("mixed material-instance facade distinguishes query and mutation branches", () => {
    expect(
      manifestEntryForBranch("manage_material_instances", {
        field: "operation",
        value: "list",
      })
    ).toMatchObject({
      operationClass: "QUERY",
      executionClass: "fast",
      verificationClass: "not_applicable",
    });

    expect(
      manifestEntryForBranch("manage_material_instances", {
        field: "operation",
        value: "set",
      })
    ).toMatchObject({
      operationClass: "MUTATION",
      verificationClass: "focused_read",
    });
  });

  test("mixed animation timeline branch does not pretend all timeline actions share one operation class", () => {
    expect(
      manifestEntryForBranch("manage_animation_timeline", {
        field: "operation",
        value: "timeline",
      })?.operationClass
    ).toBeUndefined();

    expect(
      manifestEntryForBranch("manage_animation_timeline", {
        field: "operation",
        value: "graph",
      })?.operationClass
    ).toBe("MUTATION");
  });

  test("failed branch-aware control delta uses branch verification fallback", () => {
    const query = buildControlDelta({
      capability: "manage_material_instances",
      branch: { field: "operation", value: "list" },
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: false,
    });
    expect(query.verification_class).toBe("not_applicable");

    const mutation = buildControlDelta({
      capability: "manage_material_instances",
      branch: { field: "operation", value: "set" },
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: false,
    });
    expect(mutation.verification_class).toBe("focused_read");
  });

  test("Gateway executor derives branch before invocation continuation and suppresses query-branch delta", async () => {
    const source = await Bun.file("gateway/runtime/capabilityExecutor.ts").text();
    expect(source).toContain("const branch = capabilityBranchFromArguments(args)");
    expect(source).toContain("manifestEntryForBranch(capability, branch)?.operationClass === \"QUERY\"");
    expect(source).toContain("const effectiveReadOnly = readOnly || branchReadOnly");
    expect(source).toContain("shouldAttachGatewayControlDelta(\n        succeeded,\n        effectiveReadOnly");
    expect(source).toContain("branch,\n        phaseBefore: receipt.phaseBefore");
  });
});
