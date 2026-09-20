/// <reference types="three" />
/// <reference types="blockbench-types" />
import { VERSION } from "@/lib/constants";
import { PRODUCT_ABOUT } from "@/lib/productIdentity";
import {
  applyMcpToolSurface,
  getActiveMcpRegistrationProfile,
  registerMcpProfile,
  setMcpPhaseSwitchHandler,
} from "@/server/tools";
import {
  MCP_AUTHORING_PHASE_SETTING_ID,
  resolveMcpAuthoringPhase,
  type McpAuthoringPhase,
} from "@/lib/authoringPhase";
import {
  claimRuntimeGeneration,
  isRuntimeGenerationCurrent,
  markRuntimeGenerationState,
  type RuntimeGenerationClaim,
} from "@/lib/runtimeLifecycle";
import {
  BLOCKBENCH_MIN_VERSION,
  evaluateBlockbenchCompatibility,
} from "@/lib/blockbenchCompatibility";
import { getIcon } from "@/macros/getIcon" with { type: "macro" };
import { normalizeRuntimeEndpoint } from "@/lib/runtimeConnection";
import {
  setupLocalDevAutoReload,
  stopLocalDevAutoReload,
} from "@/plugin/devSync";
import { RuntimeHost } from "@/plugin/runtimeHost";
import { BlockbenchIntegration } from "@/plugin/blockbenchIntegration";

const runtimeHost = new RuntimeHost();
const blockbenchIntegration = new BlockbenchIntegration();
let runtimeGeneration: number | null = null;
let initializationInProgress: Promise<void> | null = null;

function currentBuildIdentity(): string | null {
  return (
    (
      globalThis as typeof globalThis & {
        __BLOCKIT_BUILD_ID__?: unknown;
      }
    ).__BLOCKIT_BUILD_ID__ as string | undefined
  ) ?? null;
}

function beginBlockItRuntimeTeardown(
  generation: number | null = runtimeGeneration
): void {
  if (generation !== null && runtimeGeneration === generation) {
    runtimeGeneration = null;
  }
  initializationInProgress = null;

  // Blockbench does not await plugin onunload(). Detach integration callbacks
  // synchronously, then let RuntimeHost + the lifecycle coordinator drain native
  // work and listener shutdown before a new generation binds.
  stopLocalDevAutoReload();
  setMcpPhaseSwitchHandler(() => undefined);
  blockbenchIntegration.teardown();
  runtimeHost.teardown(generation);
}

async function initializeBlockItRuntime(
  claim: RuntimeGenerationClaim
): Promise<void> {
  const { generation, priorTeardown } = claim;
  await priorTeardown;
  if (!isRuntimeGenerationCurrent(generation)) return;
  if (!runtimeHost.acquireNativeNetwork(generation)) return;

  const registrationProfile = blockbenchIntegration.setupBase({
    generation,
    isGenerationCurrent: isRuntimeGenerationCurrent,
  });
  registerMcpProfile(registrationProfile);

  const rawPort = Number(Settings.get("mcp_port") || 3000);
  if (!Number.isInteger(rawPort) || rawPort < 1 || rawPort > 65535) {
    markRuntimeGenerationState(generation, "failed");
    console.error(
      `[MCP] Invalid mcp_port value "${Settings.get("mcp_port")}" - server will not start. Set a port between 1 and 65535 in plugin settings.`
    );
    Blockbench.showQuickMessage(
      "LazyDesigner couldn't start. Check its connection settings.",
      4000
    );
    return;
  }

  let authoringPhase: McpAuthoringPhase;
  try {
    authoringPhase = resolveMcpAuthoringPhase(
      Settings.get(MCP_AUTHORING_PHASE_SETTING_ID)
    );
  } catch (error) {
    markRuntimeGenerationState(generation, "failed");
    console.error("[MCP] Invalid authoring phase setting - server will not start", error);
    Blockbench.showQuickMessage(
      "LazyDesigner couldn't start. Check its startup settings.",
      4000
    );
    return;
  }

  applyMcpToolSurface(registrationProfile, authoringPhase);
  setMcpPhaseSwitchHandler((targetPhase) => {
    if (!isRuntimeGenerationCurrent(generation)) return;
    const activeProfile = getActiveMcpRegistrationProfile();
    applyMcpToolSurface(activeProfile, targetPhase);
  });

  if (!(await blockbenchIntegration.loadPrompts())) return;

  let runtimeEndpoint: string;
  try {
    runtimeEndpoint = normalizeRuntimeEndpoint(Settings.get("mcp_endpoint"));
  } catch (error) {
    markRuntimeGenerationState(generation, "failed");
    console.error("[MCP] Invalid mcp_endpoint value - server will not start", error);
    Blockbench.showQuickMessage(
      "LazyDesigner couldn't start. Check its connection settings.",
      4000
    );
    return;
  }

  runtimeHost.setConfig({
    port: rawPort,
    endpoint: runtimeEndpoint,
  });

  if (!(await runtimeHost.start(generation))) return;
  if (!isRuntimeGenerationCurrent(generation)) return;

  blockbenchIntegration.setupUi(registrationProfile, authoringPhase);
  setupLocalDevAutoReload(generation, currentBuildIdentity());
}

