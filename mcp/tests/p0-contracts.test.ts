import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import {
  createTool,
  getEnabledToolDefinitions,
  registerToolsOnServer,
  tools,
} from "@/lib/factories";
import { registerImportTools } from "@/server/tools/import";
import { registerUITools } from "@/server/tools/ui";

interface CapturedToolDefinition {
  title?: string;
  description?: string;
  inputSchema?: unknown;
  annotations?: Record<string, unknown>;
}

type CapturedToolCallback = (
  args: unknown,
  extra: unknown
) => Promise<unknown>;

interface CapturedRegistration {
  definition: CapturedToolDefinition;
  callback: CapturedToolCallback;
}

function advertisedFields(schema: unknown): string[] {
  const json = z.toJSONSchema(schema as z.ZodType<any, any>, {
    io: "input",
    target: "draft-2020-12",
    unrepresentable: "any",
    reused: "inline",
  }) as Record<string, unknown>;
  const fields = new Set<string>();
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    const record = node as Record<string, unknown>;
    if (record.properties && typeof record.properties === "object" && !Array.isArray(record.properties)) {
      Object.keys(record.properties as Record<string, unknown>).forEach((name) => fields.add(name));
    }
    for (const key of ["anyOf", "oneOf", "allOf"] as const) {
      const variants = record[key];
      if (Array.isArray(variants)) variants.forEach(visit);
    }
  };
  visit(json);
  return [...fields].sort();
}

function createCaptureServer() {
  const registrations = new Map<string, CapturedRegistration>();

  return {
    registrations,
    server: {
      registerTool(
        name: string,
        definition: CapturedToolDefinition,
        callback: CapturedToolCallback
      ) {
        registrations.set(name, { definition, callback });
      },
    },
  };
}

async function expectRejectedBeforeExecution(
  callback: CapturedToolCallback,
  args: unknown,
  getExecutionCount: () => number
): Promise<void> {
  let rejected = false;
  try {
    await callback(args, {});
  } catch {
    rejected = true;
  }

  expect(rejected).toBe(true);
  expect(getExecutionCount()).toBe(0);
}

