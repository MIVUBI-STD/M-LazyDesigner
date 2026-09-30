import { CAPABILITY_CORE_MANIFEST } from "../../lib/capabilities/manifest";
import type { DevelopmentSourceOwner } from "./types";
import {
  anchorTestForSourceOwner,
  authoringDomainForCapability,
  listExplicitSourceOwners,
  sourceOwnerForCapability,
} from "./sourceOwners";

export type DevelopmentDomain =
  | "GEOMETRY"
  | "TEXTURING"
  | "ANIMATION"
  | "PARTICLE"
  | "GATEWAY"
  | "PROJECT_AFFINITY"
  | "BUILD_SYNC"
  | "RUNTIME"
  | "UNRESOLVED";

export type DevelopmentResolution = {
  task_class: "SYSTEM_DEVELOPMENT";
  intent: string;
  domain: DevelopmentDomain;
  confidence: "EXACT" | "STRONG" | "AMBIGUOUS" | "UNRESOLVED";
  context_strategy:
    | "DIRECT_SOURCE_OWNERS"
    | "BOUNDED_SYMBOL_MAP"
    | "TARGETED_SEARCH";
  matched_terms: string[];
  source_owners: DevelopmentSourceOwner[];
  required_context_paths: string[];
  avoid_context_classes: string[];
};

export type ControlDevelopmentDomain = DevelopmentDomain;
export type ControlDevelopmentResolution = DevelopmentResolution;

type Rule = {
  domain: Exclude<DevelopmentDomain, "UNRESOLVED">;
  terms: readonly string[];
  owners: () => DevelopmentSourceOwner[];
};

const BASE_CONTEXT = ["AGENTS.md", "mcp/AGENTS.md"] as const;

const owner = (
  source: string,
  anchor_test: string | null = null,
  specialist: string | null = null
): DevelopmentSourceOwner => ({ source, specialist, anchor_test });

