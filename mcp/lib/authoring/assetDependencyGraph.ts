import type { CapabilitySemanticScope } from "../capabilities/manifest";

export type AssetDependencyDomain =
  | "GEOMETRY"
  | "TEXTURING"
  | "ANIMATION";

export type AssetDependencyRecheckAction =
  | "REVERIFY_GEOMETRY"
  | "REVERIFY_UV_LAYOUT"
  | "REVERIFY_MAPPED_TEXTURE"
  | "REVERIFY_MATERIAL_RENDER"
  | "REVERIFY_ANIMATION_MOTION"
  | "REVERIFY_ANIMATION_CONTROLLER"
  | "REVERIFY_ANIMATION_EFFECTS"
  | "REVERIFY_PARTICLE_SYSTEM";

export type AssetDependencyNode = {
  domain: AssetDependencyDomain;
  recheck: AssetDependencyRecheckAction;
  reason: string;
};

/**
 * Canonical authored-state dependency projection.
 *
 * Capabilities declare the semantic scopes they dirty. This graph owns what
 * each scope means downstream: semantic owner + minimum required recheck.
 * It contains no AI planning, Runtime state or capability-specific mutation
 * logic. Those remain with the capability/receipt owners.
 */
export const ASSET_DEPENDENCY_GRAPH: Readonly<
  Record<CapabilitySemanticScope, AssetDependencyNode>
> = {
  GEOMETRY_STRUCTURE: {
    domain: "GEOMETRY",
    recheck: "REVERIFY_GEOMETRY",
    reason: "Authored geometry structure changed.",
  },
  UV_MAPPING: {
    domain: "TEXTURING",
    recheck: "REVERIFY_UV_LAYOUT",
    reason:
      "Geometry or UV state changed in a way that can invalidate mapped UV evidence.",
  },
  TEXTURE_APPEARANCE: {
    domain: "TEXTURING",
    recheck: "REVERIFY_MAPPED_TEXTURE",
    reason:
      "Mapped texture appearance may no longer match the accepted surface evidence.",
  },
  MATERIAL_RENDER: {
    domain: "TEXTURING",
    recheck: "REVERIFY_MATERIAL_RENDER",
    reason: "Material/render semantics changed.",
  },
  ANIMATION_MOTION: {
    domain: "ANIMATION",
    recheck: "REVERIFY_ANIMATION_MOTION",
    reason: "Motion or motion-readiness evidence may be stale.",
  },
  ANIMATION_CONTROLLER: {
    domain: "ANIMATION",
    recheck: "REVERIFY_ANIMATION_CONTROLLER",
    reason: "Animation controller state changed.",
  },
  ANIMATION_EFFECTS: {
    domain: "ANIMATION",
    recheck: "REVERIFY_ANIMATION_EFFECTS",
    reason: "Animation effect state changed.",
  },
  PARTICLE_SYSTEM: {
    domain: "ANIMATION",
    recheck: "REVERIFY_PARTICLE_SYSTEM",
    reason: "Particle system state changed.",
  },
};

export function assetDependencyForScope(
  scope: CapabilitySemanticScope
): AssetDependencyNode {
  return ASSET_DEPENDENCY_GRAPH[scope];
}

export function assetDomainsForScopes(
  scopes: readonly CapabilitySemanticScope[]
): AssetDependencyDomain[] {
  const domains = new Set<AssetDependencyDomain>();
  for (const scope of scopes) {
    domains.add(ASSET_DEPENDENCY_GRAPH[scope].domain);
  }
  return [...domains];
}
