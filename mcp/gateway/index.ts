import { serveStdio, type StdioServerHandle } from "@modelcontextprotocol/server/stdio";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  BlockitRuntimeBackend,
  GatewayBackendError,
} from "./backend";
import {
  GATEWAY_NAME,
  GATEWAY_TOOLS,
  GATEWAY_VERSION,
  compactGatewayCapabilityStructuredContent,
  type JsonRecord,
} from "./contract";
import { projectCapabilityInputSchema } from "./schemaProjection";
import {
  authoringDomainForCapability,
  buildControlDelta,
  projectControlDeltaForGateway,
  buildControlPacket,
  projectControlPacketForGateway,
  CONTROL_ROUTING_POLICY,
  decorateCapabilities,
  projectCapabilitiesForSearch,
} from "./control";
import { LocalCapabilityRegistry } from "./localCapabilities";
import { recoveryForGatewayError } from "./recovery";
import { projectGatewayStatus } from "./statusProjection";
import {
  capabilityNeedsPhaseSnapshot,
  deriveControlReceipt,
} from "./controlReceipt";
import { getCapabilityMetadata } from "../lib/capabilityMetadata";

const backend = new BlockitRuntimeBackend();
const localCapabilities = new LocalCapabilityRegistry();

// Runtime resources and prompts are not proxied; the Gateway intentionally exposes only its four stable tools.
const GATEWAY_INSTRUCTIONS =
  "LazyDesigner Gateway. Call status only when orientation is unknown or stale; reuse Control/context handles. Asset work: pass reference_package_path when available; Control supplies active-stage context and one Geometry profile. Source work: use task_mode=SYSTEM_DEVELOPMENT with concrete task_intent. Known capability: invoke directly. Unknown/stale capability: search. Real schema uncertainty: describe. After invoke, obey control_delta: receipt_only=no confirmation read; focused_read=inspect only if returned state is insufficient; visual=refresh only decision-changing visual evidence. Geometry/Texturing share AUTHORING; Animation is the Runtime handoff. Never auto-retry an interrupted mutation.";

type GatewayToolDefinition = {
  title: string;
  description: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
};

type GatewayToolContext = {
  mcpReq?: {
    _meta?: Record<string, unknown>;
  };
};

type GatewayToolHandler = (
  args: JsonRecord,
  context?: GatewayToolContext
) => Promise<unknown>;

const TRACE_META_KEYS = ["traceparent", "tracestate", "baggage"] as const;

function traceMetaFromContext(context?: GatewayToolContext): JsonRecord | undefined {
  const source = context?.mcpReq?._meta;
  if (!source) return undefined;

  const traceMeta: JsonRecord = {};
  for (const key of TRACE_META_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value.length > 0 && value.length <= 8192) {
      traceMeta[key] = value;
    }
  }
  return Object.keys(traceMeta).length > 0 ? traceMeta : undefined;
}

function errorRecord(error: unknown): {
  code: string;
  message: string;
  safeToRetry: boolean;
  details: JsonRecord;
} | null {
  if (error instanceof GatewayBackendError) {
    return {
      code: error.code,
      message: error.message,
      safeToRetry: error.safeToRetry,
      details: error.details,
    };
  }

  if (!error || typeof error !== "object") return null;
  const candidate = error as Record<string, unknown>;
  if (typeof candidate.code !== "string") return null;
  const details =
    candidate.details &&
    typeof candidate.details === "object" &&
    !Array.isArray(candidate.details)
      ? candidate.details as JsonRecord
      : {};
  return {
    code: candidate.code,
    message:
      typeof candidate.message === "string"
        ? candidate.message
        : String(candidate.code),
    safeToRetry: candidate.safeToRetry === true,
    details,
  };
}

