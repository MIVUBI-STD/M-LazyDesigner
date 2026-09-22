import type { GatewayRuntimeStatus } from "./backend";
import type { JsonRecord } from "./protocol";
import { CAPABILITY_SEMANTIC_CATALOG_REVISIONS, type CapabilitySemanticCatalogRevisions } from "./capabilities/semanticRegistry";
import { evaluateSemanticConsumerFreshness } from "./development/semanticFreshness";

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function runtimeIdentity(health: JsonRecord | null) {
  const root = health ?? {};
  const product = isRecord(root.product) ? root.product : {};
  return {
    build_identity: stringValue(root.build_identity),
    instance_id: stringValue(root.instance_id),
    startup_time: stringValue(root.startup_time),
    product_id: stringValue(product.id),
    product_version: stringValue(product.version),
    profile: stringValue(product.profile),
    exposed_tool_count: numberValue(root.exposed_tool_count),
  };
}

/**
 * Stable AI-client projection. Raw Runtime health remains backend/debug evidence
 * and is intentionally not copied into the normal Gateway status contract.
 */
export function projectGatewayStatus(
  status: GatewayRuntimeStatus,
  knownSemanticRevisions?: Partial<CapabilitySemanticCatalogRevisions>
) {
  const connection =
    status.connection.state === "ready"
      ? { state: status.connection.state }
      : {
          state: status.connection.state,
          reconnect_count: status.connection.reconnect_count,
          reconnect: status.connection.reconnect,
        };
  const operations =
    status.operations.active === 0 && status.operations.queued === 0
      ? { active: 0, queued: 0 }
      : {
          active: status.operations.active,
          queued: status.operations.queued,
          max_queue_depth: status.operations.max_queue_depth,
        };

  return {
    gateway: status.gateway,
    affinity: status.affinity,
    runtime: {
      online: status.runtime.online,
      mcp_client_ready: status.runtime.mcp_client_ready,
      catalog_stale: status.runtime.catalog_stale,
      catalog_count: status.runtime.catalog_count,
      semantic_catalog_revision:
        CAPABILITY_SEMANTIC_CATALOG_REVISIONS.aggregate,
      semantic_catalog_revisions: CAPABILITY_SEMANTIC_CATALOG_REVISIONS,
      ...(knownSemanticRevisions
        ? {
            semantic_freshness: evaluateSemanticConsumerFreshness(
              CAPABILITY_SEMANTIC_CATALOG_REVISIONS,
              knownSemanticRevisions
            ),
          }
        : {}),
      identity: runtimeIdentity(status.runtime.health),
    },
    connection,
    operations,
    ...(status.last_error !== null ? { last_error: status.last_error } : {}),
  };
}
