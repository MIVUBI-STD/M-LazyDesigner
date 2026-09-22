import { GATEWAY_TOOL_NAMES } from "../protocol";

export const HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES = [
  "manage_cubes",
  "inspect_elements",
  "create_texture",
  "manage_material",
] as const;

export type Hybrid4ExperimentalCapability =
  (typeof HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES)[number];

export type GatewaySurfaceProfile =
  | "stable_four"
  | "hybrid_4_experimental";

export const DEFAULT_GATEWAY_SURFACE_PROFILE: GatewaySurfaceProfile =
  "stable_four";

export const HYBRID_4_EXPERIMENTAL_PROFILE = Object.freeze({
  id: "hybrid_4_experimental" as const,
  base_gateway_tools: [...GATEWAY_TOOL_NAMES],
  direct_capabilities: [...HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES],
  production_default: false,
  registration_enabled: false,
  proof_status: "PROJECTION_ONLY" as const,
});

/**
 * Experimental selection remains exact and fail-closed. This resolver does not
 * register direct tools; it only selects a projection plan for benchmark and
 * future startup wiring.
 */
export function resolveGatewaySurfaceProfile(
  value: unknown
): GatewaySurfaceProfile {
  return value === "hybrid_4_experimental"
    ? "hybrid_4_experimental"
    : DEFAULT_GATEWAY_SURFACE_PROFILE;
}

export function gatewaySurfaceProjection(
  profile: GatewaySurfaceProfile = DEFAULT_GATEWAY_SURFACE_PROFILE
): {
  profile: GatewaySurfaceProfile;
  gateway_tools: string[];
  direct_capabilities: string[];
  projected_client_tool_count: number;
  registration_enabled: boolean;
} {
  if (profile === "hybrid_4_experimental") {
    const direct = [...HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES];
    return {
      profile,
      gateway_tools: [...GATEWAY_TOOL_NAMES],
      direct_capabilities: direct,
      projected_client_tool_count: GATEWAY_TOOL_NAMES.length + direct.length,
      registration_enabled: false,
    };
  }

  return {
    profile: "stable_four",
    gateway_tools: [...GATEWAY_TOOL_NAMES],
    direct_capabilities: [],
    projected_client_tool_count: GATEWAY_TOOL_NAMES.length,
    registration_enabled: true,
  };
}
