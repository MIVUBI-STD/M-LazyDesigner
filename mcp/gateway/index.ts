import { serveStdio, type StdioServerHandle } from "@modelcontextprotocol/server/stdio";
import { McpServer } from "@modelcontextprotocol/server";
import { BlockitRuntimeBackend } from "./backend";
import {
  GATEWAY_NAME,
  GATEWAY_VERSION,
  type JsonRecord,
} from "./protocol";
import {
  compactGatewayCapabilityStructuredContent,
  compactGatewayCapabilityContent,
  shouldAttachGatewayControlDelta,
} from "./resultCompaction";
import {
  buildControlDelta,
  projectControlDeltaForGateway,
  reduceControlExecutionState,
} from "./control";
import { LocalCapabilityRegistry } from "./providers/registry";
import {
  capabilityNeedsPhaseSnapshot,
  deriveControlReceipt,
} from "./control/receipt";
import {
  applyCapabilityGraphOutcome,
  capabilityBranchFromArguments,
  evaluateCapabilityPreconditions,
} from "./capabilities/graph";
import { resolveGatewaySurfaceProfile } from "./experimental/hybridProfile";
import { registerExperimentalHybrid4 } from "./experimental/hybridRegistration";
import { registerCoreGatewayTools } from "./handlers/registerCoreTools";
import { GatewaySessionState } from "./session/state";
import {
  gatewayErrorResult,
  traceMetaFromContext,
  type GatewayToolContext,
} from "./runtime/gatewayErrors";

const session = new GatewaySessionState();

const backend = new BlockitRuntimeBackend(undefined, undefined, {
  onRuntimeGenerationChange: () => session.onRuntimeGenerationChange(),
});
const localCapabilities = new LocalCapabilityRegistry();

// Runtime resources and prompts are not proxied. Stable-four remains the
// production default; Hybrid-4 is an explicit experimental startup profile.
const GATEWAY_INSTRUCTIONS =
  "LazyDesigner Gateway. Call status only when orientation is unknown or stale; reuse Control/context handles. Asset work: pass reference_package_path when available; Control supplies active-stage context and one Geometry profile. Source work: use task_mode=SYSTEM_DEVELOPMENT with concrete task_intent. Known capability: invoke directly. Unknown/stale capability: search; when search returns branch, pass it to describe so only that branch schema loads. Search eligibility: READY=usable, UNKNOWN=do not assume missing state, BLOCKED=resolve returned requires/predecessor before invoke. Real schema uncertainty: describe. After invoke, obey control_delta: receipt_only=no confirmation read; focused_read=inspect only if returned state is insufficient; visual=refresh only decision-changing visual evidence. Geometry/Texturing share AUTHORING; Animation is the Runtime handoff. Never auto-retry an interrupted mutation.";

function buildGatewayServer(): McpServer {
  const surfaceProfile = resolveGatewaySurfaceProfile(
    process.env.LAZYDESIGNER_GATEWAY_SURFACE_PROFILE
  );
  let registeredExperimentalTools: string[] = [];
  const server = new McpServer(
    {
      name: GATEWAY_NAME,
      version: GATEWAY_VERSION,
    },
    {
      instructions: GATEWAY_INSTRUCTIONS,
    }
  );

  registerCoreGatewayTools({
    server,
    backend,
    localCapabilities,
    session,
    surfaceProfile,
    experimentalTools: () => registeredExperimentalTools,
    invoke: (capability, args, context) =>
      invokeGatewayCapability(capability, args, context),
  });

  registeredExperimentalTools = registerExperimentalHybrid4({
    server,
    profile: surfaceProfile,
    invoke: (capability, args, context) =>
      invokeGatewayCapability(
        capability,
        args,
        context as GatewayToolContext | undefined,
        true
      ),
  });
  return server;
}

