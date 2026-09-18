import { describe, expect, test } from "bun:test";
import { projectCapabilityInputSchema } from "@/gateway/schemaProjection";

// Isolate catalog/executor replacement from every other runtime test. Only the
// native executor is a spy; both SDK validation and BlockIT parameterSchema run.
const sdkBoundaryProbe = String.raw`
import assert from "node:assert/strict";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { projectCapabilityInputSchema } from "./gateway/schemaProjection.ts";
import { toolManifest } from "./build/docs-manifest.ts";
import { z } from "zod";
import { createServer } from "./server/server.ts";
import {
  getAllToolDefinitions,
  invalidateToolRegistrationRuntimeCaches,
  registerToolsOnServer,
} from "./lib/factories.ts";

const definitions = getAllToolDefinitions();
const timeline = definitions.manage_animation_timeline;
const controller = definitions.manage_animation_controller;
let executions = 0;
for (const definition of [timeline, controller]) {
  definition.execute = async (args) => {
    executions++;
    return {
      content: [{ type: "text", text: "Reached native executor boundary." }],
      structuredContent: { count: (args.keyframes ?? args.operations ?? []).length },
    };
  };
}
invalidateToolRegistrationRuntimeCaches();
const server = createServer("animation");
registerToolsOnServer(server, ["manage_animation_timeline", "manage_animation_controller", "inspect_elements", "inspect_particle", "manage_particle"]);
const client = new Client({ name: "schema-budget-boundary", version: "1.0.0" });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
try {
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const listed = (await client.listTools()).tools;
  const schemaFor = (name) => listed.find((tool) => tool.name === name).inputSchema;
  const project = (name, field, value) => projectCapabilityInputSchema(name, schemaFor(name), { field, value }).inputSchema;
  const detail = project("inspect_elements", "mode", "detail");
  assert.ok(detail.required.includes("id"));
  assert.ok(detail.required.includes("mode"));
  assert.equal(detail.properties.id.type, "string");
  const keyframeBranch = project("manage_animation_timeline", "operation", "keyframes");
  assert.ok(keyframeBranch.properties.keyframes.items.properties.time);
  assert.ok(keyframeBranch.properties.keyframes.items.properties.values);
  const batch = project("manage_animation_timeline", "operation", "batch");
  assert.ok(batch.required.includes("batch_operation"));
  assert.ok(batch.properties.batch_operation.enum.includes("offset"));
  const resource = project("manage_animation_controller", "resource_kind", "client_entity");
  assert.ok(resource.required.includes("resource_source"));
  assert.ok(resource.required.includes("resource_operations"));
  assert.ok(resource.properties.resource_operations.items.anyOf.length > 1);
  for (const name of ["manage_animation_timeline", "manage_animation_controller", "inspect_elements", "inspect_particle", "manage_particle"]) {
    const spec = toolManifest.flatMap((group) => group.tools).find((tool) => tool.name === name);
    const expected = z.toJSONSchema(spec.parameters, {
      io: "input",
      target: "draft-2020-12",
      unrepresentable: "any",
      reused: "inline",
    });
    const { ["~standard"]: _standard, ...expectedWire } = expected;
    assert.deepEqual(schemaFor(name), { ...expectedWire, type: "object" });
  }
  const keyframes = Array.from({ length: 33 }, (_, i) => ({ time: i / 20, values: [i, 0, 0] }));
  const request = {
    operation: "keyframes", animation_id: "animation.audit", action: "create",
    bone_name: "root", channel: "rotation", keyframes,
  };
  assert.equal(timeline.parameterSchema.safeParse(request).success, true);
  const accepted = await client.callTool({ name: "manage_animation_timeline", arguments: request });
  assert.notEqual(accepted.isError, true, JSON.stringify(accepted));
  assert.equal(accepted.structuredContent.count, 33);
  assert.equal(executions, 1);

  for (const invalid of [
    { ...request, keyframes: [] },
    { ...request, keyframes: [{ time: -1, values: [0, 0, 0] }] },
    { ...request, keyframes: [{ time: 0, values: [0, 0] }] },
    { ...request, action: "edit", keyframes: [{ time: 0 }] },
  ]) {
    assert.equal(timeline.parameterSchema.safeParse(invalid).success, false);
    const rejected = await client.callTool({ name: "manage_animation_timeline", arguments: invalid });
    assert.equal(rejected.isError, true, JSON.stringify(rejected));
    assert.equal(executions, 1, "Invalid input reached the native executor.");
  }

  const operations = Array.from({ length: 33 }, (_, i) => ({ op: "add_state", name: "state_" + i }));
  const oversizedController = { create_name: "audit", operations };
  assert.equal(controller.parameterSchema.safeParse(oversizedController).success, false);
  const blocked = await client.callTool({ name: "manage_animation_controller", arguments: oversizedController });
  assert.equal(blocked.isError, true, JSON.stringify(blocked));
  assert.equal(executions, 1, "The canonical controller limit was bypassed.");

  const validController = { ...oversizedController, operations: operations.slice(0, 32) };
  assert.equal(controller.parameterSchema.safeParse(validController).success, true);
  const created = await client.callTool({ name: "manage_animation_controller", arguments: validController });
  assert.notEqual(created.isError, true, JSON.stringify(created));
  assert.equal(created.structuredContent.count, 32);
  assert.equal(executions, 2);
  console.log("SDK_BOUNDARY_PASS: keyframes=33; controller_limit=32; invalid_native_calls=0");
} finally {
  await client.close();
  await server.close();
}
`;

