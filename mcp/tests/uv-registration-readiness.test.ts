import { describe, expect, test } from "bun:test";
import { classifyMcpToolPhaseByName } from "@/lib/authoringPhase";
import { getCapabilityMetadata } from "@/lib/capabilityMetadata";
import {
  authoringDomainForCapability,
  sourceOwnerForCapability,
} from "@/gateway/control";
import {
  getCapabilityBranchFields,
} from "@/gateway/schemaProjection";
import { GATEWAY_TOOL_NAMES } from "@/gateway/contract";
import { tools } from "@/lib/factories";
import "@/server/tools";

describe("UV Runtime registration readiness", () => {
  test("future UV layout remains Geometry-owned without changing the Gateway surface", () => {
    expect(classifyMcpToolPhaseByName("manage_uv_layout")).toBe("geometry");
    expect(authoringDomainForCapability("manage_uv_layout")).toBe("GEOMETRY");
    expect(sourceOwnerForCapability("manage_uv_layout")).toEqual({
      source: "mcp/server/runtime/uv/layoutService.ts",
      specialist: ".agents/skills/lazydesigner-modelling/SKILL.md",
      anchor_test: "mcp/tests/uv-registration-readiness.test.ts",
    });
    expect(GATEWAY_TOOL_NAMES).toEqual([
      "status",
      "search_capabilities",
      "describe_capability",
      "invoke_capability",
    ]);
  });

  test("UV ownership never transfers texture atlas and Painter to Modelling", () => {
    expect(classifyMcpToolPhaseByName("create_texture")).toBe("texturing");
    expect(classifyMcpToolPhaseByName("paint_texture_transaction")).toBe("texturing");
    expect(authoringDomainForCapability("create_texture")).toBe("TEXTURING");
    expect(sourceOwnerForCapability("create_texture").specialist)
      .toBe(".agents/skills/lazydesigner-texturing/SKILL.md");
    // Shared AUTHORING surface does not imply shared semantic ownership.
    expect(classifyMcpToolPhaseByName("manage_cubes")).toBe("geometry");
  });

  test("metadata and describe branches are ready before generator-backed catalog registration", () => {
    const metadata = getCapabilityMetadata("manage_uv_layout");
    expect(metadata.tier).toBe("primary");
    expect(metadata.verificationClass).toBe("visual");
    expect(metadata.searchAliases).toContain("uv layout");

    expect(
      getCapabilityBranchFields("manage_uv_layout", {
        field: "operation",
        value: "plan",
      })
    ).toContain("constraints");
    expect(
      getCapabilityBranchFields("manage_uv_layout", {
        field: "operation",
        value: "apply",
      })
    ).toEqual([
      "operation",
      "plan_id",
      "expected_source_fingerprint",
    ]);
  });

  test("remote prewiring does not register manage_uv_layout before generated docs can be refreshed", () => {
    expect(tools).not.toHaveProperty("manage_uv_layout");
  });
});
