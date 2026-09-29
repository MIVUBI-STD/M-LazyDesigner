import { describe, expect, test } from "bun:test";
import { CAPABILITY_BRANCH_MANIFEST } from "@/gateway/capabilities/manifest";
import { CONSOLIDATED_EXECUTOR_ROUTES } from "@/server/runtime/consolidatedRoutes";
import { searchCapabilityCatalog, type BackendTool } from "@/gateway/contract";
import { projectCapabilitiesForSearch, decorateCapabilities } from "@/gateway/control";
import { getAllToolDefinitions } from "@/lib/factories";
import { getMcpSurfaceToolNames } from "@/server/tools";

describe("consolidated branch semantic completeness", () => {
  test("every branch of every canonical consolidated capability has semantic intent", () => {
    for (const capability of Object.keys(CONSOLIDATED_EXECUTOR_ROUTES)) {
      const entries = CAPABILITY_BRANCH_MANIFEST.filter(
        (entry) => entry.capability === capability && entry.branch
      );
      expect(entries.length, capability).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(entry.semantic, entry.id).toBeDefined();
        expect(entry.semantic?.intents.length, entry.id).toBeGreaterThan(0);
      }
    }
  });

  test("material-instance read branches override capability-level mutation class", () => {
    const definitions = getAllToolDefinitions();
    const catalog = getMcpSurfaceToolNames("bedrock_entity", "texturing").map(
      (name) => ({
        name,
        description: definitions[name].description,
        annotations: definitions[name].annotations,
      })
    ) as BackendTool[];

    const list = searchCapabilityCatalog(
      catalog,
      "list material instances and usage",
      4
    )[0];
    expect(list).toMatchObject({
      capability_id: "manage_material_instances",
      branch: { field: "operation", value: "list" },
    });
    const projectedList = projectCapabilitiesForSearch(
      decorateCapabilities([list])
    )[0];
    expect(projectedList.operation_class).toBe("QUERY");

    const set = searchCapabilityCatalog(
      catalog,
      "set face material instance on cube",
      4
    )[0];
    expect(set).toMatchObject({
      capability_id: "manage_material_instances",
      branch: { field: "operation", value: "set" },
    });
    const projectedSet = projectCapabilitiesForSearch(
      decorateCapabilities([set])
    )[0];
    expect(projectedSet.operation_class).toBe("MUTATION");
  });

  test("animation timeline intent resolves directly to semantic branch", () => {
    const definitions = getAllToolDefinitions();
    const catalog = getMcpSurfaceToolNames("bedrock_entity", "animation").map(
      (name) => ({
        name,
        description: definitions[name].description,
        annotations: definitions[name].annotations,
      })
    ) as BackendTool[];

    expect(
      searchCapabilityCatalog(catalog, "edit bezier curve easing", 4)[0]
    ).toMatchObject({
      capability_id: "manage_animation_timeline",
      branch: { field: "operation", value: "graph" },
    });

    expect(
      searchCapabilityCatalog(catalog, "set animation length fps and loop", 4)[0]
    ).toMatchObject({
      capability_id: "manage_animation_timeline",
      branch: { field: "operation", value: "properties" },
    });

    expect(
      searchCapabilityCatalog(catalog, "copy and mirror keyframes", 4)[0]
    ).toMatchObject({
      capability_id: "manage_animation_timeline",
      branch: { field: "operation", value: "copy_paste" },
    });
  });
});
