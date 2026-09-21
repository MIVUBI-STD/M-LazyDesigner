import {
  packBoxUvOffsets,
  type BoxUvRegion,
} from "@/lib/boxUvLayout";

export const LEGACY_BOX_UV_BACKEND = {
  id: "first_fit_v1" as const,
  source_owner: "mcp/lib/boxUvLayout.ts",
  purpose:
    "Compatibility path for provisional native Box-UV offset placement.",
};

/**
 * Compatibility wrapper only. This deliberately preserves the legacy
 * first-fit semantics instead of pretending it is the new general UV planner.
 */
export function planLegacyBoxUvOffsets(input: {
  occupied_regions: readonly BoxUvRegion[];
  footprints: readonly (readonly [number, number])[];
  logical_width: number;
  logical_height: number;
}) {
  const offsets = packBoxUvOffsets(
    input.occupied_regions,
    input.footprints,
    input.logical_width,
    input.logical_height
  );
  return {
    backend: LEGACY_BOX_UV_BACKEND.id,
    source_owner: LEGACY_BOX_UV_BACKEND.source_owner,
    offsets,
  };
}
