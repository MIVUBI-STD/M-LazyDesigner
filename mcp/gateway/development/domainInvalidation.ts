export type AuthoringDomain =
  | "GEOMETRY"
  | "TEXTURE_UV"
  | "ANIMATION"
  | "PARTICLE"
  | "REFERENCE"
  | "EXPORT";

export type AuthoringDomainInvalidationPlan = {
  domains: AuthoringDomain[];
  full_domain_invalidation: boolean;
  reasons: string[];
};

const ALL_DOMAINS: readonly AuthoringDomain[] = [
  "GEOMETRY",
  "TEXTURE_UV",
  "ANIMATION",
  "PARTICLE",
  "REFERENCE",
  "EXPORT",
];

function normalize(value: string): string {
  return value.replaceAll("\\", "/").toLowerCase();
}

function uniqueSorted<T extends string>(values: Iterable<T>): T[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function classifySignal(signal: string, domains: Set<AuthoringDomain>): void {
  const value = normalize(signal);

  if (/geometry|cube|mesh|model|bone|pivot|transform/.test(value)) {
    domains.add("GEOMETRY");
  }
  if (/texture|uv|material|paint|palette|pixel/.test(value)) {
    domains.add("TEXTURE_UV");
  }
  if (/animation|motion|keyframe|timeline|rig/.test(value)) {
    domains.add("ANIMATION");
  }
  if (/particle|emitter|billboard/.test(value)) {
    domains.add("PARTICLE");
  }
  if (/reference|prompt|knowledge|vision|image/.test(value)) {
    domains.add("REFERENCE");
  }
  if (/export|build|manifest|package|bedrock|save|serialize/.test(value)) {
    domains.add("EXPORT");
  }
}

function isGlobalAuthoringOwner(path: string): boolean {
  const value = normalize(path);
  return (
    value.startsWith("mcp/gateway/capabilities/") ||
    value.startsWith("mcp/lib/semantic/") ||
    value === "mcp/lib/capabilitymetadata.ts" ||
    value === "mcp/lib/capabilities/manifest.ts"
  );
}

function isAuthoringSurface(path: string): boolean {
  const value = normalize(path);
  return (
    value.startsWith("mcp/server/tools/") ||
    value.startsWith("mcp/server/runtime/") ||
    value.startsWith("mcp/prompts/") ||
    value.startsWith(".agents/skills/lazydesigner-") ||
    value.startsWith("docs/03-authoring/")
  );
}

/**
 * Maps a repository/semantic blast radius onto authoring domains.
 *
 * The classifier is deliberately conservative: changes to shared semantic
 * ownership invalidate every authoring domain; an authoring surface that
 * cannot be classified also fails wide rather than silently missing work.
 */
export function planAuthoringDomainInvalidation(input: {
  changedPaths: readonly string[];
  affectedCapabilities?: readonly string[];
  affectedSources?: readonly string[];
  affectedSpecialists?: readonly string[];
}): AuthoringDomainInvalidationPlan {
  const changedPaths = input.changedPaths.map(normalize);
  const reasons: string[] = [];
  const domains = new Set<AuthoringDomain>();

  if (changedPaths.some(isGlobalAuthoringOwner)) {
    return {
      domains: [...ALL_DOMAINS],
      full_domain_invalidation: true,
      reasons: ["shared semantic authoring ownership changed"],
    };
  }

  const signals = [
    ...changedPaths,
    ...(input.affectedCapabilities ?? []),
    ...(input.affectedSources ?? []),
    ...(input.affectedSpecialists ?? []),
  ];
  for (const signal of signals) classifySignal(signal, domains);

  if (
    domains.size === 0 &&
    changedPaths.some(isAuthoringSurface)
  ) {
    reasons.push("authoring surface changed without a safe domain classification");
    return {
      domains: [...ALL_DOMAINS],
      full_domain_invalidation: true,
      reasons,
    };
  }

  return {
    domains: uniqueSorted(domains),
    full_domain_invalidation: false,
    reasons,
  };
}