function gatewayErrorResult(error: unknown) {
  const known = errorRecord(error);
  if (known) {
    const recovery = recoveryForGatewayError(
      known.code,
      known.safeToRetry,
      known.details
    );
    return {
      isError: true,
      content: [
        { type: "text" as const, text: `${known.code}: ${known.message}` },
      ],
      structuredContent: {
        code: known.code,
        message: known.message,
        ...known.details,
        recovery,
      },
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [{ type: "text" as const, text: `GATEWAY_ERROR: ${message}` }],
    structuredContent: {
      code: "GATEWAY_ERROR",
      message,
      recovery: recoveryForGatewayError("GATEWAY_ERROR", false),
    },
  };
}

const statusInput = z.object({
  adopt_active_project: z
    .boolean()
    .default(false)
    .describe(
      "Explicitly bind the selected Blockbench project; false for normal status reads."
    ),
  known_context_ids: z
    .array(z.string().min(1).max(160))
    .max(16)
    .default([])
    .describe(
      "Already-loaded Control context IDs; current matches are omitted and stale same-family IDs invalidated."
    ),
  workspace_path: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Workspace directory or README.md path when not resolved from the bound project."
    ),
  reference_package_path: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Reference Package directory or REFERENCE.json path for active-stage projection."
    ),
  current_user_delta: z
    .string()
    .max(1000)
    .optional()
    .describe(
      "Current asset correction/change request; included in stage-context identity."
    ),
  task_mode: z
    .enum(["ASSET_AUTHORING", "SYSTEM_DEVELOPMENT"])
    .default("ASSET_AUTHORING")
    .describe(
      "ASSET_AUTHORING for asset work; SYSTEM_DEVELOPMENT for bounded source/runtime routing."
    ),
  task_intent: z
    .string()
    .max(500)
    .optional()
    .describe(
      "Concrete problem when task_mode=SYSTEM_DEVELOPMENT."
    ),
});

const searchInput = z.object({
  query: z.string().default(""),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(CONTROL_ROUTING_POLICY.search_limit),
});

const describeInput = z.object({
  capability: z.string().min(1),
  branch: z
    .object({
      field: z.string().min(1),
      value: z.string().min(1),
    })
    .strict()
    .optional()
    .describe(
      "Known consolidated branch discriminator/value for schema projection."
    ),
});

const invokeInput = z.object({
  capability: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()).default({}),
});