describe("P0 MCP contract regressions", () => {
  test("initial registration preserves top-level refine validation and annotations", async () => {
    const capture = createCaptureServer();
    const parameters = z
      .object({ value: z.number() })
      .refine(({ value }) => value > 0, {
        message: "value must be positive",
      });

    let executions = 0;
    createTool(
      "p0_refine_contract_fixture",
      {
        description: "P0 refine contract fixture",
        annotations: {
          title: "P0 Refine Fixture",
          destructiveHint: false,
          idempotentHint: true,
        },
        parameters,
        async execute({ value }) {
          executions += 1;
          return String(value);
        },
      },
      "experimental"
    );

    registerToolsOnServer(capture.server);
    const registration = capture.registrations.get("p0_refine_contract_fixture");
    expect(registration).toBeDefined();
    if (!registration) throw new Error("Fixture tool was not registered.");

    expect(registration.definition.annotations).toEqual({
      title: "P0 Refine Fixture",
      destructiveHint: false,
      idempotentHint: true,
    });

    await expectRejectedBeforeExecution(
      registration.callback,
      { value: -1 },
      () => executions
    );

    const result = await registration.callback({ value: 2 }, {});
    expect(executions).toBe(1);
    expect(result).toEqual({
      content: [{ type: "text", text: "2" }],
    });
  });

  test("reconstructed registration preserves superRefine validation and annotations", async () => {
    const initialCapture = createCaptureServer();
    const parameters = z
      .object({ start: z.number(), end: z.number() })
      .superRefine(({ start, end }, ctx) => {
        if (end <= start) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "end must be greater than start",
          });
        }
      });

    let executions = 0;
    createTool(
      "p0_super_refine_contract_fixture",
      {
        description: "P0 superRefine contract fixture",
        annotations: {
          title: "P0 SuperRefine Fixture",
          readOnlyHint: true,
        },
        parameters,
        async execute({ start, end }) {
          executions += 1;
          return `${start}:${end}`;
        },
      },
      "experimental"
    );

    const reconstructedCapture = createCaptureServer();
    registerToolsOnServer(reconstructedCapture.server);

    const registration = reconstructedCapture.registrations.get(
      "p0_super_refine_contract_fixture"
    );
    expect(registration).toBeDefined();
    if (!registration) throw new Error("Reconstructed fixture tool was not registered.");

    expect(registration.definition.annotations).toEqual({
      title: "P0 SuperRefine Fixture",
      readOnlyHint: true,
    });

    await expectRejectedBeforeExecution(
      registration.callback,
      { start: 3, end: 3 },
      () => executions
    );

    const result = await registration.callback({ start: 3, end: 4 }, {});
    expect(executions).toBe(1);
    expect(result).toEqual({
      content: [{ type: "text", text: "3:4" }],
    });
  });

  test("discriminated unions advertise their branch fields and retain full validation", async () => {
    const capture = createCaptureServer();
    const parameters = z
      .discriminatedUnion("action", [
        z.object({
          action: z.literal("create"),
          name: z.string(),
          value: z.number().optional().default(1),
        }),
        z.object({
          action: z.literal("update"),
          id: z.string(),
          value: z.number().optional(),
        }),
      ])
      .superRefine((args, ctx) => {
        if (args.action === "update" && args.value === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "update requires value",
          });
        }
      });

    let executions = 0;
    createTool("p0_discriminated_union_contract_fixture", {
      description: "P0 discriminated union contract fixture",
      parameters,
      async execute(args) {
        executions += 1;
        return args.action;
      },
    });

    registerToolsOnServer(capture.server);
    const registration = capture.registrations.get(
      "p0_discriminated_union_contract_fixture"
    );
    expect(registration).toBeDefined();
    if (!registration) throw new Error("Discriminated union fixture was not registered.");

    expect(advertisedFields(registration.definition.inputSchema)).toEqual([
      "action",
      "id",
      "name",
      "value",
    ]);

    await expectRejectedBeforeExecution(
      registration.callback,
      { action: "update", id: "fixture-id" },
      () => executions
    );

    const result = await registration.callback(
      { action: "create", name: "fixture" },
      {}
    );
    expect(executions).toBe(1);
    expect(result).toEqual({
      content: [{ type: "text", text: "create" }],
    });
  });

  test("ordinary unions with intersections advertise their fields", () => {
    const capture = createCaptureServer();
    const parameters = z.union([
      z.object({ elements: z.array(z.object({ from: z.array(z.number()), to: z.array(z.number()) })) })
        .and(z.object({ operation: z.literal("create") })),
      z.object({ id: z.string(), name: z.string().optional() })
        .and(z.object({ operation: z.literal("update") })),
    ]);
    createTool("p0_union_intersection_contract_fixture", {
      description: "Ordinary union/intersection contract fixture",
      parameters,
      async execute(args) {
        return args.operation;
      },
    });
    registerToolsOnServer(capture.server);

    const registration = capture.registrations.get("p0_union_intersection_contract_fixture");
    expect(registration).toBeDefined();
    if (!registration) throw new Error("Union/intersection fixture was not registered.");

    expect(advertisedFields(registration.definition.inputSchema))
      .toEqual(["elements", "id", "name", "operation"].sort());
  });

  test("dangerous default tools remain disabled while other UI tools register", () => {
    const capture = createCaptureServer();
    registerUITools();
    registerImportTools();
    registerToolsOnServer(capture.server);

    expect(capture.registrations.has("risky_eval")).toBe(false);
    expect(capture.registrations.has("from_geo_json")).toBe(false);
    expect(capture.registrations.has("trigger_action")).toBe(true);
    expect(capture.registrations.has("emulate_clicks")).toBe(true);
    expect(capture.registrations.has("fill_dialog")).toBe(true);

    expect(tools.risky_eval?.enabled).toBe(false);
    expect(tools.risky_eval?.status).toBe("experimental");
    expect(tools.from_geo_json?.enabled).toBe(false);

    const enabledDefinitions = getEnabledToolDefinitions();
    expect("risky_eval" in enabledDefinitions).toBe(false);
    expect("from_geo_json" in enabledDefinitions).toBe(false);
  });

  test("Origin rejection remains ahead of MCP transport dispatch", async () => {
    const netSource = await readFile(
      new URL("../server/net.ts", import.meta.url),
      "utf8"
    );

    const originGuard = netSource.indexOf(
      "if (originHeader !== undefined && !isAllowedLocalOrigin(originHeader))"
    );
    const forbiddenResponse = netSource.indexOf("403", originGuard);
    const requestConstruction = netSource.indexOf(
      "const webRequest = new Request(requestUrl, {",
      originGuard
    );
    const transportDispatch = netSource.indexOf(
      "handleStatelessMcpRequest(",
      originGuard
    );

    expect(originGuard).toBeGreaterThan(-1);
    expect(forbiddenResponse).toBeGreaterThan(originGuard);
    expect(requestConstruction).toBeGreaterThan(originGuard);
    expect(transportDispatch).toBeGreaterThan(requestConstruction);

    expect(netSource).toContain("hostname === 'localhost'");
    expect(netSource).toContain("hostname === '127.0.0.1'");
    expect(netSource).toContain("hostname === '[::1]'");
    expect(netSource).toContain("hostname === '::1'");
  });
});
