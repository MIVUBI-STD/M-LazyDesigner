import {
  CAPABILITY_LIFECYCLE_SEARCH_PENALTY,
  CAPABILITY_TIER_BOOST,
  getCapabilityMetadata,
  type CapabilityTier,
} from "../../lib/capabilities/metadata";
import {
  bestSemanticMatchForTool,
  bm25CapabilityScores,
} from "./intelligence";
import { evaluateCapabilityPreconditions } from "./graph";
import type {
  BackendTool,
  CapabilitySearchContext,
  CapabilitySummary,
} from "../contracts/protocol";

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


/**
 * Generic agent/tool vocabulary may affect BM25 ranking but cannot, by
 * itself, make an authoring capability relevant to a discovery query.
 */
const NON_DECISIVE_QUERY_TERMS = new Set([
  "a", "an", "and", "apa", "are", "bagaimana", "can", "capability",
  "capabilities", "cara", "dan", "dengan", "developer", "do", "for",
  "how", "in", "ini", "is", "me", "of", "on", "please", "saya",
  "that", "the", "this", "to", "tolong", "tool", "tools",
  "action", "actions", "untuk", "with", "yang", "you",
]);

function substantiveQueryTerms(query: string): string[] {
  return [...new Set(
    query.toLowerCase().split(/[^a-z0-9]+/).filter(
      (term) => term.length > 2 && !NON_DECISIVE_QUERY_TERMS.has(term)
    )
  )];
}

function hasSubstantiveCatalogEvidence(
  tool: BackendTool,
  aliases: readonly string[],
  queryTerms: readonly string[]
): boolean {
  const indexed = new Set(
    [tool.name, tool.description ?? "", ...aliases]
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );
  return queryTerms.some(
    (term) => indexed.has(term) ||
      (term.endsWith("s") && indexed.has(term.slice(0, -1))) ||
      indexed.has(`${term}s`)
  );
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

function normalizedIdentifier(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function singularIdentifier(value: string): string {
  return value
    .split("_")
    .map((part) =>
      part.length > 3 && part.endsWith("s")
        ? part.slice(0, -1)
        : part
    )
    .join("_");
}

function nearCapabilityNameScore(
  toolName: string,
  query: string
): number {
  const tool = normalizedIdentifier(toolName);
  const candidate = normalizedIdentifier(query);
  if (!tool || !candidate) return 0;
  if (tool === candidate) return 100;
  if (singularIdentifier(tool) === singularIdentifier(candidate)) {
    return 36;
  }
  return 0;
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
  const queryTerms = substantiveQueryTerms(query);
  const bm25Scores = bm25CapabilityScores(tools, query);
  // Lexical relevance is a bounded secondary signal, not an intent override.
  const maxBm25 = Math.max(1, ...bm25Scores.values());

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
      const nearName = nearCapabilityNameScore(tool.name, query);
      const preconditions = evaluateCapabilityPreconditions(
        tool.name,
        semantic.branch,
        context?.facts
      );
      // Readiness is a secondary decision signal, not an intent override.
      // A blocked exact branch must remain ahead of a semantically weaker
      // predecessor so the client can see BLOCKED + predecessor explicitly.
      const eligibilityAdjustment =
        preconditions.eligibility === "READY"
          ? 4
          : preconditions.eligibility === "BLOCKED"
            ? -6
            : -2;

      return {
        tool,
        tier,
        metadata,
        semantic,
        bm25,
        nearName,
        preconditions,
        score:
          semantic.score +
          (bm25 / maxBm25) * 12 +
          nearName +
          eligibilityAdjustment +
          CAPABILITY_TIER_BOOST[tier] +
          CAPABILITY_LIFECYCLE_SEARCH_PENALTY[
            metadata.lifecycle.stage
          ],
      };
    })
    .filter(({ tool, tier, metadata, semantic, nearName }) => {
      if (metadata.discoveryMode === "exact_only") return false;
      if (!hasQuery) return tier !== "maintenance";
      if (nearName > 0) return true;
      // An unsupported console/DevTools-style query must yield no match;
      // incidental occurrences of "tool" or "action" are not intent proof.
      if (queryTerms.length === 0) return false;
      // Semantic intent/object evidence avoids additional metadata tokenization
      // on the common relevant path. A generic verb alone is insufficient.
      if (semantic.matched &&
        (semantic.reason.includes("intent") || semantic.reason.includes("object"))) {
        return true;
      }
      return hasSubstantiveCatalogEvidence(
        tool, metadata.searchAliases, queryTerms
      );
    })
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