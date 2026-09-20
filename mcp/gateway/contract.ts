import { version } from "../package.json";
import {
  CAPABILITY_LIFECYCLE_SEARCH_PENALTY,
  CAPABILITY_TIER_BOOST,
  getCapabilityMetadata,
  type CapabilityTier,
} from "../lib/capabilityMetadata";

export const GATEWAY_NAME = "blockit-gateway";
export const GATEWAY_VERSION = version;
import { DEFAULT_RUNTIME_URL } from "../lib/runtimeConnection";
export { DEFAULT_RUNTIME_URL };

export const GATEWAY_TOOLS = {
  status: "status",
  searchCapabilities: "search_capabilities",
  describeCapability: "describe_capability",
  invokeCapability: "invoke_capability",
} as const;

export const GATEWAY_TOOL_NAMES = Object.values(GATEWAY_TOOLS);

export type JsonRecord = Record<string, unknown>;

export type BackendToolAnnotations = {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
  [key: string]: unknown;
};

export type BackendTool = {
  name: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
  annotations?: BackendToolAnnotations;
  [key: string]: unknown;
};

export type { CapabilityTier };

export type CapabilitySummary = {
  capability_id: string;
  description: string;
  tier: CapabilityTier;
  read_only: boolean;
  destructive: boolean;
  idempotent: boolean;
};

const CUBE_UV_CONTINUATION_FIELDS = new Set([
  "faces",
  "box_uv",
  "uv_offset",
  "mirror_uv",
  "autouv",
]);

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function changedFieldsFromEffect(value: unknown): string[] {
  if (!isRecord(value) || !Array.isArray(value.changed_fields)) return [];
  return value.changed_fields.filter(
    (field): field is string => typeof field === "string"
  );
}

function compactBatchCubeContinuationState(
  value: unknown,
  geometryEffect: unknown
): unknown {
  if (!isRecord(value)) return value;
  const changedFields = new Set(changedFieldsFromEffect(geometryEffect));
  const compact: JsonRecord = {};

  if (typeof value.uuid === "string") compact.uuid = value.uuid;
  if (typeof value.name === "string") compact.name = value.name;

  const copy = (field: string) => {
    if (value[field] !== undefined) compact[field] = value[field];
  };

  if (changedFields.has("name")) copy("name");
  if (changedFields.has("from")) copy("from");
  if (changedFields.has("to")) copy("to");
  if (changedFields.has("from") || changedFields.has("to")) {
    copy("size");
    copy("box_uv_region");
  }
  if (changedFields.has("origin")) copy("origin");
  if (changedFields.has("rotation")) copy("rotation");
  if (changedFields.has("inflate")) copy("inflate");
  if (changedFields.has("box_uv")) {
    copy("box_uv");
    copy("box_uv_region");
  }
  if (changedFields.has("uv_offset")) {
    copy("uv_offset");
    copy("box_uv_region");
  }
  if (changedFields.has("mirror_uv")) copy("mirror_uv");
  if (changedFields.has("autouv")) copy("autouv");
  if (changedFields.has("visibility")) copy("visibility");
  if (changedFields.has("faces")) copy("face_uvs");

  return compact;
}

function compactCubeContinuationState(
  value: unknown,
  geometryEffect: unknown
): unknown {
  if (!isRecord(value)) return value;
  const changedFields = changedFieldsFromEffect(geometryEffect);
  if (changedFields.some((field) => CUBE_UV_CONTINUATION_FIELDS.has(field))) {
    return value;
  }

  const { face_uvs: _faceUvs, ...compact } = value;
  return compact;
}

function compactManageCubesStructuredContent(value: unknown): unknown {
  if (!isRecord(value)) return value;

  if (Array.isArray(value.effects)) {
    return {
      ...value,
      effects: value.effects.map((rawEffect) => {
        if (!isRecord(rawEffect)) return rawEffect;
        const {
          before: _before,
          after,
          geometry_effect: geometryEffect,
          ...rest
        } = rawEffect;
        return {
          ...rest,
          ...(after !== undefined
            ? { after: compactBatchCubeContinuationState(after, geometryEffect) }
            : {}),
          ...(geometryEffect !== undefined
            ? { geometry_effect: geometryEffect }
            : {}),
        };
      }),
    };
  }

  if (value.before !== undefined && value.after !== undefined) {
    const {
      before: _before,
      after,
      geometry_effect: geometryEffect,
      ...rest
    } = value;
    return {
      ...rest,
      after: compactCubeContinuationState(after, geometryEffect),
      ...(geometryEffect !== undefined
        ? { geometry_effect: geometryEffect }
        : {}),
    };
  }

  return value;
}


export function compactGatewayCapabilityContent(
  capability: string,
  structuredContent: unknown,
  content: unknown
): unknown {
  if (
    capability === "manage_cubes" &&
    isRecord(structuredContent) &&
    structuredContent.execution === "applied" &&
    typeof structuredContent.modified === "number"
  ) {
    return [{ type: "text", text: "Cube mutation applied; use structured receipt." }];
  }
  return content;
}

