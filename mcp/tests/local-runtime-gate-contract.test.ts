import { describe, expect, test } from "bun:test";
import { getEnabledToolDefinitions } from "@/lib/factories";
import { getMcpSurfaceToolNames } from "@/server/tools";
import {
  classifyPreflightFailure,
  getLocalSmokeDiagnostic,
} from "../scripts/verify-stateless-local";

const REQUIRED_GEOMETRY_TOOLS = [
  "create_project",
  "add_group",
  "manage_cubes",
  "modify_group",
  "reparent_element",
  "manage_locator",
  "capture_model_views",
  "bone_rigging",
  "export_model",
] as const;

const PLAN_FREE_GEOMETRY_TOOLS = [
  "add_group",
  "manage_cubes",
  "modify_group",
  "reparent_element",
  "manage_locator",
] as const;

const RETIRED_GEOMETRY_TOOLS = [
  "manage_geometry_reference",
  "materialize_3d_assisted_scaffold",
] as const;

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("local runtime gate source contract", () => {
  test("shared AUTHORING acceptance surface is complete and plan-free", () => {
    const names = getMcpSurfaceToolNames("bedrock_entity", "geometry");
    const texturingNames = getMcpSurfaceToolNames("bedrock_entity", "texturing");
    const definitions = getEnabledToolDefinitions();

    expect(names).toEqual(texturingNames);
    expect(names.length).toBeGreaterThanOrEqual(REQUIRED_GEOMETRY_TOOLS.length);
    for (const toolName of REQUIRED_GEOMETRY_TOOLS) {
      expect(names, toolName).toContain(toolName);
      expect(definitions[toolName], toolName).toBeDefined();
    }

    for (const toolName of RETIRED_GEOMETRY_TOOLS) {
      expect(names, toolName).not.toContain(toolName);
    }

    for (const toolName of PLAN_FREE_GEOMETRY_TOOLS) {
      const definition = definitions[toolName];
      if (!definition) throw new Error(`Missing Geometry definition: ${toolName}`);
      expect(Object.keys(definition.inputSchema), `${toolName} inputSchema`).not.toContain(
        "plan_id"
      );
    }
  });

  test("diagnostic preflight classifies the first known wrong owner", () => {
    expect(classifyPreflightFailure({ reachable: false })).toBe(
      "BLOCKBENCH_SERVER_UNREACHABLE"
    );
    expect(
      classifyPreflightFailure({ reachable: true, healthReadable: false })
    ).toBe("MCP_HEALTH_UNREADABLE");
    expect(
      classifyPreflightFailure({
        reachable: true,
        healthReadable: true,
        productMatches: false,
        buildMatches: false,
      })
    ).toBe("WRONG_MCP_PRODUCT");
    expect(
      classifyPreflightFailure({
        reachable: true,
        healthReadable: true,
        productMatches: true,
        buildMatches: false,
      })
    ).toBe("STALE_BUILD");
    expect(
      classifyPreflightFailure({
        reachable: true,
        healthReadable: true,
        productMatches: true,
        buildMatches: true,
        processStable: false,
      })
    ).toBe("SERVER_PROCESS_UNSTABLE");
    expect(
      classifyPreflightFailure({
        reachable: true,
        healthReadable: true,
        productMatches: true,
        buildMatches: true,
        processStable: true,
        phaseMatches: false,
      })
    ).toBe("WRONG_AUTHORING_PHASE");
    expect(
      classifyPreflightFailure({
        reachable: true,
        healthReadable: true,
        productMatches: true,
        buildMatches: true,
        processStable: true,
        phaseMatches: true,
        transportMatches: false,
      })
    ).toBe("MCP_HEALTH_CONTRACT_MISMATCH");
    expect(
      classifyPreflightFailure({
        reachable: true,
        healthReadable: true,
        productMatches: true,
        buildMatches: true,
        processStable: true,
        phaseMatches: true,
        transportMatches: true,
      })
    ).toBeNull();
  });

  test("environment/runtime diagnostics stop before downstream surface diagnosis", () => {
    for (const code of [
      "BLOCKBENCH_SERVER_UNREACHABLE",
      "MCP_HEALTH_UNREADABLE",
      "WRONG_MCP_PRODUCT",
      "STALE_BUILD",
      "SERVER_PROCESS_UNSTABLE",
      "WRONG_AUTHORING_PHASE",
      "MCP_HEALTH_CONTRACT_MISMATCH",
      "MCP_INITIALIZE_CONTRACT_MISMATCH",
    ] as const) {
      expect(getLocalSmokeDiagnostic(code).stopBeforeSurface, code).toBe(true);
    }

    expect(getLocalSmokeDiagnostic("STALE_BUILD").classification).toBe(
      "ENVIRONMENT / INSTALL"
    );
    expect(getLocalSmokeDiagnostic("SERVER_PROCESS_UNSTABLE").classification).toBe(
      "BLOCKBENCH_RUNTIME"
    );
    expect(getLocalSmokeDiagnostic("SURFACE_MISMATCH").stopBeforeSurface).toBe(false);
  });

  test("operator docs point to the current artifact and handoff contract", async () => {
    const [readme, runbook] = await Promise.all([
      source("README.md"),
      source("../docs/05-operations/local-acceptance-runbook.md"),
    ]);

    expect(readme).toContain("dist/blockit_mcp.js");
    expect(readme).toContain("AUTHORING↔Animation handoff");
    expect(readme).toContain("retired 3D-assisted/Hunyuan/PrimitiveAnything path");

    expect(runbook).toContain("cd mcp");
    expect(runbook).toContain("bun run deploy:local");
    expect(runbook).toContain("bun run verify:stateless-local");
    expect(runbook).toContain("build_identity");
    expect(runbook).toContain("UV Layout PASS");
    expect(runbook).toContain("Synthetic readiness never proves user asset approval");
  });
});
