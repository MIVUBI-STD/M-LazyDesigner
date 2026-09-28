import { readFile } from "node:fs/promises";
import { analyzeSemanticImpact } from "../gateway/development/impact";
import {
  indexMarkdownKnowledge,
  selectKnowledgeSections,
  type KnowledgeSelection,
} from "../lib/semantic/knowledge";
import { CAPABILITY_BRANCH_MANIFEST } from "../gateway/capabilities/manifest";
import { CAPABILITY_SEMANTIC_CATALOG_REVISIONS } from "../gateway/capabilities/semanticRegistry";
import {
  anchorTestForSourceOwner,
  authoringDomainForCapability,
  listExplicitSourceOwners,
} from "../gateway/control/sourceOwners";
import { resolveDevelopmentIntent } from "../gateway/control/developmentIntent";
import {
  buildDevelopmentSymbolMap,
  DEVELOPMENT_SYMBOL_MAP_PROXY_BYTES,
} from "./build-development-symbol-map";

export type DevelopmentContextPlan = {
  schema: 1;
  intent: string;
  routing: {
    domain: string;
    confidence: string;
    context_strategy: string;
    matched_terms: string[];
    required_context_paths: string[];
    avoid_context_classes: string[];
  };
  symbol_map: Awaited<ReturnType<typeof buildDevelopmentSymbolMap>>;
  semantic_impact: ReturnType<typeof analyzeSemanticImpact> | null;
  semantic_catalog_revisions: typeof CAPABILITY_SEMANTIC_CATALOG_REVISIONS;
  knowledge_sections: KnowledgeSelection[];
  read_targets: {
    source: string[];
    anchor_tests: string[];
    specialists: string[];
  };
};

function developmentDomainForCapability(
  capability: string
): "GEOMETRY" | "TEXTURING" | "ANIMATION" | "PARTICLE" | null {
  if (capability === "manage_particle" || capability === "inspect_particle") {
    return "PARTICLE";
  }
  const domain = authoringDomainForCapability(capability);
  return domain === "GEOMETRY" ||
      domain === "TEXTURING" ||
      domain === "ANIMATION"
    ? domain
    : null;
}

function directEvidenceDomain(
  directCapabilities: readonly string[]
): "GEOMETRY" | "TEXTURING" | "ANIMATION" | "PARTICLE" | null {
  const domains = new Set(
    directCapabilities
      .map(developmentDomainForCapability)
      .filter(
        (
          value
        ): value is "GEOMETRY" | "TEXTURING" | "ANIMATION" | "PARTICLE" =>
          value !== null
      )
  );
  return domains.size === 1 ? [...domains][0] : null;
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export async function buildDevelopmentContextPlan(input: {
  intent: string;
  changedPaths?: readonly string[];
  symbolMapMaxBytes?: number;
  knowledgeTokenBudget?: number;
}): Promise<DevelopmentContextPlan> {
  const routing = resolveDevelopmentIntent(input.intent);
  const sourceOwners = listExplicitSourceOwners();
  const symbolMap = await buildDevelopmentSymbolMap(
    input.intent,
    input.symbolMapMaxBytes ?? DEVELOPMENT_SYMBOL_MAP_PROXY_BYTES
  );
  const semanticImpact =
    input.changedPaths && input.changedPaths.length > 0
      ? analyzeSemanticImpact({
          changedPaths: input.changedPaths,
          sourceOwners,
          manifest: CAPABILITY_BRANCH_MANIFEST,
        })
      : null;

  const evidenceDomain = semanticImpact
    ? directEvidenceDomain(semanticImpact.direct_capabilities)
    : null;
  const evidenceOwners = semanticImpact
    ? semanticImpact.direct_capabilities
        .map((capability) => sourceOwners[capability])
        .filter((owner): owner is NonNullable<typeof owner> => owner != null)
    : [];
  const effectiveRouting =
    routing.confidence !== "EXACT" && evidenceDomain
      ? {
          ...routing,
          domain: evidenceDomain,
          confidence: "EXACT" as const,
          context_strategy: "DIRECT_SOURCE_OWNERS" as const,
          matched_terms: semanticImpact!.direct_capabilities.map(
            (capability) => `changed-owner:${capability}`
          ),
          source_owners: evidenceOwners,
          required_context_paths: [
            ...new Set([
              "AGENTS.md",
              "mcp/AGENTS.md",
              ...evidenceOwners.flatMap((owner) =>
                owner.specialist ? [owner.specialist] : []
              ),
            ]),
          ],
        }
      : routing;

  const routingSources = effectiveRouting.source_owners.map((owner) => owner.source);
  const routingAnchorTests = effectiveRouting.source_owners.flatMap((owner) => {
    const anchorTest = anchorTestForSourceOwner(owner);
    return anchorTest ? [anchorTest] : [];
  });
  const routingSpecialists = effectiveRouting.source_owners.flatMap((owner) =>
    owner.specialist ? [owner.specialist] : []
  );


  const knowledgePaths = uniqueSorted([
    ...effectiveRouting.required_context_paths,
    ...routingSpecialists,
    ...(semanticImpact?.affected_specialists ?? []),
  ]).filter((path) => /\.md$/i.test(path));

  const knowledgeSections = (
    await Promise.all(
      knowledgePaths.map(async (path) => {
        const localPath = path.startsWith("mcp/")
          ? path.slice(4)
          : `../${path}`;
        try {
          return indexMarkdownKnowledge(path, await readFile(localPath, "utf8"));
        } catch {
          return [];
        }
      })
    )
  ).flat();

  const selectedKnowledge = selectKnowledgeSections({
    sections: knowledgeSections,
    query: effectiveRouting.intent,
    maxTokenProxy: input.knowledgeTokenBudget ?? 1200,
  });

  return {
    schema: 1,
    intent: effectiveRouting.intent,
    routing: {
      domain: effectiveRouting.domain,
      confidence: effectiveRouting.confidence,
      context_strategy: effectiveRouting.context_strategy,
      matched_terms: effectiveRouting.matched_terms,
      required_context_paths: effectiveRouting.required_context_paths,
      avoid_context_classes: effectiveRouting.avoid_context_classes,
    },
    symbol_map: symbolMap,
    semantic_impact: semanticImpact,
    semantic_catalog_revisions:
      CAPABILITY_SEMANTIC_CATALOG_REVISIONS,
    knowledge_sections: selectedKnowledge,
    read_targets: {
      source: uniqueSorted([
        ...routingSources,
        ...(semanticImpact?.affected_sources ?? []),
      ]),
      anchor_tests: uniqueSorted([
        ...routingAnchorTests,
        ...(semanticImpact?.affected_anchor_tests ?? []),
      ]),
      specialists: uniqueSorted([
        ...routingSpecialists,
        ...(semanticImpact?.affected_specialists ?? []),
      ]),
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const separator = args.indexOf("--changed");
  const intentParts = separator >= 0 ? args.slice(0, separator) : args;
  const changedPaths = separator >= 0 ? args.slice(separator + 1) : [];
  const intent = intentParts.join(" ").trim();

  if (!intent) {
    throw new Error(
      'Usage: bun run plan:development-context -- "<intent>" [--changed <path> ...]'
    );
  }

  console.log(
    JSON.stringify(
      await buildDevelopmentContextPlan({
        intent,
        changedPaths,
      }),
      null,
      2
    )
  );
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