describe("schema budget is not an authoring limit", () => {
  test("the actual SDK accepts canonical keyframes and retains strict controller limits", () => {
    const result = Bun.spawnSync({
      cmd: [process.execPath, "--eval", sdkBoundaryProbe],
      stdout: "pipe",
      stderr: "pipe",
      timeout: 15_000,
    });
    const output = result.stdout.toString();
    expect(result.exitCode, result.stderr.toString() || output).toBe(0);
    expect(output).toContain("SDK_BOUNDARY_PASS");
  }, 20_000);

  test("documented handoff readiness matches the canonical tool schema", async () => {
    const { phaseControlToolDocs } = await import("@/server/tools");
    const skill = await Bun.file("../.agents/skills/lazydesigner-texturing/SKILL.md").text();
    const example = skill.match(/```json\r?\n([\s\S]*?)\r?\n```/);
    expect(example).not.toBeNull();
    const readiness = JSON.parse(example![1]!);
    const handoff = {
      target_phase: "animation", reason: "Approved authoring is ready",
      resume_from: "Create the requested clip", readiness,
    };
    expect(phaseControlToolDocs.parameters.safeParse(handoff).success).toBe(true);
    expect(phaseControlToolDocs.parameters.safeParse({ ...handoff, readiness: "ready" }).success).toBe(false);
  });

  test("projection refuses incomplete or stale schemas instead of claiming a usable branch", () => {
    const branch = { field: "mode", value: "detail" };
    for (const schema of [
      {},
      { type: "object", properties: {} },
      { type: "object", properties: { mode: { const: "outline" } } },
      { type: "object", properties: { mode: { enum: ["outline", "search"] } } },
    ]) {
      expect(() => projectCapabilityInputSchema("inspect_elements", schema, branch)).toThrow();
    }
  });

  test("projection checks explicit union discriminators without fabricating a branch", () => {
    const branch = { field: "mode", value: "detail" };
    for (const union of ["anyOf", "oneOf"]) {
      const schema = (values: string[]) => ({
        type: "object",
        properties: { mode: { [union]: values.map((value) => ({ const: value })) } },
      });
      expect(() => projectCapabilityInputSchema(
        "inspect_elements", schema(["outline", "search"]), branch
      )).toThrow();
      expect(projectCapabilityInputSchema(
        "inspect_elements", schema(["outline", "detail"]), branch
      ).projected).toBe(true);
    }
  });

  test("projection preserves nested entry structure and existing required fields without mutation", () => {
    const schema = {
      type: "object",
      properties: {
        mode: { enum: ["outline", "search", "detail"] },
        id: { type: "string", minLength: 1 },
        detail: { enum: ["geometry", "uv"] },
        max_nodes: { type: "number" },
      },
      required: ["id"],
    };
    const snapshot = JSON.stringify(schema);
    const result = projectCapabilityInputSchema("inspect_elements", schema, {
      field: "mode", value: "detail",
    });
    expect(result.projected).toBe(true);
    const projected = result.inputSchema as typeof schema;
    expect(projected.required).toEqual(["id", "mode"]);
    expect(projected.properties.id).toEqual(schema.properties.id);
    expect(projected.properties.detail).toEqual(schema.properties.detail);
    expect(Object.keys(projected.properties).sort()).toEqual(["detail", "id", "mode"]);
    expect(JSON.stringify(schema)).toBe(snapshot);
  });
});
