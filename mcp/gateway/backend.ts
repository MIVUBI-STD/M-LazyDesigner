import { Client, StreamableHTTPClientTransport, SdkErrorCode, SdkError, SdkHttpError } from "@modelcontextprotocol/client";
import {
  BLOCKIT_AUTHORING_PHASE_AFFINITY_HEADER,
  BLOCKIT_PROJECT_AFFINITY_HEADER,
  readRuntimeAuthoringPhase,
  readRuntimeProjectHealth,
  type BlockitAuthoringPhaseAffinity,
} from "./projectAffinity";
import {
  DEFAULT_RUNTIME_URL,
  GATEWAY_VERSION,
  classifyInterruptedCall,
  createRuntimeSignature,
  normalizeRuntimeUrl,
  searchCapabilityCatalog,
  type BackendTool,
  type CapabilitySummary,
  type JsonRecord,
} from "./contract";
import { GatewayConnectionManager } from "./connectionManager";
import {
  resolveGatewayCapabilityEffects,
  validateGatewayCapabilityEffectReceipt,
} from "./capabilityEffects";
import { getCapabilityMetadata } from "../lib/capabilityMetadata";

export type GatewayBackendErrorCode =
  | "BACKEND_UNAVAILABLE"
  | "CAPABILITY_NOT_FOUND"
  | "BACKEND_CALL_INTERRUPTED"
  | "OUTCOME_UNKNOWN"
  | "PROJECT_CONTEXT_LOST"
  | "GATEWAY_BUSY";

export class GatewayBackendError extends Error {
  constructor(
    readonly code: GatewayBackendErrorCode,
    message: string,
    readonly safeToRetry: boolean = false,
    readonly details: JsonRecord = {}
  ) {
    super(message);
    this.name = "GatewayBackendError";
  }
}

type HealthProbe =
  | { online: true; health: JsonRecord; signature: string }
  | { online: false; error: string };

export type GatewayRuntimeStatus = {
  gateway: "ready";
  affinity: {
    project_uuid: string | null;
    authoring_phase: BlockitAuthoringPhaseAffinity | null;
  };
  runtime: {
    online: boolean;
    endpoint: string;
    mcp_client_ready: boolean;
    protocol_era?: "modern" | "legacy" | null;
    catalog_stale: boolean;
    runtime_signature: string | null;
    connected_signature: string | null;
    catalog_count: number;
    health: JsonRecord | null;
  };
  connection: ReturnType<GatewayConnectionManager["snapshot"]>;
  operations: {
    active: number;
    queued: number;
    max_queue_depth: number;
    completed: number;
    failed: number;
    timed_out: number;
    rejected_busy: number;
  };
  last_error: string | null;
};

export type GatewayRuntimeCallResult = JsonRecord & {
  content: unknown[];
  structuredContent?: unknown;
  isError?: boolean;
};

export type BlockitRuntimeBackendOptions = {
  connectTimeoutMs?: number;
  callTimeoutMs?: number;
  closeTimeoutMs?: number;
  maxQueueDepth?: number;
  catalogLeaseMs?: number;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isRequestTimeoutError(error: unknown): boolean {
  return error instanceof SdkError && error.code === SdkErrorCode.RequestTimeout;
}

function isRuntimeProjectContextError(error: unknown): boolean {
  return error instanceof SdkHttpError && error.status === 409;
}

function normalizePositiveInteger(
  value: number,
  fallback: number,
  minimum: number
): number {
  return Number.isFinite(value) && value >= minimum ? Math.trunc(value) : fallback;
}

function normalizeNonNegativeInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : fallback;
}

function normalizeRuntimeCallResult(result: unknown): GatewayRuntimeCallResult {
  if (isRecord(result) && Array.isArray(result.content)) {
    return result as GatewayRuntimeCallResult;
  }

  return {
    content: [
      {
        type: "text",
        text: "LazyDesigner Runtime returned a non-standard deferred tool result.",
      },
    ],
    structuredContent: { runtime_result: result },
  };
}

function normalizeGatewayManagedResult(
  phaseAffinityUpdated: boolean,
  result: GatewayRuntimeCallResult
): GatewayRuntimeCallResult {
  if (!phaseAffinityUpdated || result.isError === true) {
    return result;
  }

  return {
    ...result,
    content: [
      {
        type: "text",
        text: "This LazyDesigner Gateway authoring phase switched. Continue the same task; its Runtime catalog will refresh automatically on the next capability request.",
      },
    ],
    structuredContent: {
      ...(isRecord(result.structuredContent) ? result.structuredContent : {}),
      gateway_catalog_invalidated: true,
      client_reconnect_required: false,
      new_chat_required: false,
      action: "continue same task through Gateway; Runtime catalog refreshes automatically",
    },
  };
}

