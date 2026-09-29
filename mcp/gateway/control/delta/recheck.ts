import type {
  ControlAuthoringDomain,
  ControlFreshnessScope,
} from "../types";

export type ControlRecheckAction =
  | "REVERIFY_GEOMETRY"
  | "REVERIFY_UV_LAYOUT"
  | "REVERIFY_MAPPED_TEXTURE"
  | "REVERIFY_MATERIAL_RENDER"
  | "REVERIFY_ANIMATION_MOTION"
  | "REVERIFY_ANIMATION_CONTROLLER"
  | "REVERIFY_ANIMATION_EFFECTS"
  | "REVERIFY_PARTICLE_SYSTEM";

export type ControlDownstreamRecheck = {
  scope: ControlFreshnessScope;
  domain: ControlAuthoringDomain;
  action: ControlRecheckAction;
  reason: string;
};

const RECHECK_BY_SCOPE: Readonly<
  Record<
    ControlFreshnessScope,
    Omit<ControlDownstreamRecheck, "scope">
  >
> = {
  GEOMETRY_STRUCTURE: {
    domain: "GEOMETRY",
    action: "REVERIFY_GEOMETRY",
    reason: "Authored geometry structure changed.",
  },
  UV_MAPPING: {
    domain: "TEXTURING",
    action: "REVERIFY_UV_LAYOUT",
    reason: "Geometry or UV state changed in a way that can invalidate mapped UV evidence.",
  },
  TEXTURE_APPEARANCE: {
    domain: "TEXTURING",
    action: "REVERIFY_MAPPED_TEXTURE",
    reason: "Mapped texture appearance may no longer match the accepted surface evidence.",
  },
  MATERIAL_RENDER: {
    domain: "TEXTURING",
    action: "REVERIFY_MATERIAL_RENDER",
    reason: "Material/render semantics changed.",
  },
  ANIMATION_MOTION: {
    domain: "ANIMATION",
    action: "REVERIFY_ANIMATION_MOTION",
    reason: "Motion or motion-readiness evidence may be stale.",
  },
  ANIMATION_CONTROLLER: {
    domain: "ANIMATION",
    action: "REVERIFY_ANIMATION_CONTROLLER",
    reason: "Animation controller state changed.",
  },
  ANIMATION_EFFECTS: {
    domain: "ANIMATION",
    action: "REVERIFY_ANIMATION_EFFECTS",
    reason: "Animation effect state changed.",
  },
  PARTICLE_SYSTEM: {
    domain: "ANIMATION",
    action: "REVERIFY_PARTICLE_SYSTEM",
    reason: "Particle system state changed.",
  },
};

export function downstreamRechecksForFreshness(input: {
  stale: readonly ControlFreshnessScope[];
  currentDomain: ControlAuthoringDomain;
}): {
  required: ControlDownstreamRecheck[];
  preserved_domains: ControlAuthoringDomain[];
} {
  const required = [...new Set(input.stale)]
    .map((scope) => ({
      scope,
      ...RECHECK_BY_SCOPE[scope],
    }))
    .sort(
      (left, right) =>
        left.domain.localeCompare(right.domain) ||
        left.scope.localeCompare(right.scope)
    );

  const affectedDomains = new Set(required.map((entry) => entry.domain));
  const all: ControlAuthoringDomain[] = [
    "GEOMETRY",
    "TEXTURING",
    "ANIMATION",
  ];
  const preserved = all.filter(
    (domain) =>
      domain !== input.currentDomain && !affectedDomains.has(domain)
  );

  return {
    required,
    preserved_domains: preserved,
  };
}
