import { getCapabilityMetadata } from "@/lib/capabilities/metadata";
import {
  normalizeAuthoringPhaseAffinity,
} from "@/lib/runtime/affinity";
import type { McpAuthoringPhase } from "@/lib/capabilities/authoringStage";

export type RuntimeRequestEnvelope = {
  method: string | null;
  capability: string | null;
  targetAuthoringPhase: McpAuthoringPhase | null;
  id: string | number | null;
};

export interface SerializedWebResponse {
  status: number;
  headers: Record<string, string>;
  body: string | ReadableStream<Uint8Array>;
  finalize?: () => Promise<void>;
}

export function readRequestEnvelope (
  body: string
): RuntimeRequestEnvelope {
  try {
    const parsed = JSON.parse(body) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        method: null,
        capability: null,
        targetAuthoringPhase: null,
        id: null,
      };
    }

    const record = parsed as {
      method?: unknown;
      id?: unknown;
      params?: {
        name?: unknown;
        arguments?: { target_phase?: unknown };
      };
    };

    const capability =
      record.method === "tools/call" &&
      typeof record.params?.name === "string"
        ? record.params.name
        : null;

    const capabilityEffects = capability
      ? getCapabilityMetadata(capability).effects
      : null;

    let targetAuthoringPhase: McpAuthoringPhase | null = null;
    if (capabilityEffects?.phaseAffinity === "update_from_result") {
      try {
        targetAuthoringPhase = normalizeAuthoringPhaseAffinity(
          record.params?.arguments?.target_phase
        );
      } catch {
        targetAuthoringPhase = null;
      }
    }

    return {
      method: typeof record.method === "string" ? record.method : null,
      capability,
      targetAuthoringPhase,
      id:
        typeof record.id === "string" || typeof record.id === "number"
          ? record.id
          : null,
    };
  } catch {
    return {
      method: null,
      capability: null,
      targetAuthoringPhase: null,
      id: null,
    };
  }
}

export function projectContextErrorBody (
  id: string | number | null,
  message: string
): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    error: { code: -32002, message },
    id,
  });
}

export function isSuccessfulToolCallResponse (
  response: SerializedWebResponse
): boolean {
  if (response.status !== 200 || typeof response.body !== "string") {
    return false;
  }

  try {
    const parsed = JSON.parse(response.body) as {
      error?: unknown;
      result?: { isError?: unknown };
    };
    return parsed.error === undefined && parsed.result?.isError !== true;
  } catch {
    return false;
  }
}