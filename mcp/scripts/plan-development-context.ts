import { readFile } from "node:fs/promises";
import { analyzeSemanticImpact } from "../lib/semantic/impact";
import {
  indexMarkdownKnowledge,
  selectKnowledgeSections,
  type KnowledgeSelection,
} from "../lib/semantic/knowledge";
import { CAPABILITY_BRANCH_MANIFEST } from "../gateway/capabilities/manifest";
import { listExplicitSourceOwners } from "../gateway/control/sourceOwners";
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
  knowledge_sections: KnowledgeSelection[];
  read_targets: {
    source: string[];
    tests: string[];
    specialists: string[];
  };
};

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
  const symbolMap = await buildDevelopmentSymbolMap(
    input.intent,
    input.symbolMapMaxBytes ?? DEVELOPMENT_SYMBOL_MAP_PROXY_BYTES
  );
  const semanticImpact =
    input.changedPaths && input.changedPaths.length > 0
      ? analyzeSemanticImpact({
          changedPaths: input.changedPaths,
          sourceOwners: listExplicitSourceOwners(),
          manifest: CAPABILITY_BRANCH_MANIFEST,
        })
      : null;

  const routingSources = routing.source_owners.map((owner) => owner.source);
  const routingTests = routing.source_owners.flatMap((owner) =>
    owner.test_owner ? [owner.test_owner] : []
  );
  const routingSpecialists = routing.source_owners.flatMap((owner) =>
    owner.specialist ? [owner.specialist] : []
  );


  const knowledgePaths = uniqueSorted([
    ...routing.required_context_paths,
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
    query: routing.intent,
    maxTokenProxy: input.knowledgeTokenBudget ?? 1200,
  });

  return {
    schema: 1,
    intent: routing.intent,
    routing: {
      domain: routing.domain,
      confidence: routing.confidence,
      context_strategy: routing.context_strategy,
      matched_terms: routing.matched_terms,
      required_context_paths: routing.required_context_paths,
      avoid_context_classes: routing.avoid_context_classes,
    },
    symbol_map: symbolMap,
    semantic_impact: semanticImpact,
    knowledge_sections: selectedKnowledge,
    read_targets: {
      source: uniqueSorted([
        ...routingSources,
        ...(semanticImpact?.affected_sources ?? []),
      ]),
      tests: uniqueSorted([
        ...routingTests,
        ...(semanticImpact?.affected_tests ?? []),
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
