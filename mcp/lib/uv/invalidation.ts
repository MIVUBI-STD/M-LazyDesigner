import type {
  UvLayoutReceipt,
} from "@/lib/uv/contracts";

export type UvDownstreamInvalidation = {
  uv_mapping: {
    stale: true;
    island_ids: string[];
    cube_ids: string[];
  };
  texture_appearance: {
    stale: true;
    reason: "MAPPED_REGION_CHANGED";
    cube_ids: string[];
    faces: UvLayoutReceipt["changed_faces"];
  };
  seam_evidence: {
    stale: true;
    cube_ids: string[];
  };
  production_alignment: {
    stale: true;
    scope: "AFFECTED_MAPPING";
  };
  pbr_alignment: {
    stale: true;
    scope: "AFFECTED_MAPPING";
  };
  geometry_structure: {
    stale: false;
  };
  animation_motion: {
    stale: false;
  };
};

export function invalidationForUvReceipt(
  receipt: UvLayoutReceipt
): UvDownstreamInvalidation {
  return {
    uv_mapping: {
      stale: true,
      island_ids: [...receipt.changed_island_ids],
      cube_ids: [...receipt.changed_cube_ids],
    },
    texture_appearance: {
      stale: true,
      reason: "MAPPED_REGION_CHANGED",
      cube_ids: [...receipt.changed_cube_ids],
      faces: receipt.changed_faces.map((entry) => ({ ...entry })),
    },
    seam_evidence: {
      stale: true,
      cube_ids: [...receipt.changed_cube_ids],
    },
    production_alignment: {
      stale: true,
      scope: "AFFECTED_MAPPING",
    },
    pbr_alignment: {
      stale: true,
      scope: "AFFECTED_MAPPING",
    },
    geometry_structure: {
      stale: false,
    },
    animation_motion: {
      stale: false,
    },
  };
}
