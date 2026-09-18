import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  authoringDomainForCapability,
  buildControlDelta,
  buildControlPacket,
  buildControlSnapshot,
  decorateCapabilities,
} from "@/gateway/control";
import type { GatewayRuntimeStatus } from "@/gateway/backend";
import { readReferencePackageProjection } from "@/gateway/control/referencePackage";
import { readWorkspaceProjection } from "@/gateway/control/workspace";

const onlineStatus: GatewayRuntimeStatus = {
  gateway: "ready",
  affinity: { project_uuid: "project-a", authoring_phase: "geometry" },
  runtime: {
    online: true,
    endpoint: "http://127.0.0.1:3000/bb-mcp",
    mcp_client_ready: true,
    catalog_stale: false,
    runtime_signature: "runtime-a",
    connected_signature: "runtime-a",
    catalog_count: 47,
    health: {
      build_identity: "sha256:build-a",
      product: { authoring_phase: "geometry" },
      project_context: {
        active_project_uuid: "project-a",
        requested_project_uuid: "project-a",
        requested_project_available: true,
        open_project_count: 1,
      },
    },
  },
  connection: {
    state: "ready", generation: 1, reconnect_count: 0, catalog_refresh_count: 1,
    last_ready_at: "2026-09-12T00:00:00.000Z", last_transition_at: "2026-09-12T00:00:00.000Z",
    reconnect: { failures: 0, retry_after_ms: 0 },
  },
  operations: { active: 0, queued: 0, max_queue_depth: 8, completed: 2, failed: 0, timed_out: 0, rejected_busy: 0 },
  last_error: null,
};

