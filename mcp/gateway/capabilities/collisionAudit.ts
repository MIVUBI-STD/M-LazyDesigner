import { CAPABILITY_CORE_MANIFEST } from "../../lib/capabilities/manifest";
import { CAPABILITY_BRANCH_MANIFEST } from "./manifest";

export type SemanticCollisionKind =
  | "SEARCH_ALIAS"
  | "SEMANTIC_INTENT"
  | "SEMANTIC_EXAMPLE";

export type SemanticCollision = {
  kind: SemanticCollisionKind;
  fingerprint: string;
  capabilities: string[];
  phrases: string[];
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "of",
  "the",
  "to",
  "with",
]);

function phraseFingerprint(value: string): string {
  return [
    ...new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter((token) => token.length > 0 && !STOP_WORDS.has(token))
    ),
  ]
    .sort((left, right) => left.localeCompare(right))
    .join(" ");
}

function collisionsForPhrases(
  kind: SemanticCollisionKind,
  entries: readonly { capability: string; phrase: string }[]
): SemanticCollision[] {
  const byFingerprint = new Map<
    string,
    { capabilities: Set<string>; phrases: Set<string> }
  >();

  for (const entry of entries) {
    const fingerprint = phraseFingerprint(entry.phrase);
    if (!fingerprint) continue;
    const current =
      byFingerprint.get(fingerprint) ??
      { capabilities: new Set<string>(), phrases: new Set<string>() };
    current.capabilities.add(entry.capability);
    current.phrases.add(entry.phrase);
    byFingerprint.set(fingerprint, current);
  }

  return [...byFingerprint.entries()]
    .filter(([, value]) => value.capabilities.size > 1)
    .map(([fingerprint, value]) => ({
      kind,
      fingerprint,
      capabilities: [...value.capabilities].sort((a, b) =>
        a.localeCompare(b)
      ),
      phrases: [...value.phrases].sort((a, b) => a.localeCompare(b)),
    }))
    .sort(
      (left, right) =>
        left.kind.localeCompare(right.kind) ||
        left.fingerprint.localeCompare(right.fingerprint)
    );
}

export function auditCapabilitySemanticCollisions(): SemanticCollision[] {
  const aliasEntries = [...CAPABILITY_CORE_MANIFEST.entries()].flatMap(
    ([capability, entry]) =>
      (entry.aliases ?? []).map((phrase) => ({ capability, phrase }))
  );

  const intentEntries = CAPABILITY_BRANCH_MANIFEST.flatMap((entry) =>
    (entry.semantic?.intents ?? []).map((phrase) => ({
      capability: entry.capability,
      phrase,
    }))
  );

  const exampleEntries = CAPABILITY_BRANCH_MANIFEST.flatMap((entry) =>
    (entry.semantic?.examples ?? []).map((phrase) => ({
      capability: entry.capability,
      phrase,
    }))
  );

  return [
    ...collisionsForPhrases("SEARCH_ALIAS", aliasEntries),
    ...collisionsForPhrases("SEMANTIC_INTENT", intentEntries),
    ...collisionsForPhrases("SEMANTIC_EXAMPLE", exampleEntries),
  ];
}
