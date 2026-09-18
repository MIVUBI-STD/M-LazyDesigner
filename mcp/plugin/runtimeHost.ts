import type { McpAuthoringPhase } from "@/lib/authoringPhase";
import type { McpRegistrationProfile } from "@/lib/registrationProfile";
import {
  beginRuntimeGenerationTeardown,
  isRuntimeGenerationCurrent,
  markRuntimeGenerationState,
} from "@/lib/runtimeLifecycle";
import type { NetServer } from "@/server/net";
import createNetServer from "@/server/net";
import { setStatusBarState } from "@/ui/statusBar";

const SERVER_BIND_TIMEOUT_MS = 3_000;

export type RuntimeHostConfig = {
  port: number;
  endpoint: string;
  profile: McpRegistrationProfile;
  phase: McpAuthoringPhase;
};

export class RuntimeHost {
  private httpServer: NetServer | null = null;
  private nativeHttp: Parameters<typeof createNetServer>[0] | null = null;
  private config: RuntimeHostConfig | null = null;

  acquireNativeNetwork(generation: number): boolean {
    if (!isRuntimeGenerationCurrent(generation)) return false;

    // @ts-ignore - requireNativeModule is a Blockbench desktop global.
    const http = requireNativeModule("http", {
      message: "Network access is required for the MCP server to accept connections.",
      detail:
        "The MCP plugin needs to create a local server that AI assistants can connect to.",
      optional: false,
    }) as Parameters<typeof createNetServer>[0] | null;

    if (!http) {
      markRuntimeGenerationState(generation, "failed");
      console.error("[MCP] Failed to get net module - server will not start");
      Blockbench.showQuickMessage("MCP Server requires network permission", 3000);
      return false;
    }

    this.nativeHttp = http;
    return true;
  }

  setConfig(config: RuntimeHostConfig): void {
    this.config = { ...config };
  }

  updateProfile(profile: McpRegistrationProfile): void {
    if (this.config) this.config.profile = profile;
  }

  updatePhase(phase: McpAuthoringPhase): void {
    if (this.config) this.config.phase = phase;
  }

  updateSurface(profile: McpRegistrationProfile, phase: McpAuthoringPhase): void {
    if (!this.config) return;
    this.config.profile = profile;
    this.config.phase = phase;
  }

  private async waitForListening(server: NetServer): Promise<void> {
    if (server.listening) return;

    await new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const cleanup = () => {
        server.off("listening", onListening);
        server.off("error", onError);
        server.off("close", onClose);
        if (timer) clearTimeout(timer);
        timer = null;
      };
      const onListening = () => {
        cleanup();
        resolve();
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const onClose = () => {
        cleanup();
        reject(new Error("LazyDesigner MCP listener closed before binding completed."));
      };

      server.once("listening", onListening);
      server.once("error", onError);
      server.once("close", onClose);
      timer = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            `LazyDesigner MCP listener did not bind within ${SERVER_BIND_TIMEOUT_MS}ms.`
          )
        );
      }, SERVER_BIND_TIMEOUT_MS);
    });
  }

  async start(generation: number): Promise<boolean> {
    if (
      !isRuntimeGenerationCurrent(generation) ||
      !this.nativeHttp ||
      !this.config ||
      this.httpServer
    ) {
      return false;
    }

    const config = { ...this.config };
    setStatusBarState("starting", `binding ${config.port}`);
    const candidate = createNetServer(this.nativeHttp, { ...config, generation });
    this.httpServer = candidate;

    try {
      await this.waitForListening(candidate);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      candidate.closeActiveSockets();
      await candidate.closeAndWait();
      if (this.httpServer === candidate) this.httpServer = null;
      if (isRuntimeGenerationCurrent(generation)) {
        markRuntimeGenerationState(generation, "failed");
        setStatusBarState("failed", reason);
        Blockbench.showQuickMessage(
          `LazyDesigner MCP failed to start: ${reason}. Close the old MCP instance or free port ${config.port}.`,
          6000
        );
      }
      return false;
    }

    if (!isRuntimeGenerationCurrent(generation)) {
      if (this.httpServer === candidate) this.httpServer = null;
      await candidate.closeAndWait();
      return false;
    }

    markRuntimeGenerationState(generation, "running");
    setStatusBarState("running", `${config.port}${config.endpoint}`);
    return true;
  }

  teardown(generation: number | null): void {
    const current = this.httpServer;
    this.httpServer = null;
    const closePromise = current?.closeAndWait() ?? Promise.resolve();

    this.nativeHttp = null;
    this.config = null;

    if (generation === null) {
      void closePromise.catch((error) => {
        console.error("[MCP] LazyDesigner listener cleanup failed", error);
      });
      return;
    }

    void beginRuntimeGenerationTeardown(generation, async () => {
      await closePromise;
    }).catch((error) => {
      console.error("[MCP] LazyDesigner runtime teardown failed", error);
    });
  }
}