BBPlugin.register("blockit_mcp", {
  version: VERSION,
  title: "LazyDesigner",
  author: "Anonymous",
  description: PRODUCT_ABOUT,
  about: PRODUCT_ABOUT,
  tags: ["MCP", "AI"],
  repository: "",
  bug_tracker: "",
  icon: getIcon(),
  variant: "desktop",
  min_version: BLOCKBENCH_MIN_VERSION,

  onload() {
    if (
      initializationInProgress ||
      (runtimeGeneration !== null &&
        isRuntimeGenerationCurrent(runtimeGeneration))
    ) {
      console.error(
        "[MCP] Plugin onload called while this generation is already active."
      );
      return;
    }

    const compatibility = evaluateBlockbenchCompatibility(Blockbench.version);
    if (
      compatibility.status === "unsupported" ||
      compatibility.status === "invalid"
    ) {
      console.error("[MCP] Blockbench compatibility gate blocked startup", compatibility);
      Blockbench.showQuickMessage(
        `LazyDesigner requires Blockbench ${compatibility.minimumVersion} or newer.`,
        6000
      );
      return;
    }

    if (compatibility.status === "review-required") {
      console.warn("[MCP] Blockbench version requires compatibility review", compatibility);
      Blockbench.showQuickMessage(
        `Blockbench ${compatibility.version} has not been compatibility-validated for LazyDesigner yet.`,
        6000
      );
    } else if (compatibility.status === "compatible-unverified") {
      console.info("[MCP] Blockbench version is allowed but not exact-live-validated", compatibility);
    }

    const claim = claimRuntimeGeneration(currentBuildIdentity());
    runtimeGeneration = claim.generation;
    const initialization = initializeBlockItRuntime(claim);
    initializationInProgress = initialization;
    void initialization
      .catch((error) => {
        if (!isRuntimeGenerationCurrent(claim.generation)) return;
        markRuntimeGenerationState(claim.generation, "failed");
        console.error("[MCP] LazyDesigner runtime initialization failed", error);
        Blockbench.showQuickMessage(
          "LazyDesigner couldn't start. Technical details are available in the console.",
          5000
        );
      })
      .finally(() => {
        if (initializationInProgress === initialization) {
          initializationInProgress = null;
        }
      });
  },

  onunload() {
    beginBlockItRuntimeTeardown();
  },

  oninstall() {
    Blockbench.showQuickMessage("LazyDesigner installed", 2000);
  },

  onuninstall() {
    Blockbench.showQuickMessage("LazyDesigner removed", 2000);
    blockbenchIntegration.teardown();
  },
});
