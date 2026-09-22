import type { ControlSourceOwner } from "./types";
import { sourceOwnerForCapability } from "./sourceOwners";

export type ControlDevelopmentDomain =
  | "GEOMETRY"
  | "TEXTURING"
  | "ANIMATION"
  | "PARTICLE"
  | "GATEWAY"
  | "PROJECT_AFFINITY"
  | "BUILD_SYNC"
  | "RUNTIME"
  | "UNRESOLVED";

export type ControlDevelopmentResolution = {
  task_class: "SYSTEM_DEVELOPMENT";
  intent: string;
  domain: ControlDevelopmentDomain;
  confidence: "STRONG" | "AMBIGUOUS" | "UNRESOLVED";
  context_strategy:
    | "DIRECT_SOURCE_OWNERS"
    | "BOUNDED_SYMBOL_MAP"
    | "TARGETED_SEARCH";
  matched_terms: string[];
  source_owners: ControlSourceOwner[];
  required_context_paths: string[];
  avoid_context_classes: string[];
};

type Rule = {
  domain: Exclude<ControlDevelopmentDomain, "UNRESOLVED">;
  terms: readonly string[];
  owners: () => ControlSourceOwner[];
};

const BASE_CONTEXT = ["AGENTS.md", "mcp/AGENTS.md"] as const;

const owner = (
  source: string,
  test_owner: string | null = null,
  specialist: string | null = null
): ControlSourceOwner => ({ source, specialist, test_owner });

const uniqueOwners = (owners: readonly ControlSourceOwner[]): ControlSourceOwner[] => {
  const seen = new Set<string>();
  return owners.filter((entry) => {
    const key = `${entry.source}|${entry.specialist ?? ""}|${entry.test_owner ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const RULES: readonly Rule[] = [
  {
    domain: "ANIMATION",
    terms: ["animation", "animasi", "keyframe", "timeline", "motion", "gerak", "stiff", "kaku", "controller", "rigging", "easing", "playback"],
    owners: () => [
      sourceOwnerForCapability("manage_animation_timeline"),
      owner("mcp/lib/animationMotionDynamics.ts", "mcp/tests/animation-native-intelligence.test.ts", ".agents/skills/lazydesigner-animation/SKILL.md"),
      owner("mcp/lib/animationQuality.ts", "mcp/tests/quality-intelligence.test.ts", ".agents/skills/lazydesigner-animation/SKILL.md"),
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
    terms: ["geometry", "geometri", "cube", "cuboid", "shape", "bentuk", "model shape", "floating", "melayang", "pivot", "hierarchy", "bone", "silhouette", "proportion"],
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
      owner("mcp/lib/bedrockParticleSemantics.ts", "mcp/tests/particle-advanced-semantics.test.ts"),
    ],
  },
  {
    domain: "PROJECT_AFFINITY",
    terms: ["affinity", "project binding", "project tab", "tab blockbench", "wrong project", "salah project", "project context"],
    owners: () => [
      owner("mcp/gateway/backend.ts", "mcp/tests/project-affinity-gateway.test.ts"),
      owner("mcp/server/net.ts", "mcp/tests/project-affinity-runtime.test.ts"),
    ],
  },
  {
    domain: "BUILD_SYNC",
    terms: ["dev:sync", "hot reload", "live sync", "stale build", "build identity", "deploy", "rebuild", "plugin reload"],
    owners: () => [
      owner("mcp/build/index.ts", "mcp/tests/developer-loop.test.ts"),
      owner("mcp/build/watch-policy.ts", "mcp/tests/developer-loop.test.ts"),
      owner("mcp/scripts/deploy-local.ts", "mcp/tests/developer-loop.test.ts"),
    ],
  },
  {
    domain: "GATEWAY",
    terms: ["gateway", "stdio", "capability catalog", "search_capabilities", "describe_capability", "invoke_capability", "control", "control layer", "routing", "continuation", "navigator"],
    owners: () => [
      owner("mcp/gateway/control/packet.ts", "mcp/tests/gateway-control-active-contract.test.ts"),
      owner("mcp/gateway/control/routingPolicy.ts", "mcp/tests/gateway-control-routing.test.ts"),
      owner("mcp/gateway/control/delta.ts", "mcp/tests/gateway-control-continuation-hardening.test.ts"),
      owner("mcp/gateway/index.ts", "mcp/tests/gateway-contract.test.ts"),
      owner("mcp/gateway/backend.ts", "mcp/tests/gateway-reliability-hardening.test.ts"),
      owner("mcp/gateway/contract.ts", "mcp/tests/gateway-contract.test.ts"),
    ],
  },
  {
    domain: "RUNTIME",
    terms: ["runtime", "blockbench api", "plugin lifecycle", "undo", "persistence", "native blockbench", "runtime error", "onload", "onunload"],
    owners: () => [
      owner("mcp/index.ts", "mcp/tests/plugin-runtime-cleanup.test.ts"),
      owner("mcp/lib/runtimeLifecycle.ts", "mcp/tests/runtime-lifecycle.test.ts"),
      owner("mcp/server/server.ts", "mcp/tests/authoring-phase-surface.test.ts"),
    ],
  },
];

function normalizedIntent(intent: string): string {
  return intent.trim().toLocaleLowerCase();
}

function matches(text: string, term: string): boolean {
  return text.includes(term.toLocaleLowerCase());
}

function baseResolution(intent: string): ControlDevelopmentResolution {
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

export function resolveDevelopmentIntent(intent: string): ControlDevelopmentResolution {
  const normalized = normalizedIntent(intent);
  if (!normalized) return baseResolution("");

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
