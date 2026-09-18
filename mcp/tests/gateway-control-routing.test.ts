import { describe, expect, test } from "bun:test";
import {
  buildControlPacket,
  decorateCapabilities,
  sourceOwnerForCapability,
} from "@/gateway/control";
import type { GatewayRuntimeStatus } from "@/gateway/backend";

const status: GatewayRuntimeStatus = {
  gateway: "ready",
  affinity: { project_uuid: "project-a", authoring_phase: "geometry" },
  runtime: {
    online: true, endpoint: "http://127.0.0.1:3000/bb-mcp", mcp_client_ready: true,
    catalog_stale: false, runtime_signature: "runtime-a", connected_signature: "runtime-a", catalog_count: 47,
    health: { build_identity: "sha256:build-a", product: { authoring_phase: "geometry" }, project_context: { active_project_uuid: "project-a", requested_project_uuid: "project-a", requested_project_available: true, open_project_count: 1 } },
  },
  connection: {
    state: "ready", generation: 1, reconnect_count: 0, catalog_refresh_count: 1,
    last_ready_at: "2026-09-12T00:00:00.000Z", last_transition_at: "2026-09-12T00:00:00.000Z",
    reconnect: { failures: 0, retry_after_ms: 0 },
  },
  operations: { active: 0, queued: 0, max_queue_depth: 8, completed: 0, failed: 0, timed_out: 0, rejected_busy: 0 },
  last_error: null,
};

describe("LazyDesigner Control routing", () => {
  test("known capabilities expose deterministic source, specialist and test owners", async () => {
    expect(sourceOwnerForCapability("manage_cubes")).toEqual({
      source: "mcp/server/tools/cubes.ts",
      specialist: ".agents/skills/lazydesigner-modelling/SKILL.md",
      test_owner: "mcp/tests/model-effectiveness-correction-accuracy.test.ts",
    });
    expect(sourceOwnerForCapability("manage_locator").source).toBe("mcp/server/tools/locators.ts");
    expect(sourceOwnerForCapability("manage_null_object").source).toBe("mcp/server/tools/locators.ts");
    expect(sourceOwnerForCapability("activate_texture").source).toBe("mcp/server/tools/texture-assignment.ts");
    expect(sourceOwnerForCapability("paint_fill_tool").source).toBe("mcp/server/tools/paint-primitives.ts");
    expect(sourceOwnerForCapability("draw_shape_tool").source).toBe("mcp/server/tools/paint-primitives.ts");
    expect(sourceOwnerForCapability("paint_with_brush").source).toBe("mcp/server/tools/paint-brush.ts");
    expect(sourceOwnerForCapability("eraser_tool").source).toBe("mcp/server/tools/paint-brush.ts");
    expect(sourceOwnerForCapability("manage_render_profile")).toEqual({
      source: "mcp/server/tools/render-profile.ts",
      specialist: ".agents/skills/lazydesigner-texturing/SKILL.md",
      test_owner: "mcp/tests/render-profile-binding.test.ts",
    });
    expect(sourceOwnerForCapability("manage_animation_controller").source).toBe("mcp/server/tools/animation-controller.ts");

    for (const capability of [
      "manage_cubes",
      "manage_locator",
      "manage_null_object",
      "activate_texture",
      "paint_fill_tool",
      "draw_shape_tool",
      "paint_with_brush",
      "eraser_tool",
      "manage_render_profile",
      "manage_animation_controller",
      "switch_authoring_phase",
    ]) {
      const owner = sourceOwnerForCapability(capability);
      expect(await Bun.file(new URL(`../../${owner.source}`, import.meta.url)).exists(), owner.source).toBe(true);
      if (owner.specialist) expect(await Bun.file(new URL(`../../${owner.specialist}`, import.meta.url)).exists(), owner.specialist).toBe(true);
      if (owner.test_owner) expect(await Bun.file(new URL(`../../${owner.test_owner}`, import.meta.url)).exists(), owner.test_owner).toBe(true);
    }
  });

  test("capability search projection carries source ownership without schema duplication", () => {
    const [result] = decorateCapabilities([
      { capability_id: "manage_cubes", description: "Create or update Bedrock cubes.", tier: "primary", read_only: false, destructive: true, idempotent: false },
    ], "GEOMETRY");
    expect(result.control.source_owner.source).toBe("mcp/server/tools/cubes.ts");
    expect(result.control.source_owner.specialist).toContain("lazydesigner-modelling");
    expect(result).not.toHaveProperty("inputSchema");
  });

  test("stale hashes from a still-required context family are explicitly invalidated", async () => {
    const packet = await buildControlPacket(status, { knownContextIds: ["ctx:skill/modelling@deadbeef0000"] });
    expect(packet.context.invalidated_ids).toEqual(["ctx:skill/modelling@deadbeef0000"]);
    expect(packet.context.required.some((entry) => entry.id.startsWith("ctx:skill/modelling@"))).toBe(true);
    expect(packet.context.required.some((entry) => entry.path.includes("blockit-bedrock-entity-mcp"))).toBe(false);
  });

  test("unrelated historical context does not create false invalidation noise", async () => {
    const packet = await buildControlPacket(status, { knownContextIds: ["ctx:skill/unrelated@deadbeef0000"] });
    expect(packet.context.invalidated_ids).toEqual([]);
  });
});
