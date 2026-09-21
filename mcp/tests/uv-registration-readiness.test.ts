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
  test("future UV capability is pre-owned by Texturing without changing the Gateway surface", () => {
    expect(classifyMcpToolPhaseByName("manage_uv_layout")).toBe("texturing");
    expect(authoringDomainForCapability("manage_uv_layout")).toBe("TEXTURING");
    expect(sourceOwnerForCapability("manage_uv_layout")).toEqual({
      source: "mcp/server/runtime/uvLayoutService.ts",
      specialist: ".agents/skills/lazydesigner-texturing/SKILL.md",
      test_owner: "mcp/tests/uv-registration-readiness.test.ts",
    });
    expect(GATEWAY_TOOL_NAMES).toEqual([
      "status",
      "search_capabilities",
      "describe_capability",
      "invoke_capability",
    ]);
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
