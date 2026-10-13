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
    expect(delta.verification_class).toBe("not_applicable");
  });

  test("a mutation cannot claim no-op from a read receipt or contradictory operation", () => {
    const invoke = (
      operation: "bind" | "assign" | "set_slot" | "unassign",
      result: unknown
    ) => buildControlDelta({
      capability: "manage_render_profile",
      branch: { field: "operation", value: operation },
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result,
    });

    const misleadingRead = invoke("bind", {
      execution: "read", action: "render_profile", operation: "inspect",
      summary: { slots: [], assignments: [] },
    });
    expect(misleadingRead.freshness.basis).not.toBe("NO_CHANGE");
    expect(misleadingRead.invalidates.authoring_domains).toContain("TEXTURING");

    const compiledBind = {
      execution: "applied", action: "render_profile", operation: "bind",
      binding: { slot: "default", minecraft_material_code: "entity" },
      write_transaction: { state: "compile_only", write_count: 0 },
      client_entity_write: null, render_controller_write: null,
    };
    expect(invoke("bind", compiledBind).freshness.basis).toBe("NO_CHANGE");
    expect(invoke("assign", compiledBind).freshness.basis).not.toBe("NO_CHANGE");

    const contradicted = invoke("bind", {
      ...compiledBind,
      render_controller_write: {
        key: "render_controller", path: "/tmp/rp.json", byte_length: 2,
        replaced_existing: false, transaction: "single_atomic",
      },
    });
    expect(contradicted.freshness.basis).not.toBe("NO_CHANGE");

    const slot = {
      execution: "applied", action: "render_profile",
      operation: "set_slot", slot: "default", write: null,
    };
    expect(invoke("set_slot", slot).freshness.basis).toBe("NO_CHANGE");
    expect(invoke("bind", slot).freshness.basis).not.toBe("NO_CHANGE");
    expect(invoke("set_slot", {
      execution: "applied", action: "render_profile",
      operation: "set_slot", write: null,
    }).freshness.basis).not.toBe("NO_CHANGE");
  });

  test("Gateway branch-query optimization applies to render-profile inspect", async () => {
    const source = await Bun.file("gateway/execution/capabilityExecutor.ts").text();
    expect(source).toContain(
      'manifestEntryForBranch(capability, branch)?.operationClass === "QUERY"'
    );
    expect(source).toContain("effectiveReadOnly || branchControl");
  });
});
