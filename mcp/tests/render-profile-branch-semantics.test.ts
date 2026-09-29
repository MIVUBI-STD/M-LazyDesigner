import { describe, expect, test } from "bun:test";
import { manifestEntryForBranch } from "@/gateway/capabilities/manifest";
import { searchCapabilityCatalog, type BackendTool } from "@/gateway/contract";
import {
  decorateCapabilities,
  projectCapabilitiesForSearch,
  buildControlDelta,
} from "@/gateway/control";
import { getAllToolDefinitions } from "@/lib/factories";
import { getMcpSurfaceToolNames } from "@/server/tools";

describe("render-profile branch semantics", () => {
  test("inspect is a fast query while authoring branches remain mutations", () => {
    expect(
      manifestEntryForBranch("manage_render_profile", {
        field: "operation",
        value: "inspect",
      })
    ).toMatchObject({
      operationClass: "QUERY",
      executionClass: "fast",
      verificationClass: "not_applicable",
    });

    for (const value of ["bind", "set_slot", "assign", "unassign"]) {
      expect(
        manifestEntryForBranch("manage_render_profile", {
          field: "operation",
          value,
        }),
        value
      ).toMatchObject({
        operationClass: "MUTATION",
        verificationClass: "focused_read",
      });
    }
  });

  test("render-profile intent search resolves the operation branch directly", () => {
    const definitions = getAllToolDefinitions();
    const catalog = getMcpSurfaceToolNames("bedrock_entity", "texturing").map(
      (name) => ({
        name,
        description: definitions[name].description,
        annotations: definitions[name].annotations,
      })
    ) as BackendTool[];

    const inspect = searchCapabilityCatalog(
      catalog,
      "inspect render profile bindings",
      4
    )[0];
    expect(inspect).toMatchObject({
      capability_id: "manage_render_profile",
      branch: { field: "operation", value: "inspect" },
    });
    expect(
      projectCapabilitiesForSearch(decorateCapabilities([inspect]))[0]
        .operation_class
    ).toBe("QUERY");

    expect(
      searchCapabilityCatalog(
        catalog,
        "remove render controller material assignment",
        4
      )[0]
    ).toMatchObject({
      capability_id: "manage_render_profile",
      branch: { field: "operation", value: "unassign" },
    });
  });

  test("read receipt remains state-neutral even if a caller constructs Control delta directly", () => {
    const delta = buildControlDelta({
      capability: "manage_render_profile",
      branch: { field: "operation", value: "inspect" },
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "read",
        action: "render_profile",
        summary: { slots: [], assignments: [] },
      },
    });

    expect(delta.freshness.basis).toBe("NO_CHANGE");
    expect(delta.invalidates.authoring_domains).toEqual([]);
    expect(delta.verification_class).toBe("receipt_only");
  });

  test("Gateway branch-query optimization applies to render-profile inspect", async () => {
    const source = await Bun.file("gateway/runtime/capabilityExecutor.ts").text();
    expect(source).toContain(
      'manifestEntryForBranch(capability, branch)?.operationClass === "QUERY"'
    );
    expect(source).toContain("effectiveReadOnly || branchControl");
  });
});