function buildGatewayServer(): McpServer {
  const server = new McpServer(
    {
      name: GATEWAY_NAME,
      version: GATEWAY_VERSION,
    },
    {
      instructions: GATEWAY_INSTRUCTIONS,
    }
  );
  const registerGatewayTool = server.registerTool.bind(server) as unknown as (
    name: string,
    definition: GatewayToolDefinition,
    handler: GatewayToolHandler
  ) => void;

  registerGatewayTool(
  GATEWAY_TOOLS.status,
  {
    title: "LazyDesigner Status",
    description:
      "Returns compact Gateway/Runtime health and Control orientation/context for asset or system-development work.",
    inputSchema: statusInput.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (rawArgs) => {
    try {
      const {
        adopt_active_project,
        known_context_ids,
        workspace_path,
        reference_package_path,
        current_user_delta,
        task_mode,
        task_intent,
      } = statusInput.parse(rawArgs);
      const status = adopt_active_project
        ? await backend.adoptActiveProject()
        : await backend.getStatus();
      const control = await buildControlPacket(status, {
        knownContextIds: known_context_ids,
        workspacePath: workspace_path,
        referencePackagePath: reference_package_path,
        currentUserDelta: current_user_delta,
        taskMode: task_mode,
        taskIntent: task_intent,
      });
      const gatewayControl = projectControlPacketForGateway(control);
      return {
        content: [
          {
            type: "text" as const,
            text:
              task_mode === "SYSTEM_DEVELOPMENT"
                ? `LazyDesigner Control routed development task ${control.task_context_id} to ${control.development?.domain ?? "UNRESOLVED"}.`
                : status.runtime.online
                  ? status.affinity.project_uuid
                    ? `LazyDesigner Gateway is ready; Control task ${control.task_context_id} is bound to project ${status.affinity.project_uuid}.`
                    : "LazyDesigner Gateway is ready and Runtime is online; Control has no project binding yet."
                  : "LazyDesigner Gateway is ready; the Blockbench Runtime is currently offline.",
          },
        ],
        structuredContent: {
          ...projectGatewayStatus(status),
          control: gatewayControl,
        },
      };
    } catch (error) {
      return gatewayErrorResult(error);
    }
  }
);

registerGatewayTool(
  GATEWAY_TOOLS.searchCapabilities,
  {
    title: "Search LazyDesigner Capabilities",
    description:
      "Fallback search over exposed capabilities; returns bounded domain/source ownership without a status reread.",
    inputSchema: searchInput.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (rawArgs) => {
    try {
      const { query, limit } = searchInput.parse(rawArgs);
      const runtimeCapabilities = await backend.searchCapabilities(query, limit);
      const rawCapabilities = await localCapabilities.search(
        query,
        runtimeCapabilities,
        limit
      );
      const capabilities = projectCapabilitiesForSearch(decorateCapabilities(rawCapabilities));
      return {
        content: [
          {
            type: "text" as const,
            text: `${capabilities.length} capabilities.`,
          },
        ],
        structuredContent: { count: capabilities.length, capabilities },
      };
    } catch (error) {
      return gatewayErrorResult(error);
    }
  }
);

registerGatewayTool(
  GATEWAY_TOOLS.describeCapability,
  {
    title: "Describe LazyDesigner Capability",
    description:
      "Returns one capability's exact schema, annotations, lifecycle and domain without a status reread.",
    inputSchema: describeInput.shape,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (rawArgs) => {
    try {
      const { capability, branch } = describeInput.parse(rawArgs);
      const tool =
        (await localCapabilities.describe(capability)) ??
        (await backend.describeCapability(capability));
      const projection = projectCapabilityInputSchema(
        capability,
        tool.inputSchema ?? {},
        branch
      );
      const metadata = getCapabilityMetadata(capability);
      return {
        content: [
          {
            type: "text" as const,
            text: projection.projected
              ? `Capability ${capability} branch ${branch!.field}=${branch!.value} is available on the current LazyDesigner surface.`
              : `Capability ${capability} is available on the current LazyDesigner surface.`,
          },
        ],
        structuredContent: {
          capability: {
            name: tool.name,
            description: tool.description ?? "",
            inputSchema: projection.inputSchema,
            outputSchema: tool.outputSchema ?? null,
            annotations: tool.annotations ?? {},
            lifecycle: metadata.lifecycle,
            execution_class: metadata.executionClass,
            verification_class: metadata.verificationClass,
            schema_projection: {
              projected: projection.projected,
              branch: projection.branch,
            },
            control: {
              authoring_domain: authoringDomainForCapability(capability),
            },
          },
        },
      };
    } catch (error) {
      return gatewayErrorResult(error);
    }
  }
);

registerGatewayTool(
  GATEWAY_TOOLS.invokeCapability,
  {
    title: "Invoke LazyDesigner Capability",
    description:
      "Invokes one exact capability on the bound project/phase. Mutations are serialized and never auto-retried after interruption.",
    inputSchema: invokeInput.shape,
  },
  async (rawArgs, context) => {
    try {
      const { capability, arguments: args } = invokeInput.parse(rawArgs);
      const traceMeta = traceMetaFromContext(context);
      const phaseBefore = capabilityNeedsPhaseSnapshot(capability)
        ? (await backend.getStatus()).affinity.authoring_phase
        : null;
      const localResult = await localCapabilities.invoke(capability, args);
      const result =
        localResult ?? (await backend.invokeCapability(capability, args, traceMeta));
      const succeeded = result.isError !== true;
      const receipt = deriveControlReceipt(
        capability,
        result.structuredContent,
        succeeded,
        phaseBefore
      );
      const controlDelta = buildControlDelta({
        capability,
        phaseBefore: receipt.phaseBefore,
        phaseAfter: receipt.phaseAfter,
        projectUuid: receipt.projectUuid,
        succeeded,
        result: result.structuredContent,
      });
      const gatewayControlDelta = projectControlDeltaForGateway(controlDelta);
      if (result.structuredContent === undefined) {
        return {
          ...result,
          structuredContent: { control_delta: gatewayControlDelta },
        };
      }
      const compacted = compactGatewayCapabilityStructuredContent(
        capability,
        result.structuredContent
      );
      return {
        ...result,
        structuredContent:
          compacted && typeof compacted === "object" && !Array.isArray(compacted)
            ? { ...(compacted as JsonRecord), control_delta: gatewayControlDelta }
            : { runtime_result: compacted, control_delta: gatewayControlDelta },
      };
    } catch (error) {
      return gatewayErrorResult(error);
    }
  }
);

  return server;
}

let stdioHandle: StdioServerHandle | null = null;
let shuttingDown = false;

async function shutdown(exitCode: number): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await backend.close();
    await stdioHandle?.close();
  } finally {
    process.exit(exitCode);
  }
}

async function main(): Promise<void> {
  process.on("SIGINT", () => void shutdown(0));
  process.on("SIGTERM", () => void shutdown(0));
  process.stdin.on("close", () => void shutdown(0));

  stdioHandle = serveStdio(() => buildGatewayServer(), {
    onerror: (error) => {
      console.error("[LazyDesigner Gateway] stdio:", error);
    },
  });
}

main().catch((error) => {
  console.error("[LazyDesigner Gateway] fatal:", error);
  void shutdown(1);
});
