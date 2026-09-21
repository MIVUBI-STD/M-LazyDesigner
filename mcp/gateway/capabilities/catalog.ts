import {
  CAPABILITY_LIFECYCLE_SEARCH_PENALTY,
  CAPABILITY_TIER_BOOST,
  getCapabilityMetadata,
  type CapabilityTier,
} from "../../lib/capabilityMetadata";
import {
  bestSemanticMatchForTool,
  bm25CapabilityScores,
} from "./intelligence";
import { evaluateCapabilityPreconditions } from "./graph";
import type {
  BackendTool,
  CapabilitySearchContext,
  CapabilitySummary,
} from "../protocol";

export function classifyCapabilityTier(
  tool: BackendTool
): CapabilityTier {
  return getCapabilityMetadata(tool.name).tier;
}

export function summarizeCapability(
  tool: BackendTool
): CapabilitySummary {
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
  return (
    tools.find(
      (tool) => tool.name.toLowerCase() === normalized
    ) ?? null
  );
}

export function searchCapabilityCatalog(
  tools: readonly BackendTool[],
  query: string,
  limit: number,
  context?: CapabilitySearchContext
): CapabilitySummary[] {
  const exact = exactCapabilityMatch(tools, query);
  if (exact) return [summarizeCapability(exact)];

  const boundedLimit = Math.max(
    1,
    Math.min(50, Math.trunc(limit))
  );
  const hasQuery = normalizeCapabilityQuery(query).length > 0;
  const bm25Scores = bm25CapabilityScores(tools, query);

  return tools
    .map((tool) => {
      const metadata = getCapabilityMetadata(tool.name);
      const tier = metadata.tier;
      const semantic = bestSemanticMatchForTool(
        tool,
        query,
        context
      );
      const bm25 = bm25Scores.get(tool.name) ?? 0;
      const preconditions = evaluateCapabilityPreconditions(
        tool.name,
        semantic.branch,
        context?.facts
      );
      const eligibilityAdjustment =
        preconditions.eligibility === "READY"
          ? 10
          : preconditions.eligibility === "BLOCKED"
            ? -80
            : -4;

      return {
        tool,
        tier,
        semantic,
        bm25,
        preconditions,
        score:
          semantic.score +
          bm25 * 12 +
          eligibilityAdjustment +
          CAPABILITY_TIER_BOOST[tier] +
          CAPABILITY_LIFECYCLE_SEARCH_PENALTY[
            metadata.lifecycle.stage
          ],
      };
    })
    .filter(({ tier, semantic, bm25 }) =>
      hasQuery
        ? semantic.matched || bm25 > 0
        : tier !== "maintenance"
    )
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.tool.name.localeCompare(right.tool.name)
    )
    .slice(0, boundedLimit)
    .map(({ tool, semantic, preconditions }) => ({
      ...summarizeCapability(tool),
      ...(semantic.branch
        ? { branch: semantic.branch }
        : {}),
      ...(hasQuery && semantic.matched && semantic.reason
        ? { why: semantic.reason }
        : {}),
      ...(preconditions.eligibility !== "READY"
        ? {
            eligibility: preconditions.eligibility,
            ...(preconditions.missing.length > 0
              ? { requires: preconditions.missing }
              : preconditions.unknown.length > 0
                ? { requires: preconditions.unknown }
                : {}),
            ...(preconditions.predecessor
              ? { predecessor: preconditions.predecessor }
              : {}),
          }
        : {}),
    }));
}
