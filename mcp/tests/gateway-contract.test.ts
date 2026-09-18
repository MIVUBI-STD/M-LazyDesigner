import { describe, expect, test } from "bun:test";
import {
  GATEWAY_TOOL_NAMES,
  classifyCapabilityTier,
  classifyInterruptedCall,
  compactGatewayCapabilityStructuredContent,
  createRuntimeSignature,
  normalizeRuntimeUrl,
  searchCapabilityCatalog,
  type BackendTool,
} from "@/gateway/contract";
import {
  getCapabilityBranchFields,
  projectCapabilityInputSchema,
} from "@/gateway/schemaProjection";

describe("BlockIT Gateway contract", () => {
  test("timeline discovery retains AI-callable easing and bone visibility arguments",()=>{
    const schema={type:"object",properties:{operation:{enum:["timeline","batch"]},action:{type:"string"},easing:{type:"object"},bone_ids:{type:"array"},parameters:{type:"object"}}};
    const result=projectCapabilityInputSchema("manage_animation_timeline",schema,{field:"operation",value:"timeline"});
    const projected=result.inputSchema as typeof schema;
    expect(projected.properties).toHaveProperty("easing");
    expect(projected.properties).toHaveProperty("bone_ids");
    expect(projected.properties).not.toHaveProperty("parameters");
  });
  test("client-facing MCP surface stays deliberately small and fixed", () => {
    expect(GATEWAY_TOOL_NAMES).toEqual([
      "status",
      "search_capabilities",
      "describe_capability",
      "invoke_capability",
    ]);
  });

  test("capability discovery ranks primary authoring tools ahead of comparable support tools", () => {
    const tools: BackendTool[] = [
      {
        name: "create_texture",
        description: "Create a texture atlas for BlockIT authoring.",
      },
      {
        name: "create_brush_preset",
        description: "Create a texture brush preset.",
      },
      {
        name: "manage_geometry_reference",
        description: "Load an approved GLB as optional 3D Evidence.",
      },
      {
        name: "emulate_clicks",
        description: "Emulate Blockbench UI clicks for maintenance.",
      },
    ];

    expect(searchCapabilityCatalog(tools, "create texture", 10)[0]?.capability_id).toBe(
      "create_texture"
    );
    expect(classifyCapabilityTier(tools[0]!)).toBe("primary");
    expect(classifyCapabilityTier(tools[1]!)).toBe("support");
    expect(classifyCapabilityTier(tools[2]!)).toBe("support");
    expect(classifyCapabilityTier(tools[3]!)).toBe("maintenance");
  });

  test("fallback discovery recognizes current high-value authoring terminology without broad search", () => {
    const tools: BackendTool[] = [
      {
        name: "paint_texture_transaction",
        description: "Apply a bounded texture transaction.",
      },
      {
        name: "paint_with_brush",
        description: "Paint texture pixels with the native brush.",
      },
      {
        name: "manage_render_profile",
        description: "Manage Bedrock entity rendering bindings.",
      },
      {
        name: "manage_material",
        description: "Manage a Bedrock PBR material.",
      },
      {
        name: "manage_animation_timeline",
        description: "Manage authored animation timeline data.",
      },
      {
        name: "manage_animation_controller",
        description: "Manage animation controller state composition.",
      },
    ];

    expect(
      searchCapabilityCatalog(tools, "exact pixel paint", 4)[0]?.capability_id
    ).toBe("paint_texture_transaction");
    expect(
      searchCapabilityCatalog(tools, "alpha cutout render material", 4)[0]
        ?.capability_id
    ).toBe("manage_render_profile");
    expect(
      searchCapabilityCatalog(tools, "native animation properties molang", 4)[0]
        ?.capability_id
    ).toBe("manage_animation_timeline");
    expect(
      searchCapabilityCatalog(tools, "nested controller blend curve", 4)[0]
        ?.capability_id
    ).toBe("manage_animation_controller");

    expect(classifyCapabilityTier(tools[0]!)).toBe("primary");
    expect(classifyCapabilityTier(tools[2]!)).toBe("primary");
    expect(classifyCapabilityTier(tools[4]!)).toBe("primary");
    expect(classifyCapabilityTier(tools[5]!)).toBe("primary");
  });

  test("maintenance fallbacks stay out of empty discovery but remain explicitly discoverable", () => {
    const tools: BackendTool[] = [
      { name: "manage_cubes", description: "Create Bedrock cubes." },
      { name: "emulate_clicks", description: "Emulate Blockbench UI clicks." },
    ];

    expect(searchCapabilityCatalog(tools, "", 10).map((tool) => tool.capability_id))
      .toEqual(["manage_cubes"]);
    expect(searchCapabilityCatalog(tools, "emulate clicks", 10)[0]).toMatchObject({
      capability_id: "emulate_clicks",
      tier: "maintenance",
    });
  });

  test("3D Evidence support remains discoverable only when relevant", () => {
    const tools: BackendTool[] = [
      {
        name: "manage_geometry_reference",
        description: "Load update or remove approved local GLB 3D Evidence.",
      },
      {
        name: "manage_cubes",
        description: "Create and update Bedrock cubes.",
      },
    ];

    expect(searchCapabilityCatalog(tools, "approved GLB evidence", 10)[0]).toMatchObject({
      capability_id: "manage_geometry_reference",
      tier: "support",
    });
  });

  test("branch projection keeps only continuation-relevant consolidated Animation fields", () => {
    const inputSchema = {
      type: "object",
      properties: {
        operation: { type: "string" },
        animation_id: { type: "string" },
        action: { type: "string" },
        bone_name: { type: "string" },
        channel: { type: "string" },
        keyframes: { type: "array" },
        batch_operation: { type: "string" },
        selection: { type: "string" },
        range: { type: "object" },
        pattern: { type: "object" },
        parameters: { type: "object" },
        custom_curve: { type: "object" },
      },
      required: ["operation"],
    };

    const keyframes = projectCapabilityInputSchema(
      "manage_animation_timeline",
      inputSchema,
      { field: "operation", value: "keyframes" }
    );
    expect(keyframes.projected).toBe(true);
    expect(Object.keys((keyframes.inputSchema as any).properties).sort()).toEqual([
      "action",
      "animation_id",
      "bone_name",
      "channel",
      "keyframes",
      "operation",
    ]);
    expect((keyframes.inputSchema as any).properties.operation.const).toBe("keyframes");

    const batchFields = getCapabilityBranchFields("manage_animation_timeline", {
      field: "operation",
      value: "batch",
    });
    expect(batchFields).toContain("animation_id");
    expect(batchFields).toContain("batch_operation");
    expect(batchFields).not.toContain("keyframes");

    expect(() =>
      projectCapabilityInputSchema(
        "manage_animation_timeline",
        inputSchema,
        { field: "operation", value: "unknown" }
      )
    ).toThrow(/does not expose a describe projection/);
  });

  test("branch projection slims high-frequency authoring capability descriptions", () => {
    const allFields = [
      "mode",
      "include_cubes",
      "max_depth",
      "max_nodes",
      "name_pattern",
      "name_contains",
      "type",
      "parent_group",
      "min_size",
      "max_size",
      "selected_only",
      "limit",
      "id",
      "detail",
      "operation",
      "name",
      "material",
      "texture",
      "channel",
      "color_texture",
      "normal_texture",
      "height_texture",
      "mer_texture",
      "color_value",
      "mer_value",
      "subsurface_value",
      "cube_id",
      "faces",
      "material_name",
      "assignments",
      "all_cubes",
      "include_usages",
      "usage_limit_per_instance",
      "source_texture_id",
      "group",
      "width",
      "height",
      "data",
      "fill_color",
      "layer_name",
      "pbr_channel",
      "render_mode",
      "render_sides",
      "texture_id",
      "pixel_density",
      "rearrange_uv",
      "power_of_two",
      "keep_multi_texture_occupancy",
      "padding",
    ];
    const inputSchema = {
      type: "object",
      properties: Object.fromEntries(
        allFields.map((field) => [field, { type: "string" }])
      ),
      required: ["mode", "operation", "type"],
    };

    const detail = projectCapabilityInputSchema("inspect_elements", inputSchema, {
      field: "mode",
      value: "detail",
    });
    expect(Object.keys((detail.inputSchema as any).properties).sort()).toEqual([
      "detail",
      "id",
      "mode",
    ]);

    const assignChannel = projectCapabilityInputSchema(
      "manage_material",
      inputSchema,
      { field: "operation", value: "assign_channel" }
    );
    expect(Object.keys((assignChannel.inputSchema as any).properties).sort()).toEqual([
      "channel",
      "material",
      "operation",
      "texture",
    ]);

    const materialList = projectCapabilityInputSchema(
      "manage_material_instances",
      inputSchema,
      { field: "operation", value: "list" }
    );
    expect(Object.keys((materialList.inputSchema as any).properties).sort()).toEqual([
      "include_usages",
      "operation",
      "usage_limit_per_instance",
    ]);

    const variant = projectCapabilityInputSchema("create_texture", inputSchema, {
      field: "type",
      value: "variant",
    });
    expect(Object.keys((variant.inputSchema as any).properties).sort()).toEqual([
      "group",
      "name",
      "source_texture_id",
      "type",
    ]);

    for (const projection of [detail, assignChannel, materialList, variant]) {
      expect(
        Object.keys((projection.inputSchema as any).properties).length
      ).toBeLessThan(allFields.length / 4);
    }
  });

  test("runtime signature ignores changing health timestamps but detects surface identity changes", () => {
    const base = {
      timestamp: "2026-09-04T09:00:00Z",
      build_identity: `sha256:${"a".repeat(64)}`,
      instance_id: "runtime-a",
      startup_time: "2026-09-04T08:00:00Z",
      exposed_tool_count: 25,
      product: {
        id: "blockit-bedrock-entity-mcp",
        version: "0.1.0",
        profile: "bedrock_entity",
        authoring_phase: "geometry",
      },
    };

    expect(
      createRuntimeSignature({ ...base, timestamp: "2026-09-04T09:01:00Z" })
    ).toBe(createRuntimeSignature(base));
    expect(
      createRuntimeSignature({
        ...base,
        product: { ...base.product, authoring_phase: "texturing" },
        exposed_tool_count: 35,
      })
    ).not.toBe(createRuntimeSignature(base));
  });

  test("Gateway runtime URL is loopback-only", () => {
    expect(normalizeRuntimeUrl("http://127.0.0.1:3000/bb-mcp/"))
      .toBe("http://127.0.0.1:3000/bb-mcp");
    expect(() => normalizeRuntimeUrl("https://example.com/bb-mcp")).toThrow(
      /loopback/
    );
  });

  test("interrupted mutations are never classified as safe automatic retries", () => {
    expect(
      classifyInterruptedCall({
        name: "inspect_elements",
        annotations: { readOnlyHint: true },
      })
    ).toEqual({ code: "BACKEND_CALL_INTERRUPTED", safe_to_retry: true });

    expect(classifyInterruptedCall({ name: "manage_cubes" })).toEqual({
      code: "OUTCOME_UNKNOWN",
      safe_to_retry: false,
    });
  });

  test("Gateway compacts manage_cubes continuation receipts without dropping UV-changing state", () => {
    const geometryBatch = compactGatewayCapabilityStructuredContent(
      "manage_cubes",
      {
        modified: 1,
        effects: [
          {
            before: {
              uuid: "cube-a",
              from: [0, 0, 0],
              face_uvs: { north: [0, 0, 4, 4] },
            },
            after: {
              uuid: "cube-a",
              from: [1, 0, 0],
              box_uv_region: { logical_rect: [0, 0, 4, 4] },
              face_uvs: { north: [0, 0, 4, 4] },
            },
            geometry_effect: {
              changed_fields: ["from"],
              center_delta: [1, 0, 0],
            },
          },
        ],
      }
    );
    const geometryJson = JSON.stringify(geometryBatch);
    expect(geometryJson).not.toContain('"before"');
    expect(geometryJson).not.toContain('"face_uvs"');
    expect(geometryJson).toContain('"box_uv_region"');
    expect(geometryJson).toContain('"center_delta"');

    const uvUpdate = compactGatewayCapabilityStructuredContent(
      "manage_cubes",
      {
        before: {
          uuid: "cube-b",
          face_uvs: { north: [0, 0, 4, 4] },
        },
        after: {
          uuid: "cube-b",
          face_uvs: { north: [4, 0, 8, 4] },
        },
        geometry_effect: {
          changed_fields: ["faces"],
          faces_changed: true,
        },
      }
    );
    const uvJson = JSON.stringify(uvUpdate);
    expect(uvJson).not.toContain('"before"');
    expect(uvJson).toContain('"face_uvs"');
    expect(uvJson).toContain('"faces_changed"');

    const unrelated = { detail: { uuid: "cube-a" } };
    expect(
      compactGatewayCapabilityStructuredContent("inspect_elements", unrelated)
    ).toBe(unrelated);
  });

  test("phase handoff invalidates only backend state and explicitly keeps the client task alive", async () => {
    const backendSource = await Bun.file("gateway/backend.ts").text();

    expect(backendSource).toContain("resolveGatewayCapabilityEffects");
    expect(backendSource).toContain('application.effects.phaseAffinity === "update_from_result"');
    expect(backendSource).toContain("application.effects.invalidateCatalog || affinityChanged");
    expect(backendSource).toContain("await this.closeConnectionUnsafe()");
    expect(backendSource).toContain("gateway_catalog_invalidated: true");
    expect(backendSource).toContain("client_reconnect_required: false");
    expect(backendSource).toContain("new_chat_required: false");
    expect(backendSource).toContain("continue same task through Gateway");
  });

  test("stdio Gateway keeps discovery bounded and does not advertise unproxied Runtime surfaces", async () => {
    const packageJson = await Bun.file("package.json").json();
    const source = await Bun.file("gateway/index.ts").text();
    const backendSource = await Bun.file("gateway/backend.ts").text();

    expect(packageJson.scripts.gateway).toBe("bun run ./gateway/index.ts");
    expect(source).toContain("serveStdio(() => buildGatewayServer()");
    expect(source).toContain("function buildGatewayServer(): McpServer");
    expect(source).not.toContain("new StdioServerTransport()");
    expect(source.indexOf("const backend = new BlockitRuntimeBackend()")).toBeLessThan(
      source.indexOf("function buildGatewayServer(): McpServer")
    );
    expect(source).toContain("compactGatewayCapabilityStructuredContent");
    expect(source).toContain("projectCapabilityInputSchema");
    expect(source).toContain("inputSchema: projection.inputSchema");
    expect(source).toContain(".default(CONTROL_ROUTING_POLICY.search_limit)");
    expect(backendSource).toMatch(/searchCapabilities\(\s*query: string,\s*limit: number = 4/);
    expect(source).toContain("Runtime resources and prompts are not proxied");
    expect(source).not.toContain("structuredContent: { capability: tool }");
    expect(source).not.toContain("registerResource(");
    expect(source).not.toContain("registerPrompt(");
    expect(source).not.toContain("console.log");
    expect(backendSource).toContain("new StreamableHTTPClientTransport");
    expect(backendSource.match(/\.callTool\(/g)?.length ?? 0).toBe(1);
  });
});