export class BlockitRuntimeBackend {
  readonly runtimeUrl: string;
  private readonly healthTimeoutMs: number;
  private readonly connectTimeoutMs: number;
  private readonly callTimeoutMs: number;
  private readonly closeTimeoutMs: number;
  private readonly maxQueueDepth: number;
  private readonly catalogLeaseMs: number;
  private readonly connection = new GatewayConnectionManager();
  private client: Client | null = null;
  private connectedProtocolEra: "modern" | "legacy" | null = null;
  private connectedSignature: string | null = null;
  private catalog = new Map<string, BackendTool>();
  private catalogValidatedAt = 0;
  private projectUuid: string | null = null;
  private authoringPhase: BlockitAuthoringPhaseAffinity | null = null;
  private operationTail: Promise<void> = Promise.resolve();
  private pendingOperations = 0;
  private activeOperations = 0;
  private completedOperations = 0;
  private failedOperations = 0;
  private timedOutOperations = 0;
  private rejectedBusyOperations = 0;
  private lastError: string | null = null;

  constructor(
    runtimeUrl: string = process.env.BLOCKIT_RUNTIME_URL ?? DEFAULT_RUNTIME_URL,
    healthTimeoutMs: number = Number(process.env.BLOCKIT_RUNTIME_TIMEOUT_MS ?? 1500),
    options: BlockitRuntimeBackendOptions = {}
  ) {
    this.runtimeUrl = normalizeRuntimeUrl(runtimeUrl);
    this.healthTimeoutMs = normalizePositiveInteger(healthTimeoutMs, 1500, 100);
    this.connectTimeoutMs = normalizePositiveInteger(
      options.connectTimeoutMs ??
        Number(process.env.BLOCKIT_RUNTIME_CONNECT_TIMEOUT_MS ?? 5000),
      5000,
      250
    );
    this.callTimeoutMs = normalizePositiveInteger(
      options.callTimeoutMs ??
        Number(process.env.BLOCKIT_RUNTIME_CALL_TIMEOUT_MS ?? 120000),
      120000,
      1000
    );
    this.closeTimeoutMs = normalizePositiveInteger(
      options.closeTimeoutMs ??
        Number(process.env.BLOCKIT_RUNTIME_CLOSE_TIMEOUT_MS ?? 2000),
      2000,
      100
    );
    this.maxQueueDepth = normalizeNonNegativeInteger(
      options.maxQueueDepth ??
        Number(process.env.BLOCKIT_GATEWAY_MAX_QUEUE_DEPTH ?? 8),
      8
    );
    this.catalogLeaseMs = normalizePositiveInteger(
      options.catalogLeaseMs ??
        Number(process.env.BLOCKIT_GATEWAY_CATALOG_LEASE_MS ?? 1000),
      1000,
      100
    );
  }

  private operationStatus(): GatewayRuntimeStatus["operations"] {
    return {
      active: this.activeOperations,
      queued: Math.max(0, this.pendingOperations - this.activeOperations),
      max_queue_depth: this.maxQueueDepth,
      completed: this.completedOperations,
      failed: this.failedOperations,
      timed_out: this.timedOutOperations,
      rejected_busy: this.rejectedBusyOperations,
    };
  }

  private runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    if (this.pendingOperations >= this.maxQueueDepth + 1) {
      this.rejectedBusyOperations += 1;
      return Promise.reject(
        new GatewayBackendError(
          "GATEWAY_BUSY",
          `LazyDesigner Gateway queue is full (${this.maxQueueDepth} waiting operations maximum). Retry after the current authoring operation completes.`,
          true,
          { max_queue_depth: this.maxQueueDepth }
        )
      );
    }

    this.pendingOperations += 1;

    const execute = async (): Promise<T> => {
      this.activeOperations = 1;
      try {
        const result = await operation();
        this.completedOperations += 1;
        return result;
      } catch (error) {
        this.failedOperations += 1;
        if (
          error instanceof GatewayBackendError &&
          typeof error.details.timeout_ms === "number"
        ) {
          this.timedOutOperations += 1;
        }
        throw error;
      } finally {
        this.activeOperations = 0;
        this.pendingOperations = Math.max(0, this.pendingOperations - 1);
      }
    };

