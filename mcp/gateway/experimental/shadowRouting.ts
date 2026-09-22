import { TextEncoder } from "node:util";
import {
  HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES,
} from "./hybridProfile";
import { HYBRID_4_GENERATED_SCHEMAS } from "./generated/hybrid4Schemas";
import { evaluateCapabilityPreconditions } from "../capabilities/graph";
import type {
  CapabilityBranchHint,
  CapabilityFactState,
} from "../capabilities/types";

export type ShadowReplayKnowledgeState =
  | "KNOWN"
  | "UNKNOWN"
  | "SCHEMA_STALE"
  | "BLOCKED"
  | "UNKNOWN_PRECONDITION";

export type ShadowReplayCase = {
  id: string;
  domain: string;
  capability: string;
  branch?: CapabilityBranchHint;
  knowledge: ShadowReplayKnowledgeState;
  needs_schema: boolean;
  weight: number;
  facts?: CapabilityFactState;
};

export type ShadowRoute = {
  case_id: string;
  strategy: "STABLE_FOUR" | "HYBRID_4";
  client_calls: number;
  routing_calls: number;
  schema_reads: number;
  runtime_invokes: number;
  blocked: boolean;
  capability: string;
};

function stableFourRoute(item: ShadowReplayCase): ShadowRoute {
  const blocked =
    item.knowledge === "BLOCKED" ||
    evaluateCapabilityPreconditions(
      item.capability,
      item.branch,
      item.facts
    ).eligibility === "BLOCKED";

  if (blocked) {
    return {
      case_id: item.id,
      strategy: "STABLE_FOUR",
      client_calls: 1,
      routing_calls: 1,
      schema_reads: 0,
      runtime_invokes: 0,
      blocked: true,
      capability: item.capability,
    };
  }

  if (item.knowledge === "KNOWN") {
    return {
      case_id: item.id,
      strategy: "STABLE_FOUR",
      client_calls: 1,
      routing_calls: 0,
      schema_reads: 0,
      runtime_invokes: 1,
      blocked: false,
      capability: item.capability,
    };
  }

  if (item.knowledge === "SCHEMA_STALE") {
    return {
      case_id: item.id,
      strategy: "STABLE_FOUR",
      client_calls: 2,
      routing_calls: 1,
      schema_reads: 1,
      runtime_invokes: 1,
      blocked: false,
      capability: item.capability,
    };
  }

  const routingCalls = item.needs_schema ? 2 : 1;
  return {
    case_id: item.id,
    strategy: "STABLE_FOUR",
    client_calls: routingCalls + 1,
    routing_calls: routingCalls,
    schema_reads: item.needs_schema ? 1 : 0,
    runtime_invokes: 1,
    blocked: false,
    capability: item.capability,
  };
}

function hybridRoute(
  item: ShadowReplayCase,
  directCapabilities: readonly string[]
): ShadowRoute {
  const direct = directCapabilities.includes(item.capability);

  if (!direct) return { ...stableFourRoute(item), strategy: "HYBRID_4" };

  const precondition = evaluateCapabilityPreconditions(
    item.capability,
    item.branch,
    item.facts
  );
  const blocked =
    item.knowledge === "BLOCKED" || precondition.eligibility === "BLOCKED";

  return {
    case_id: item.id,
    strategy: "HYBRID_4",
    client_calls: 1,
    routing_calls: 0,
    schema_reads: 0,
    runtime_invokes: blocked ? 0 : 1,
    blocked,
    capability: item.capability,
  };
}

export function hybrid4StaticSchemaBytes(): number {
  const encoder = new TextEncoder();
  return Object.entries(HYBRID_4_GENERATED_SCHEMAS).reduce(
    (sum, [name, spec]) =>
      sum +
      encoder.encode(
        JSON.stringify({
          name,
          description: spec.description,
          inputSchema: spec.inputSchema,
        })
      ).byteLength,
    0
  );
}

export function shadowReplayCaseForDirectSet(
  item: ShadowReplayCase,
  directCapabilities: readonly string[]
) {
  const stable = stableFourRoute(item);
  const hybrid = hybridRoute(item, directCapabilities);
  return {
    case_id: item.id,
    domain: item.domain,
    capability: item.capability,
    stable,
    hybrid,
    call_saving: stable.client_calls - hybrid.client_calls,
    routing_saving: stable.routing_calls - hybrid.routing_calls,
    schema_read_saving: stable.schema_reads - hybrid.schema_reads,
    blocked_preserved: stable.blocked === hybrid.blocked,
    capability_preserved: stable.capability === hybrid.capability,
  };
}

export function shadowReplayCase(item: ShadowReplayCase) {
  return shadowReplayCaseForDirectSet(
    item,
    HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES
  );
}
