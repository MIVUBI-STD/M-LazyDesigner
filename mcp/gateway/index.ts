import { serveStdio, type StdioServerHandle } from "@modelcontextprotocol/server/stdio";
import { McpServer } from "@modelcontextprotocol/server";
import { BlockitRuntimeBackend } from "./runtime/backend";
import {
  GATEWAY_NAME,
  GATEWAY_VERSION,
} from "./contracts/protocol";
import { LocalCapabilityRegistry } from "./providers/registry";
import { resolveGatewaySurfaceProfile } from "./experimental/hybridProfile";
import { registerExperimentalHybrid4 } from "./experimental/hybridRegistration";
import { registerCoreGatewayTools } from "./handlers/registerCoreTools";
import { GatewaySessionState } from "./session/state";
import type { GatewayToolContext } from "./runtime/gatewayErrors";
import { GatewayCapabilityExecutor } from "./runtime/capabilityExecutor";
import { BenchmarkTraceRecorder } from "./runtime/benchmarkTrace";

const session = new GatewaySessionState();

const backend = new BlockitRuntimeBackend(undefined, undefined, {
  onRuntimeGenerationChange: () => session.onRuntimeGenerationChange(),
});
const localCapabilities = new LocalCapabilityRegistry();
const benchmarkTrace = BenchmarkTraceRecorder.fromEnvironment();
const executor = new GatewayCapabilityExecutor(
  backend,
  localCapabilities,
  session,
  benchmarkTrace
);

// Runtime resources and prompts are not proxied. Stable-four remains the
// production default; Hybrid-4 is an explicit experimental startup profile.
const GATEWAY_INSTRUCTIONS =
  "LazyDesigner Gateway. Call status only when orientation is unknown or stale; reuse Control/context handles. Asset work: pass reference_package_path when available; Control supplies active-stage context and one Geometry profile. Source work: use task_mode=SYSTEM_DEVELOPMENT with concrete task_intent. Known capability: invoke directly. Unknown/stale capability: search; when search returns branch, pass it to describe so only that branch schema loads. Search eligibility: READY=usable, UNKNOWN=do not assume missing state, BLOCKED=resolve returned requires/predecessor before invoke. Real schema uncertainty: describe. For several known mutations in one user intent, reuse task_context_id with cohort_boundary=CONTINUE, then mark the final mutation COMPLETE so Control emits one merged verification action. After invoke, obey control_delta: receipt_only=no confirmation read; focused_read=inspect only if returned state is insufficient; visual=refresh only decision-changing visual evidence. Geometry/Texturing share AUTHORING; Animation is the Runtime handoff. Never auto-retry an interrupted mutation.";

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
    trace: benchmarkTrace,
    invoke: (capability, args, context, controlOptions) =>
      executor.invoke(capability, args, context, false, controlOptions),
  });

  registeredExperimentalTools = registerExperimentalHybrid4({
    server,
    profile: surfaceProfile,
    invoke: (capability, args, context) =>
      executor.invoke(
        capability,
        args,
        context as GatewayToolContext | undefined,
        true
      ),
  });
  return server;
}

let stdioHandle: StdioServerHandle | null = null;
let shuttingDown = false;

async function shutdown(exitCode: number): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await backend.close();
    await benchmarkTrace.flush();
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
