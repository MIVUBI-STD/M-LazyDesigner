import { classifyMcpToolPhaseByName } from "../lib/authoringPhase";
import { getCapabilityMetadata } from "../lib/capabilityMetadata";
import type { BackendTool } from "./contract";
import {
  CAPABILITY_BRANCH_MANIFEST,
  type CapabilityBranchHint,
  type CapabilitySemanticSpec,
} from "./capabilityManifest";

export type { CapabilityBranchHint } from "./capabilityManifest";

export type CapabilityRoutingContext = {
  authoringPhase?: "geometry" | "texturing" | "animation" | null;
};

export type CapabilitySemanticEntry = {
  capability: string;
  branch?: CapabilityBranchHint;
  intents: readonly string[];
  nouns?: readonly string[];
  verbs?: readonly string[];
  excludes?: readonly string[];
  examples?: readonly string[];
};

export type CapabilitySemanticMatch = {
  capability: string;
  branch?: CapabilityBranchHint;
  score: number;
  matched: boolean;
  reason: string;
};

function semanticEntriesForTool(name: string): CapabilitySemanticEntry[] {
  return CAPABILITY_BRANCH_MANIFEST
    .filter((entry) => entry.capability === name && entry.semantic)
    .map((entry) => ({
      capability: entry.capability,
      ...(entry.branch ? { branch: entry.branch } : {}),
      ...(entry.semantic as CapabilitySemanticSpec),
    }));
}

const SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  proportions: ["size", "dimensions", "scale", "length", "width", "height", "thickness"],
  resize: ["scale", "dimensions", "proportions", "bigger", "smaller", "taller", "shorter", "wider", "narrower"],
  taller: ["resize", "lengthen", "height", "proportions"],
  shorter: ["resize", "shorten", "height", "proportions"],
  wider: ["resize", "width", "proportions"],
  narrower: ["resize", "width", "proportions"],
  move: ["position", "translate", "shift", "geser"],
  rotate: ["rotation", "turn"],
  texture: ["paint", "color", "colour", "pixel", "material"],
  gradient: ["shade", "blend", "transition"],
  uv: ["mapping", "unwrap", "island", "atlas", "texel"],
  animation: ["animate", "timeline", "keyframe", "motion"],
  hierarchy: ["parent", "reparent", "bone", "group"],
  under: ["parent", "reparent", "hierarchy"],
  child: ["parent", "reparent", "hierarchy"],
  inspect: ["check", "read", "measure", "find"],
  create: ["add", "make", "build", "new"],
};

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function expandedTokens(query: string): Set<string> {
  const base = normalize(query);
  const out = new Set(base);
  for (const token of base) {
    for (const synonym of SYNONYMS[token] ?? []) {
      for (const expanded of normalize(synonym)) out.add(expanded);
    }
  }
  return out;
}

function entryText(entry: CapabilitySemanticEntry): {
  intent: Set<string>;
  noun: Set<string>;
  verb: Set<string>;
  exclude: Set<string>;
  example: Set<string>;
} {
  return {
    intent: new Set(normalize(entry.intents.join(" "))),
    noun: new Set(normalize((entry.nouns ?? []).join(" "))),
    verb: new Set(normalize((entry.verbs ?? []).join(" "))),
    exclude: new Set(normalize((entry.excludes ?? []).join(" "))),
    example: new Set(normalize((entry.examples ?? []).join(" "))),
  };
}

function overlap(tokens: Set<string>, field: Set<string>, weight: number): number {
  let value = 0;
  for (const token of tokens) if (field.has(token)) value += weight;
  return value;
}

function phaseBoost(capability: string, context?: CapabilityRoutingContext): number {
  const active = context?.authoringPhase;
  if (!active) return 0;
  const phase = classifyMcpToolPhaseByName(capability);
  if (!phase || phase === "core") return 2;
  return phase === active ? 18 : -8;
}

function genericCapabilityScore(
  tool: BackendTool,
  tokens: Set<string>
): number {
  const metadata = getCapabilityMetadata(tool.name);
  const name = new Set(normalize(tool.name.replace(/[_.\/-]+/g, " ")));
  const description = new Set(normalize(tool.description ?? ""));
  const aliases = new Set(normalize(metadata.searchAliases.join(" ")));

  let score = overlap(tokens, name, 14);
  score += overlap(tokens, aliases, 10);
  score += overlap(tokens, description, 4);
  return score;
}


function bm25Tokens(text: string): string[] {
  return normalize(text).filter((token) => token.length > 1);
}