    const run = this.operationTail.then(execute, execute);
    this.operationTail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private hasFreshCatalog(now: number = Date.now()): boolean {
    return Boolean(
      this.client &&
      this.connectedSignature &&
      this.catalog.size > 0 &&
      this.catalogValidatedAt > 0 &&
      now - this.catalogValidatedAt <= this.catalogLeaseMs
    );
  }

  private runtimeRequestHeaders(): Headers {
    const headers = new Headers();
    if (this.projectUuid) {
      headers.set(BLOCKIT_PROJECT_AFFINITY_HEADER, this.projectUuid);
    }
    if (this.authoringPhase) {
      headers.set(BLOCKIT_AUTHORING_PHASE_AFFINITY_HEADER, this.authoringPhase);
    }
    return headers;
  }

  private async probeHealth(): Promise<HealthProbe> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.healthTimeoutMs);

    try {
      const response = await fetch(`${this.runtimeUrl}/health`, {
        method: "GET",
        headers: this.runtimeRequestHeaders(),
        signal: controller.signal,
      });
      if (response.status !== 200) {
        return {
          online: false,
          error: `Runtime health returned HTTP ${response.status}.`,
        };
      }

      const body: unknown = await response.json();
      if (!isRecord(body)) {
        return { online: false, error: "Runtime health returned non-object JSON." };
      }

      this.connection.markAvailable();
      return {
        online: true,
        health: body,
        signature: createRuntimeSignature(body),
      };
    } catch (error) {
      return { online: false, error: errorMessage(error) };
    } finally {
      clearTimeout(timer);
    }
  }

  private syncAuthoringPhaseFromHealth(health: JsonRecord): boolean {
    const runtimePhase = readRuntimeAuthoringPhase(health);
    if (!runtimePhase) {
      throw new GatewayBackendError(
        "BACKEND_UNAVAILABLE",
        "The connected LazyDesigner Runtime does not expose a valid authoring phase. Deploy/reload the matching LazyDesigner build before authoring.",
        false
      );
    }

    if (!this.authoringPhase) {
      this.authoringPhase = runtimePhase;
      return true;
    }

    if (runtimePhase !== this.authoringPhase) {
      throw new GatewayBackendError(
        "BACKEND_UNAVAILABLE",
        `LazyDesigner Runtime did not honor this Gateway's ${this.authoringPhase} authoring phase affinity (reported ${runtimePhase}). Deploy/reload the matching LazyDesigner build before continuing.`,
        false,
        {
          requested_authoring_phase: this.authoringPhase,
          runtime_authoring_phase: runtimePhase,
        }
      );
    }

    return false;
  }

  private syncProjectAffinityFromHealth(
    health: JsonRecord,
    bindIfUnset: boolean,
    allowMissingBoundProject: boolean = false
  ): boolean {
    const projectHealth = readRuntimeProjectHealth(health);
    if (!projectHealth) {
      if (bindIfUnset || this.projectUuid) {
        throw new GatewayBackendError(
          "PROJECT_CONTEXT_LOST",
          "The connected LazyDesigner Runtime does not expose project-affinity health. Deploy/reload the matching LazyDesigner build before authoring mutations.",
          false
        );
      }
      return false;
    }

    if (this.projectUuid) {
      if (
        projectHealth.requested_project_uuid !== this.projectUuid ||
        projectHealth.requested_project_available !== true
      ) {
        if (allowMissingBoundProject) {
          this.projectUuid = null;
          return true;
        }
        throw new GatewayBackendError(
          "PROJECT_CONTEXT_LOST",
          `Gateway-bound Blockbench project ${this.projectUuid} is no longer available. Select the intended open tab and explicitly rebind this Gateway before continuing.`,
          false,
          {
            project_uuid: this.projectUuid,
            active_project_uuid: projectHealth.active_project_uuid,
            action: "select intended Blockbench tab, then call status with adopt_active_project=true",
          }
        );
      }
      return false;
    }

    if (!bindIfUnset) return false;

    if (
      projectHealth.open_project_count !== 1 ||
      !projectHealth.active_project_uuid
    ) {
      const message = projectHealth.open_project_count > 1
        ? `LazyDesigner Gateway is not bound and ${projectHealth.open_project_count} Blockbench projects are open. Select the intended tab and explicitly bind this chat before authoring.`
        : "LazyDesigner Gateway is not bound and there is no single active Blockbench project to bind safely.";
      throw new GatewayBackendError(
        "PROJECT_CONTEXT_LOST",
        message,
        false,
        {
          active_project_uuid: projectHealth.active_project_uuid,
          open_project_count: projectHealth.open_project_count,
          action: "select intended Blockbench tab, then call status with adopt_active_project=true",
        }
      );
    }

    this.projectUuid = projectHealth.active_project_uuid;
    return true;
  }

  private async closeClientBestEffort(client: Client): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        client.close(),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, this.closeTimeoutMs);
        }),
      ]);
    } catch {
      // A dead backend is already disconnected; cleanup remains best-effort.
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  private async closeConnectionUnsafe(): Promise<void> {
    const client = this.client;
    this.client = null;
    this.connectedProtocolEra = null;
    this.connectedSignature = null;
    this.catalog.clear();
    this.catalogValidatedAt = 0;

    if (client) {
      await this.closeClientBestEffort(client);
    }
  }

  private async listAllTools(client: Client): Promise<BackendTool[]> {
    const tools: BackendTool[] = [];
    let cursor: string | undefined;
    let pages = 0;

    do {
      const listed = await client.listTools(
        cursor ? { cursor } : undefined,
        { timeout: this.connectTimeoutMs }
      );
      tools.push(...(listed.tools as BackendTool[]));
      cursor = typeof listed.nextCursor === "string" ? listed.nextCursor : undefined;
      pages += 1;
      if (pages > 100) {
        throw new Error("Runtime tools/list exceeded the 100-page safety bound.");
      }
    } while (cursor);

    return tools;
  }

  private async connectFreshUnsafe(signature: string): Promise<void> {
    await this.closeConnectionUnsafe();
    this.connection.beginConnect();

    const client = new Client(
      { name: "blockit-gateway-runtime-client", version: GATEWAY_VERSION },
      {
        capabilities: {},
        versionNegotiation: { mode: "auto" },
      }
    );
    const transport = new StreamableHTTPClientTransport(new URL(this.runtimeUrl), {
      requestInit: { headers: this.runtimeRequestHeaders() },
    });

    try {
      await client.connect(transport, { timeout: this.connectTimeoutMs });
      const tools = await this.listAllTools(client);
      this.client = client;
      this.connectedProtocolEra = client.getProtocolEra() ?? null;
      this.connectedSignature = signature;
      this.catalog = new Map(tools.map((tool) => [tool.name, tool]));
      this.catalogValidatedAt = Date.now();
      this.lastError = null;
      this.connection.markReady({ catalogRefreshed: true });
    } catch (error) {
      await this.closeClientBestEffort(client);
      const message = errorMessage(error);
      const timedOut = isRequestTimeoutError(error);
      const retryAfterMs = this.connection.markDegraded();
      this.lastError = message;
      throw new GatewayBackendError(
        "BACKEND_UNAVAILABLE",
        `LazyDesigner Runtime MCP connection failed: ${message}`,
        true,
        {
          ...(timedOut ? { timeout_ms: this.connectTimeoutMs } : {}),
          retry_after_ms: retryAfterMs,
        }
      );
    }
  }

  private async ensureCatalogUnsafe(
    bindProject: boolean = false,
    allowMissingBoundProject: boolean = false
  ): Promise<void> {
    if (!this.client && !this.connection.canAttempt()) {
      const retryAfterMs = this.connection.retryAfterMs();
      throw new GatewayBackendError(
        "BACKEND_UNAVAILABLE",
        `LazyDesigner Runtime reconnect is cooling down for ${retryAfterMs}ms after a recent connection failure.`,
        true,
        { retry_after_ms: retryAfterMs }
      );
    }

    this.connection.beginProbe();
    const probe = await this.probeHealth();
    if (!probe.online) {
      await this.closeConnectionUnsafe();
      const retryAfterMs = this.connection.markOffline();
      this.lastError = probe.error;
      throw new GatewayBackendError(
        "BACKEND_UNAVAILABLE",
        `LazyDesigner Runtime is unavailable: ${probe.error}`,
        true,
        { retry_after_ms: retryAfterMs }
      );
    }

    let affinityChanged = false;
    try {
      affinityChanged = this.syncAuthoringPhaseFromHealth(probe.health);
      affinityChanged =
        this.syncProjectAffinityFromHealth(
          probe.health,
          bindProject,
          allowMissingBoundProject
        ) || affinityChanged;
    } catch (error) {
      await this.closeConnectionUnsafe();
      this.lastError = errorMessage(error);
      throw error;
    }

    if (affinityChanged && this.client) {
      await this.closeConnectionUnsafe();
    }

    if (
      this.client &&
      this.connectedSignature === probe.signature &&
      this.catalog.size > 0
    ) {
      this.catalogValidatedAt = Date.now();
      this.connection.markHealthy();
      return;
    }

    await this.connectFreshUnsafe(probe.signature);
  }

  private buildStatus(probe: HealthProbe): GatewayRuntimeStatus {
    if (!probe.online) {
      this.connection.markOffline();
      return {
        gateway: "ready",
        affinity: {
          project_uuid: this.projectUuid,
          authoring_phase: this.authoringPhase,
        },
        runtime: {
          online: false,
          endpoint: this.runtimeUrl,
          mcp_client_ready: false,
          protocol_era: null,
          catalog_stale: this.catalog.size > 0,
          runtime_signature: null,
          connected_signature: this.connectedSignature,
          catalog_count: this.catalog.size,
          health: null,
        },
        connection: this.connection.snapshot(),
        operations: this.operationStatus(),
        last_error: probe.error,
      };
    }

    const ready =
      Boolean(this.client) && this.connectedSignature === probe.signature;
    if (ready) {
      this.catalogValidatedAt = Date.now();
      this.connection.markHealthy();
    }
    return {
      gateway: "ready",
      affinity: {
        project_uuid: this.projectUuid,
        authoring_phase:
          this.authoringPhase ?? readRuntimeAuthoringPhase(probe.health),
      },
      runtime: {
        online: true,
        endpoint: this.runtimeUrl,
        mcp_client_ready: ready,
        protocol_era: ready ? this.connectedProtocolEra : null,
        catalog_stale:
          this.connectedSignature !== null && this.connectedSignature !== probe.signature,
        runtime_signature: probe.signature,
        connected_signature: this.connectedSignature,
        catalog_count: this.catalog.size,
        health: probe.health,
      },
      connection: this.connection.snapshot(),
      operations: this.operationStatus(),
      last_error: this.lastError,
    };
  }

  async getStatus(): Promise<GatewayRuntimeStatus> {
    return this.buildStatus(await this.probeHealth());
  }

  async adoptActiveProject(): Promise<GatewayRuntimeStatus> {
    return this.runExclusive(async () => {
      const initial = await this.probeHealth();
      if (!initial.online) {
        this.lastError = initial.error;
        return this.buildStatus(initial);
      }

      const projectHealth = readRuntimeProjectHealth(initial.health);
      if (!projectHealth) {
        throw new GatewayBackendError(
          "PROJECT_CONTEXT_LOST",
          "The connected LazyDesigner Runtime does not expose project-affinity health. Deploy/reload the matching LazyDesigner build before rebinding.",
          false
        );
      }
      if (!projectHealth.active_project_uuid) {
        throw new GatewayBackendError(
          "PROJECT_CONTEXT_LOST",
          "No Blockbench project tab is active, so this Gateway cannot rebind project affinity.",
          false
        );
      }

      let affinityChanged = this.syncAuthoringPhaseFromHealth(initial.health);
      if (this.projectUuid !== projectHealth.active_project_uuid) {
        this.projectUuid = projectHealth.active_project_uuid;
        affinityChanged = true;
      }
      if (affinityChanged) {
        await this.closeConnectionUnsafe();
      }
      this.lastError = null;
      return this.buildStatus(await this.probeHealth());
    });
  }

  async searchCapabilities(
    query: string,
    limit: number = 4
  ): Promise<CapabilitySummary[]> {
    if (this.hasFreshCatalog()) {
      return searchCapabilityCatalog([...this.catalog.values()], query, limit);
    }

    return this.runExclusive(async () => {
      if (!this.hasFreshCatalog()) {
        await this.ensureCatalogUnsafe();
      }
      return searchCapabilityCatalog([...this.catalog.values()], query, limit);
    });
  }

  async describeCapability(capability: string): Promise<BackendTool> {
    if (!this.hasFreshCatalog()) {
      await this.runExclusive(async () => {
        if (!this.hasFreshCatalog()) {
          await this.ensureCatalogUnsafe();
        }
      });
    }

    const tool = this.catalog.get(capability);
    if (!tool) {
      throw new GatewayBackendError(
        "CAPABILITY_NOT_FOUND",
        `Runtime capability "${capability}" is not exposed by the current LazyDesigner surface.`,
        true,
        { capability }
      );
    }
    return tool;
  }

  async invokeCapability(
    capability: string,
    args: JsonRecord = {},
    requestMeta?: JsonRecord
  ): Promise<GatewayRuntimeCallResult> {
    return this.runExclusive(async () => {
      const capabilityMetadata = getCapabilityMetadata(capability);
      const projectTransition =
        capabilityMetadata.effects.projectAffinity === "adopt_created_project";
      await this.ensureCatalogUnsafe(!projectTransition, projectTransition);
      const tool = this.catalog.get(capability);
      if (!tool) {
        throw new GatewayBackendError(
          "CAPABILITY_NOT_FOUND",
          `Runtime capability "${capability}" is not exposed by the current LazyDesigner surface.`,
          true,
          { capability }
        );
      }

      try {
        const result: unknown = await this.client!.callTool(
          {
            name: capability,
            arguments: args,
            ...(requestMeta && Object.keys(requestMeta).length > 0
              ? { _meta: requestMeta }
              : {}),
          },
          { timeout: this.callTimeoutMs }
        );
        const normalized = normalizeRuntimeCallResult(result);
        let managed = normalized;
        const application = resolveGatewayCapabilityEffects(
          capability,
          normalized.structuredContent,
          this.authoringPhase
        );
        const receiptIssue = validateGatewayCapabilityEffectReceipt(
          application,
          normalized.isError !== true
        );
        if (receiptIssue) {
          await this.closeConnectionUnsafe();
          this.connection.markDegraded();
          throw new GatewayBackendError(
            "BACKEND_UNAVAILABLE",
            receiptIssue.message,
            false,
            {
              capability,
              receipt_issue: receiptIssue.code,
            }
          );
        }

        let affinityChanged = false;

        if (normalized.isError !== true) {
          if (application.projectUuid) {
            this.projectUuid = application.projectUuid;
            affinityChanged = true;
          }

          const phaseAffinityUpdated =
            application.effects.phaseAffinity === "update_from_result";
          if (phaseAffinityUpdated) {
            if (!application.authoringPhase) {
              await this.closeConnectionUnsafe();
              this.connection.markDegraded();
              throw new GatewayBackendError(
                "BACKEND_UNAVAILABLE",
                "LazyDesigner Runtime returned an invalid authoring phase handoff receipt.",
                false
              );
            }

            this.authoringPhase = application.authoringPhase;
            affinityChanged = true;
            managed = {
              ...normalized,
              structuredContent: {
                ...(isRecord(normalized.structuredContent)
                  ? normalized.structuredContent
                  : {}),
                phase: application.authoringPhase,
                surface_changed: application.surfaceChanged === true,
              },
            };
          }

          if (application.effects.invalidateCatalog || affinityChanged) {
            await this.closeConnectionUnsafe();
          }

          return normalizeGatewayManagedResult(phaseAffinityUpdated, managed);
        }

        return managed;
      } catch (error) {
        const message = errorMessage(error);
        if (isRuntimeProjectContextError(error)) {
          await this.closeConnectionUnsafe();
          this.lastError = message;
          throw new GatewayBackendError(
            "PROJECT_CONTEXT_LOST",
            `LazyDesigner refused "${capability}" because this Gateway's bound project tab is no longer safely available. Select the intended open tab and explicitly rebind before continuing.`,
            false,
            {
              capability,
              project_uuid: this.projectUuid,
              cause: message,
              action: "select intended Blockbench tab, then call status with adopt_active_project=true",
            }
          );
        }
        if (error instanceof GatewayBackendError) {
          this.lastError = message;
          throw error;
        }

        const classification = classifyInterruptedCall(tool);
        const timedOut = isRequestTimeoutError(error);
        await this.closeConnectionUnsafe();
        const retryAfterMs = this.connection.markDegraded();
        this.lastError = message;
        throw new GatewayBackendError(
          classification.code,
          classification.code === "OUTCOME_UNKNOWN"
            ? `LazyDesigner Runtime connection was interrupted while invoking "${capability}". The mutation may already have executed; inspect current model state before retrying.`
            : `LazyDesigner Runtime connection was interrupted while invoking read-only capability "${capability}".`,
          classification.safe_to_retry,
          {
            capability,
            cause: message,
            retry_after_ms: retryAfterMs,
            ...(timedOut ? { timeout_ms: this.callTimeoutMs } : {}),
          }
        );
      }
    });
  }

  async close(): Promise<void> {
    await this.runExclusive(() => this.closeConnectionUnsafe());
  }
}