/**
 * Keep the Runtime receipt complete for direct/debug clients while presenting
 * only continuation-relevant state through the stable AI-client Gateway.
 */
export function compactGatewayCapabilityStructuredContent(
  capability: string,
  value: unknown
): unknown {
  if (capability !== "manage_cubes") return value;
  return compactManageCubesStructuredContent(value);
}

export function normalizeRuntimeUrl(
  value: string = DEFAULT_RUNTIME_URL
): string {
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("LazyDesigner Runtime URL must use http or https.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("LazyDesigner Runtime URL must not contain credentials.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname !== "127.0.0.1" &&
    hostname !== "localhost" &&
    hostname !== "::1" &&
    hostname !== "[::1]"
  ) {
    throw new Error("LazyDesigner Gateway only connects to a loopback Runtime.");
  }

  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/+$/, "");
}

/** Fingerprint only stable runtime identity fields. */
export function createRuntimeSignature(health: unknown): string {
  const root = isRecord(health) ? health : {};
  const product = isRecord(root.product) ? root.product : {};

  return JSON.stringify({
    build_identity: stringValue(root.build_identity),
    instance_id: stringValue(root.instance_id),
    startup_time: stringValue(root.startup_time),
    product_id: stringValue(product.id),
    product_version: stringValue(product.version),
    profile: stringValue(product.profile),
    authoring_phase: stringValue(product.authoring_phase),
    exposed_tool_count: numberValue(root.exposed_tool_count),
  });
}

export function classifyCapabilityTier(tool: BackendTool): CapabilityTier {
  return getCapabilityMetadata(tool.name).tier;
}

export function summarizeCapability(tool: BackendTool): CapabilitySummary {
  return {
    capability_id: tool.name,
    description: tool.description ?? "",
    tier: classifyCapabilityTier(tool),
    read_only: tool.annotations?.readOnlyHint === true,
    destructive: tool.annotations?.destructiveHint === true,
    idempotent: tool.annotations?.idempotentHint === true,
  };
}

function normalizeCapabilityQuery(query: string): string {
  return query.trim().toLowerCase();
}

function exactCapabilityMatch(
  tools: readonly BackendTool[],
  query: string
): BackendTool | null {
  const normalized = normalizeCapabilityQuery(query);
  if (!normalized) return null;
  return tools.find((tool) => tool.name.toLowerCase() === normalized) ?? null;
}

function lexicalCapabilityScore(tool: BackendTool, tokens: string[]): number {
  if (tokens.length === 0) return 1;

  const name = tool.name.toLowerCase();
  const searchableName = name.replace(/[_.\/-]+/g, " ");
  const description = (tool.description ?? "").toLowerCase();
  const aliases = getCapabilityMetadata(tool.name).searchAliases
    .join(" ")
    .toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (name === token) score += 100;
    else if (name.startsWith(token)) score += 60;
    else if (name.includes(token)) score += 40;
    else if (searchableName.includes(token)) score += 30;

    if (aliases.includes(token)) score += 24;
    if (description.includes(token)) score += 10;
  }

  return score;
}

export function searchCapabilityCatalog(
  tools: readonly BackendTool[],
  query: string,
  limit: number
): CapabilitySummary[] {
  const exact = exactCapabilityMatch(tools, query);
  if (exact) return [summarizeCapability(exact)];

  const boundedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  const tokens = normalizeCapabilityQuery(query)
    .split(/\s+/)
    .filter(Boolean);

  return tools
    .map((tool) => {
      const metadata = getCapabilityMetadata(tool.name);
      const tier = metadata.tier;
      const lexicalScore = lexicalCapabilityScore(tool, tokens);
      return {
        tool,
        tier,
        lexicalScore,
        score:
          lexicalScore +
          CAPABILITY_TIER_BOOST[tier] +
          CAPABILITY_LIFECYCLE_SEARCH_PENALTY[metadata.lifecycle.stage],
      };
    })
    .filter(({ tier, lexicalScore }) =>
      tokens.length === 0 ? tier !== "maintenance" : lexicalScore > 0
    )
    .sort(
      (left, right) =>
        right.score - left.score || left.tool.name.localeCompare(right.tool.name)
    )
    .slice(0, boundedLimit)
    .map(({ tool }) => summarizeCapability(tool));
}

export type InterruptedCallClassification = {
  code: "BACKEND_CALL_INTERRUPTED" | "OUTCOME_UNKNOWN";
  safe_to_retry: boolean;
};

/**
 * A transport failure after tools/call may happen after Blockbench already
 * executed the operation. Mutations therefore never receive an automatic retry.
 */
export function classifyInterruptedCall(
  tool: BackendTool
): InterruptedCallClassification {
  if (tool.annotations?.readOnlyHint === true) {
    return { code: "BACKEND_CALL_INTERRUPTED", safe_to_retry: true };
  }
  return { code: "OUTCOME_UNKNOWN", safe_to_retry: false };
}