export function bm25CapabilityScores(
  tools: readonly BackendTool[],
  query: string
): ReadonlyMap<string, number> {
  const documents = tools.map((tool) => {
    const metadata = getCapabilityMetadata(tool.name);
    return bm25Tokens([
      tool.name,
      tool.name,
      tool.description ?? "",
      metadata.searchAliases.join(" "),
    ].join(" "));
  });
  const queryTokens = [...expandedTokens(query)];
  if (queryTokens.length === 0 || documents.length === 0) return new Map();

  const documentFrequencies = new Map<string, number>();
  for (const tokens of documents) {
    for (const token of new Set(tokens)) {
      documentFrequencies.set(token, (documentFrequencies.get(token) ?? 0) + 1);
    }
  }

  const averageLength =
    documents.reduce((sum, tokens) => sum + tokens.length, 0) /
    Math.max(documents.length, 1);
  const k1 = 1.2;
  const b = 0.75;
  const scores = new Map<string, number>();

  tools.forEach((tool, index) => {
    const tokens = documents[index] ?? [];
    const frequencies = new Map<string, number>();
    for (const token of tokens) {
      frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    }

    let score = 0;
    for (const token of queryTokens) {
      const frequency = frequencies.get(token) ?? 0;
      if (frequency === 0) continue;
      const documentFrequency = documentFrequencies.get(token) ?? 0;
      const idf = Math.log(
        1 +
          (tools.length - documentFrequency + 0.5) /
            (documentFrequency + 0.5)
      );
      const normalization =
        1 - b + b * (tokens.length / Math.max(averageLength, 1));
      score +=
        idf *
        ((frequency * (k1 + 1)) /
          (frequency + k1 * normalization));
    }
    scores.set(tool.name, score);
  });

  return scores;
}

export function semanticMatchesForTool(
  tool: BackendTool,
  query: string,
  context?: CapabilityRoutingContext
): CapabilitySemanticMatch[] {
  const queryTokens = expandedTokens(query);
  const entries = semanticEntriesForTool(tool.name);

  if (entries.length === 0) {
    const evidence = genericCapabilityScore(tool, queryTokens);
    return [{
      capability: tool.name,
      score: evidence + phaseBoost(tool.name, context),
      matched: evidence > 0,
      reason: evidence > 0 ? "capability metadata match" : "no semantic match",
    }];
  }

  return entries.map((entry) => {
    const text = entryText(entry);
    const genericEvidence = genericCapabilityScore(tool, queryTokens);
    const intentEvidence = overlap(queryTokens, text.intent, 12);
    const verbEvidence = overlap(queryTokens, text.verb, 9);
    const nounEvidence = overlap(queryTokens, text.noun, 7);
    const exampleEvidence = overlap(queryTokens, text.example, 5);
    const positiveEvidence =
      genericEvidence + intentEvidence + verbEvidence + nounEvidence + exampleEvidence;
    let score = positiveEvidence;
    score -= overlap(queryTokens, text.exclude, 12);
    if (positiveEvidence > 0) score += phaseBoost(tool.name, context);

    const reasonParts: string[] = [];
    if (overlap(queryTokens, text.intent, 1) > 0) reasonParts.push("intent");
    if (overlap(queryTokens, text.verb, 1) > 0) reasonParts.push("action");
    if (overlap(queryTokens, text.noun, 1) > 0) reasonParts.push("object");
    if (
      positiveEvidence > 0 &&
      context?.authoringPhase &&
      phaseBoost(tool.name, context) > 0
    ) {
      reasonParts.push("active phase");
    }

    return {
      capability: entry.capability,
      ...(entry.branch ? { branch: entry.branch } : {}),
      score,
      matched: positiveEvidence > 0,
      reason: reasonParts.length > 0 ? reasonParts.join("+") : "no semantic match",
    };
  });
}

export function bestSemanticMatchForTool(
  tool: BackendTool,
  query: string,
  context?: CapabilityRoutingContext
): CapabilitySemanticMatch {
  return semanticMatchesForTool(tool, query, context)
    .sort((a, b) => b.score - a.score)[0]!;
}

export function listCapabilitySemantics(): readonly CapabilitySemanticEntry[] {
  return CAPABILITY_BRANCH_MANIFEST
    .filter((entry) => entry.semantic)
    .map((entry) => ({
      capability: entry.capability,
      ...(entry.branch ? { branch: entry.branch } : {}),
      ...(entry.semantic as CapabilitySemanticSpec),
    }));
}