describe("LazyDesigner Control", () => {
  test("runtime snapshot stays compact and defers file context until reference/profile is known", () => {
    const snapshot = buildControlSnapshot(onlineStatus);
    expect(snapshot.protocol).toBe("lazydesigner-control-v1");
    expect(snapshot.system).toBe("READY");
    expect(snapshot.project).toMatchObject({ affinity_uuid: "project-a", binding: "BOUND" });
    expect(snapshot.authoring).toMatchObject({ phase: "geometry", domain: "GEOMETRY" });
    expect(snapshot.runtime.build_identity).toBe("sha256:build-a");
    expect(snapshot.context.required).toEqual([]);
  });

  test("offline state fails closed in Control orientation", () => {
    const offline = buildControlSnapshot({
      ...onlineStatus,
      affinity: { project_uuid: null, authoring_phase: "geometry" },
      runtime: { ...onlineStatus.runtime, online: false, health: null, runtime_signature: null, mcp_client_ready: false },
    });
    expect(offline.system).toBe("OFFLINE");
    expect(offline.blockers).toContain("RUNTIME_OFFLINE");
  });

  test("capability authoring domains decorate search results without duplicating schemas", () => {
    expect(authoringDomainForCapability("manage_cubes")).toBe("GEOMETRY");
    expect(authoringDomainForCapability("paint_with_brush")).toBe("TEXTURING");
    expect(authoringDomainForCapability("manage_animation_timeline")).toBe("ANIMATION");
    expect(authoringDomainForCapability("get_project_info")).toBe("CORE");

    const decorated = decorateCapabilities([
      { capability_id: "manage_cubes", description: "", tier: "primary", read_only: false, destructive: true, idempotent: false },
      { capability_id: "paint_with_brush", description: "", tier: "primary", read_only: false, destructive: true, idempotent: false },
    ], "GEOMETRY");
    expect(decorated[0]?.control.authoring_domain).toBe("GEOMETRY");
    expect(decorated[0]?.control.current_domain).toBe(true);
    expect(decorated[0]?.control.eligibility).toBe("RECOMMENDED");
    expect(decorated[1]?.control.current_domain).toBe(false);
    expect(decorated[1]?.control.eligibility).toBe("FOREIGN_PHASE");
  });

  test("mutation continuation emits bounded downstream invalidation", () => {
    const delta = buildControlDelta({ capability: "manage_cubes", phaseBefore: "geometry", phaseAfter: "geometry", projectUuid: "project-a", succeeded: true });
    expect(delta.protocol).toBe("lazydesigner-control-v1");
    expect(delta.authoring_domain).toBe("GEOMETRY");
    expect(delta.invalidates.authoring_domains).toEqual(["GEOMETRY", "TEXTURING", "ANIMATION"]);
    expect(delta.requires_status_refresh).toBe(false);
    expect(delta.changed).toEqual([]);
    expect(delta.next_intent).toBe("VERIFY_OR_CONTINUE_GEOMETRY");
    expect(delta.verification_class).toBe("visual");

    const handoff = buildControlDelta({ capability: "switch_authoring_phase", phaseBefore: "texturing", phaseAfter: "animation", projectUuid: "project-a", succeeded: true });
    expect(handoff.requires_status_refresh).toBe(true);
    expect(handoff.changed).toContain("authoring_phase");
    expect(handoff.verification_class).toBe("receipt_only");

    const focused = buildControlDelta({
      capability: "modify_group",
      phaseBefore: "geometry",
      phaseAfter: "geometry",
      projectUuid: "project-a",
      succeeded: true,
    });
    expect(focused.verification_class).toBe("focused_read");
  });

  test("resolved context handles are content-addressed from current canonical files", async () => {
    const packet = await buildControlPacket(onlineStatus);
    expect(packet.context.required.length).toBe(1);
    expect(packet.context.required[0]?.path).toBe(".agents/skills/lazydesigner-modelling/SKILL.md");
    for (const handle of packet.context.required) {
      const bytes = await readFile(new URL(`../../${handle.path}`, import.meta.url));
      const digest = createHash("sha256").update(bytes).digest("hex");
      expect(digest, handle.path).toBe(handle.sha256);
      expect(handle.id).toContain(handle.sha256.slice(0, 12));
    }
  });

  test("Reference Package projects Geometry context and exactly one selected profile", async () => {
    const { mkdtemp, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const directory = await mkdtemp(join(tmpdir(), "lazydesigner-reference-"));
    await writeFile(join(directory, "REFERENCE.json"), JSON.stringify({
      schema: "lazydesigner-reference-v1",
      asset: { name: "farmer_npc", profile: "HUMANOID", task: "NEW_ASSET", intent: "Farmer NPC harvesting cinnamon" },
      requirements: { dimensions_blocks: { width: null, height: null, length: null }, player_relative_scale: "PLAYER_HEIGHT", animation_required: true },
      documents: { geometry: "GEOMETRY.md" },
      images: [{ id: "IMG_GEO_01", file: "images/01-main-reference.png", role: "PRIMARY_GEOMETRY", used_by: ["GEOMETRY"], status: "APPROVED" }],
      unknowns: { blocking: [], non_blocking: ["underside color"] },
      readiness: { overall: "READY", geometry: "READY", texture: "NEEDS_REVIEW", animation: "READY" },
    }));

    const packet = await buildControlPacket(onlineStatus, {
      referencePackagePath: directory,
      currentUserDelta: "preserve basket and adjust tool grip",
    });
    expect(packet.reference).toMatchObject({ available: true, asset_name: "farmer_npc", selected_profile: "HUMANOID" });
    expect(packet.reference).not.toHaveProperty("requirements");
    expect(packet.reference).not.toHaveProperty("readiness");
    expect(packet.reference).not.toHaveProperty("documents");
    expect(packet.reference).not.toHaveProperty("images");
    expect(packet.stage_context).toMatchObject({
      context_type: "GEOMETRY_CONTEXT",
      original_user_intent: "Farmer NPC harvesting cinnamon",
      current_user_delta: "preserve basket and adjust tool grip",
      selected_profile: "HUMANOID",
      stage_readiness: "READY",
      reference_document: "GEOMETRY.md",
      reference_image_ids: ["IMG_GEO_01"],
      requirements: { player_relative_scale: "PLAYER_HEIGHT" },
    });
    expect(packet.context.required.map((entry) => entry.path)).toEqual([
      ".agents/skills/lazydesigner-modelling/SKILL.md",
      "docs/03-authoring/modelling/profiles/humanoid.md",
    ]);
  });

  test("Control file projections fail closed before reading oversized context files", async () => {
    const { mkdtemp, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const directory = await mkdtemp(join(tmpdir(), "lazydesigner-control-bounds-"));
    const oversized = "x".repeat(1024 * 1024 + 1);

    await writeFile(join(directory, "REFERENCE.json"), oversized);
    const reference = await readReferencePackageProjection(directory);
    expect(reference.available).toBe(false);
    expect(reference.unavailable_reason).toBe("REFERENCE_INVALID");

    await writeFile(join(directory, "README.md"), oversized);
    const workspace = await readWorkspaceProjection(onlineStatus, directory);
    expect(workspace.available).toBe(false);
    expect(workspace.unavailable_reason).toBe("README_UNREADABLE");
  });

  test("workspace projection keeps top-level summary while stage context owns active detail", async () => {
    const { mkdtemp, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const directory = await mkdtemp(join(tmpdir(), "lazydesigner-control-"));
    await writeFile(join(directory, "test.bbmodel"), "{}");
    await writeFile(join(directory, "README.md"), `# Test Asset\n\nCurrent Stage: TEXTURING\n\nGeometry: APPROVED\n\nUV Layout: PASS\n\nTexturing: IN_PROGRESS\n\nAnimation: NOT_STARTED\n\nCurrent next step: Complete identity pass\n\nKnown blocker(s): None\n`);

    const first = await buildControlPacket(onlineStatus, { workspacePath: directory });
    expect(first.workspace).toMatchObject({ available: true, asset: "Test Asset" });
    expect(first.workspace).not.toHaveProperty("current_stage");
    expect(first.workspace).not.toHaveProperty("gates");
    expect(first.workspace).not.toHaveProperty("next_step");
    expect(first.stage_context?.workspace).toEqual({
      asset: "Test Asset",
      current_stage: "TEXTURING",
      gates: { geometry: "APPROVED", uv_layout: "PASS", texturing: "IN_PROGRESS", animation: "NOT_STARTED" },
      next_step: "Complete identity pass",
    });
    expect(first.task_context_id).toMatch(/^task:[a-f0-9]{20}$/);
    expect(JSON.stringify(first).length).toBeLessThan(7500);

    const known = first.context.required.map((entry) => entry.id);
    const second = await buildControlPacket(onlineStatus, { knownContextIds: known });
    expect(second.task_context_id).toBe(first.task_context_id);
    expect(second.context.required).toEqual([]);
    expect(second.context.cached_ids).toEqual(known);
  });
});
