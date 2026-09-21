import {
  SdkErrorCode,
  SdkError,
  SdkHttpError,
} from "@modelcontextprotocol/client";
import type { GatewayConnectionManager } from "./connectionManager";
import type { BlockitAuthoringPhaseAffinity } from "./projectAffinity";
import type { JsonRecord } from "../protocol";

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

export type HealthProbe =
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
    last_queue_wait_ms?: number | null;
    max_queue_wait_ms?: number;
    last_duration_ms?: number | null;
    max_duration_ms?: number;
  };
  last_error: string | null;
};

export type GatewayRuntimeCallResult = JsonRecord & {
  content: unknown[];
  structuredContent?: unknown;
  isError?: boolean;
};

export type GatewayRuntimeInvocation = {
  result: GatewayRuntimeCallResult;
  readOnly: boolean;
};

export type BlockitRuntimeBackendOptions = {
  connectTimeoutMs?: number;
  callTimeoutMs?: number;
  closeTimeoutMs?: number;
  maxQueueDepth?: number;
  catalogLeaseMs?: number;
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isRequestTimeoutError(error: unknown): boolean {
  return error instanceof SdkError && error.code === SdkErrorCode.RequestTimeout;
}

export function isRuntimeProjectContextError(error: unknown): boolean {
  return error instanceof SdkHttpError && error.status === 409;
}

export function normalizePositiveInteger(
  value: number,
  fallback: number,
  minimum: number
): number {
  return Number.isFinite(value) && value >= minimum ? Math.trunc(value) : fallback;
}

export function normalizeNonNegativeInteger(
  value: number,
  fallback: number
): number {
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : fallback;
}

export function normalizeRuntimeCallResult(
  result: unknown
): GatewayRuntimeCallResult {
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

export function normalizeGatewayManagedResult(
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
      action:
        "continue same task through Gateway; Runtime catalog refreshes automatically",
    },
  };
}
