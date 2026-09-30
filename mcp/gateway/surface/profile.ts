export type GatewaySurfaceProfile =
  | "stable_four"
  | "hybrid_4_experimental";

export const DEFAULT_GATEWAY_SURFACE_PROFILE: GatewaySurfaceProfile =
  "stable_four";

export function resolveGatewaySurfaceProfile(
  value: unknown
): GatewaySurfaceProfile {
  return value === "hybrid_4_experimental"
    ? "hybrid_4_experimental"
    : DEFAULT_GATEWAY_SURFACE_PROFILE;
}

export function isExperimentalGatewaySurface(
  profile: GatewaySurfaceProfile
): profile is "hybrid_4_experimental" {
  return profile === "hybrid_4_experimental";
}