const uniqueOwners = (owners: readonly DevelopmentSourceOwner[]): DevelopmentSourceOwner[] => {
  const seen = new Set<string>();
  return owners.filter((entry) => {
    const key = `${entry.source}|${entry.specialist ?? ""}|${anchorTestForSourceOwner(entry) ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const RULES: readonly Rule[] = [
  {
    domain: "ANIMATION",
    terms: ["animation", "animasi", "keyframe", "timeline", "motion", "gerak", "stiff", "kaku", "controller", "easing", "playback"],
    owners: () => [
      sourceOwnerForCapability("manage_animation_timeline"),
      owner("mcp/lib/animation/motionDynamics.ts", "mcp/tests/animation-native-intelligence.test.ts", ".agents/skills/lazydesigner-animation/SKILL.md"),
      owner("mcp/lib/animation/quality.ts", "mcp/tests/quality-intelligence.test.ts", ".agents/skills/lazydesigner-animation/SKILL.md"),
      sourceOwnerForCapability("manage_animation_controller"),
      sourceOwnerForCapability("manage_animation_effects"),
    ],
  },
  {
    domain: "TEXTURING",
    terms: ["texture", "texturing", "tekstur", "paint", "painter", "uv", "atlas", "material", "pbr", "pixel", "alpha", "seam", "palette"],
    owners: () => [
      sourceOwnerForCapability("create_texture"),
      sourceOwnerForCapability("paint_with_brush"),
      sourceOwnerForCapability("manage_material_instances"),
    ],
  },
  {
    domain: "GEOMETRY",
    terms: ["geometry", "geometri", "cube", "cuboid", "shape", "bentuk", "model shape", "floating", "melayang", "pivot", "hierarchy", "bone", "rig", "rigging", "silhouette", "proportion"],
    owners: () => [
      sourceOwnerForCapability("manage_cubes"),
      sourceOwnerForCapability("capture_model_views"),
      sourceOwnerForCapability("bone_rigging"),
    ],
  },
  {
    domain: "PARTICLE",
    terms: ["particle", "particles", "partikel", "snowstorm"],
    owners: () => [
      sourceOwnerForCapability("manage_particle"),
      owner("mcp/lib/particle/semantics.ts", "mcp/tests/particle-advanced-semantics.test.ts"),
    ],
  },
  {
    domain: "PROJECT_AFFINITY",
    terms: ["affinity", "project binding", "project tab", "tab blockbench", "wrong project", "salah project", "project context"],
    owners: () => [
      owner("mcp/gateway/runtime/backend.ts", "mcp/tests/project-affinity-gateway.test.ts"),
      owner("mcp/server/net.ts", "mcp/tests/project-affinity-runtime.test.ts"),
    ],
  },
  {
    domain: "BUILD_SYNC",
    terms: ["dev:sync", "hot reload", "live sync", "stale build", "build identity", "deploy", "rebuild", "plugin reload"],
    owners: () => [
      owner("mcp/build/index.ts", "mcp/tests/developer-loop.test.ts"),
      owner("mcp/build/watch-policy.ts", "mcp/tests/developer-loop.test.ts"),
      owner("mcp/scripts/operations/deploy-local.ts", "mcp/tests/developer-loop.test.ts"),
    ],
  },
  {
    domain: "GATEWAY",
    terms: ["gateway", "stdio", "capability catalog", "search_capabilities", "describe_capability", "invoke_capability", "control", "control layer", "routing", "continuation", "navigator"],
    owners: () => [
      owner("mcp/gateway/control/packet.ts", "mcp/tests/gateway-control-active-contract.test.ts"),
      owner("mcp/gateway/control/routingPolicy.ts", "mcp/tests/gateway-control-routing.test.ts"),
      owner("mcp/gateway/control/delta/engine.ts", "mcp/tests/gateway-control-continuation-hardening.test.ts"),
      owner("mcp/gateway/index.ts", "mcp/tests/gateway-contract.test.ts"),
      owner("mcp/gateway/runtime/backend.ts", "mcp/tests/gateway-reliability-hardening.test.ts"),
      owner("mcp/gateway/contracts/protocol.ts", "mcp/tests/gateway-contract.test.ts"),
    ],
  },
  {
    domain: "RUNTIME",
    terms: ["runtime", "blockbench api", "plugin lifecycle", "undo", "persistence", "native blockbench", "runtime error", "onload", "onunload"],
    owners: () => [
      owner("mcp/index.ts", "mcp/tests/plugin-runtime-cleanup.test.ts"),
      owner("mcp/lib/runtime/lifecycle.ts", "mcp/tests/runtime-lifecycle.test.ts"),
      owner("mcp/server/server.ts", "mcp/tests/authoring-phase-surface.test.ts"),
    ],
  },
];

function normalizedIntent(intent: string): string {
  return intent
    .trim()
    .toLocaleLowerCase()
    .replaceAll("\\", "/")
    .replace(/\/{2,}/g, "/");
}

function matches(text: string, term: string): boolean {
  const normalizedTerm = term.toLocaleLowerCase();
  let offset = 0;

  while (offset <= text.length - normalizedTerm.length) {
    const index = text.indexOf(normalizedTerm, offset);
    if (index < 0) return false;

    const before = index > 0 ? text[index - 1] : "";
    const afterIndex = index + normalizedTerm.length;
    const after = afterIndex < text.length ? text[afterIndex] : "";
    const beforeIsWord = /[a-z0-9_]/i.test(before);
    const afterIsWord = /[a-z0-9_]/i.test(after);

    if (!beforeIsWord && !afterIsWord) return true;
    offset = index + 1;
  }

  return false;
}

function exactDevelopmentDomain(
  capability: string
): Exclude<DevelopmentDomain, "UNRESOLVED"> | null {
  if (capability === "manage_particle" || capability === "inspect_particle") {
    return "PARTICLE";
  }

  const domain = authoringDomainForCapability(capability);
  if (domain === "GEOMETRY" || domain === "TEXTURING" || domain === "ANIMATION") {
    return domain;
  }
  return null;
}

type ExactDevelopmentEvidence = {
  domain: Exclude<DevelopmentDomain, "UNRESOLVED">;
  owner: DevelopmentSourceOwner;
  term: string;
};

function exactCapabilityEvidence(text: string): ExactDevelopmentEvidence[] {
  return [...CAPABILITY_CORE_MANIFEST.keys()]
    .filter((capability) => matches(text, capability))
    .flatMap((capability) => {
      const domain = exactDevelopmentDomain(capability);
      if (!domain) return [];
      return [{
        domain,
        owner: sourceOwnerForCapability(capability),
        term: capability,
      }];
    });
}

function exactPathEvidence(text: string): ExactDevelopmentEvidence[] {
  const evidence: ExactDevelopmentEvidence[] = [];

  for (const [capability, owner] of Object.entries(listExplicitSourceOwners())) {
    const domain = exactDevelopmentDomain(capability);
    if (!domain) continue;
    const anchorTest = anchorTestForSourceOwner(owner);
    for (const path of [owner.source, anchorTest].filter(
      (value): value is string => Boolean(value)
    )) {
      if (matches(text, path)) {
        evidence.push({
          domain,
          owner,
          term: `path:${path}`,
        });
      }
    }
  }

  for (const rule of RULES) {
    for (const owner of rule.owners()) {
      const anchorTest = anchorTestForSourceOwner(owner);
      for (const path of [owner.source, anchorTest].filter(
        (value): value is string => Boolean(value)
      )) {
        if (matches(text, path)) {
          evidence.push({
            domain: rule.domain,
            owner,
            term: `path:${path}`,
          });
        }
      }
    }
  }

  return evidence;
}

function exactEvidenceResolution(
  intent: string,
  text: string
): DevelopmentResolution | null {
  const evidence = [
    ...exactCapabilityEvidence(text),
    ...exactPathEvidence(text),
  ];
  if (evidence.length === 0) return null;

  const domains = [...new Set(evidence.map((entry) => entry.domain))];
  const owners = uniqueOwners(evidence.map((entry) => entry.owner)).slice(0, 8);
  const matchedTerms = [...new Set(evidence.map((entry) => entry.term))].sort();
  const specialistPaths = owners
    .map((entry) => entry.specialist)
    .filter((value): value is string => Boolean(value));

  if (domains.length === 1) {
    return {
      task_class: "SYSTEM_DEVELOPMENT",
      intent,
      domain: domains[0],
      confidence: "EXACT",
      context_strategy: "DIRECT_SOURCE_OWNERS",
      matched_terms: matchedTerms,
      source_owners: owners,
      required_context_paths: [
        ...new Set([...BASE_CONTEXT, ...specialistPaths]),
      ],
      avoid_context_classes: [
        "asset workspace history",
        "unrelated authoring docs",
        "unrelated Runtime schemas",
      ],
    };
  }

  return {
    task_class: "SYSTEM_DEVELOPMENT",
    intent,
    domain: "UNRESOLVED",
    confidence: "AMBIGUOUS",
    context_strategy: "BOUNDED_SYMBOL_MAP",
    matched_terms: matchedTerms,
    source_owners: owners,
    required_context_paths: [...BASE_CONTEXT],
    avoid_context_classes: [
      "asset workspace history",
      "unrelated authoring docs",
    ],
  };
}

function baseResolution(intent: string): DevelopmentResolution {
  return {
    task_class: "SYSTEM_DEVELOPMENT",
    intent,
    domain: "UNRESOLVED",
    confidence: "UNRESOLVED",
    context_strategy: "TARGETED_SEARCH",
    matched_terms: [],
    source_owners: [],
    required_context_paths: [...BASE_CONTEXT],
    avoid_context_classes: ["asset workspace history", "unrelated authoring docs", "unrelated Runtime schemas"],
  };
}

export function resolveDevelopmentIntent(intent: string): DevelopmentResolution {
  const normalized = normalizedIntent(intent);
  if (!normalized) return baseResolution("");

  const exact = exactEvidenceResolution(intent.trim(), normalized);
  if (exact) return exact;

  const scored = RULES.map((rule) => {
    const matched = rule.terms.filter((term) => matches(normalized, term));
    return { rule, matched, score: matched.length };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return baseResolution(intent.trim());

  const best = scored[0];
  const tied = scored.filter((entry) => entry.score === best.score);
  if (tied.length > 1) {
    return {
      task_class: "SYSTEM_DEVELOPMENT",
      intent: intent.trim(),
      domain: "UNRESOLVED",
      confidence: "AMBIGUOUS",
      context_strategy: "BOUNDED_SYMBOL_MAP",
      matched_terms: [...new Set(tied.flatMap((entry) => entry.matched))],
      source_owners: uniqueOwners(tied.flatMap((entry) => entry.rule.owners())).slice(0, 8),
      required_context_paths: [...BASE_CONTEXT],
      avoid_context_classes: ["asset workspace history", "unrelated authoring docs"],
    };
  }

  const owners = uniqueOwners(best.rule.owners()).slice(0, 6);
  const specialistPaths = owners
    .map((entry) => entry.specialist)
    .filter((value): value is string => Boolean(value));

  return {
    task_class: "SYSTEM_DEVELOPMENT",
    intent: intent.trim(),
    domain: best.rule.domain,
    confidence: "STRONG",
    context_strategy: "DIRECT_SOURCE_OWNERS",
    matched_terms: best.matched,
    source_owners: owners,
    required_context_paths: [...new Set([...BASE_CONTEXT, ...specialistPaths])],
    avoid_context_classes: ["asset workspace history", "unrelated authoring docs", "unrelated Runtime schemas"],
  };
}