function directPreconditionBlockedResult(
  capability: string,
  args: JsonRecord
): {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
  structuredContent: JsonRecord;
} | null {
  const branch = capabilityBranchFromArguments(args);
  const evaluation = evaluateCapabilityPreconditions(
    capability,
    branch,
    session.facts
  );
  if (evaluation.eligibility !== "BLOCKED") return null;

  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: `CAPABILITY_PRECONDITION_BLOCKED: ${capability} requires ${evaluation.missing.join(", ")}.`,
      },
    ],
    structuredContent: {
      code: "CAPABILITY_PRECONDITION_BLOCKED",
      capability,
      eligibility: evaluation.eligibility,
      requires: evaluation.missing,
      ...(evaluation.predecessor
        ? { predecessor: evaluation.predecessor }
        : {}),
      recovery: {
        category: "CAPABILITY",
        safe_to_retry: false,
        state_uncertain: false,
        requires_status_refresh: false,
        requires_user_action: false,
        action: evaluation.predecessor
          ? `resolve predecessor ${evaluation.predecessor.capability} before direct invoke`
          : "satisfy the returned capability prerequisites before retrying",
      },
    },
  };
}

async function invokeGatewayCapability(
  capability: string,
  args: JsonRecord,
  context?: GatewayToolContext,
  enforceKnownBlockers: boolean = false
): Promise<unknown> {
  try {
    if (enforceKnownBlockers) {
      const blocked = directPreconditionBlockedResult(capability, args);
      if (blocked) return blocked;
    }

    const traceMeta = traceMetaFromContext(context);
    const phaseBefore = capabilityNeedsPhaseSnapshot(capability)
      ? (await backend.getStatus()).affinity.authoring_phase
      : null;
    const localResult = await localCapabilities.invoke(capability, args);
    const runtimeInvocation = localResult
      ? null
      : await backend.invokeCapabilityWithMetadata(capability, args, traceMeta);
    const result = localResult ?? runtimeInvocation!.result;
    const readOnly =
      localResult !== null
        ? localCapabilities.readOnlyHint(capability) === true
        : runtimeInvocation!.readOnly;
    const succeeded = result.isError !== true;
    const receipt = deriveControlReceipt(
      capability,
      result.structuredContent,
      succeeded,
      phaseBefore
    );
    if (
      receipt.projectUuid !== null &&
      receipt.projectUuid !== session.projectUuid
    ) {
      session.synchronizeProject(receipt.projectUuid);
    }
    session.replaceFacts(applyCapabilityGraphOutcome(
      session.facts,
      capability,
      args,
      succeeded
    ));
    const controlDelta = buildControlDelta({
      capability,
      phaseBefore: receipt.phaseBefore,
      phaseAfter: receipt.phaseAfter,
      projectUuid: receipt.projectUuid,
      succeeded,
      result: result.structuredContent,
    });
    const attachControlDelta = shouldAttachGatewayControlDelta(
      succeeded,
      readOnly
    );
    const orchestration = attachControlDelta
      ? reduceControlExecutionState(session.controlExecutionState, controlDelta)
      : null;
    if (orchestration) session.controlExecutionState = orchestration.state;
    const gatewayControlDelta = {
      ...projectControlDeltaForGateway(controlDelta),
      ...(orchestration
        ? { continuation: orchestration.continuation }
        : {}),
    };
    if (result.structuredContent === undefined) {
      return {
        ...result,
        ...(attachControlDelta
          ? { structuredContent: { control_delta: gatewayControlDelta } }
          : {}),
      };
    }
    const compacted = compactGatewayCapabilityStructuredContent(
      capability,
      result.structuredContent,
      controlDelta.verification_class
    );
    const compactedContent = compactGatewayCapabilityContent(
      capability,
      result.structuredContent,
      result.content,
      controlDelta.verification_class,
      readOnly
    );
    return {
      ...result,
      content: compactedContent as typeof result.content,
      structuredContent:
        compacted && typeof compacted === "object" && !Array.isArray(compacted)
          ? {
              ...(compacted as JsonRecord),
              ...(attachControlDelta
                ? { control_delta: gatewayControlDelta }
                : {}),
            }
          : {
              runtime_result: compacted,
              ...(attachControlDelta
                ? { control_delta: gatewayControlDelta }
                : {}),
            },
    };
  } catch (error) {
    return gatewayErrorResult(error);
  }
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
