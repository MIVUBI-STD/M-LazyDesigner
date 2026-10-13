import {
  CAPABILITY_SEMANTIC_SCOPES,
  capabilitiesByStateClass,
} from "../../../lib/capabilities/manifest";
import type { ControlFreshnessScope } from "../types";

export const STATE_MUTATIONS = new Set(
  capabilitiesByStateClass(
    "cross_authoring",
    "geometry",
    "uv",
    "texture_appearance",
    "texture_material",
    "material_render",
    "animation_motion",
    "animation_controller",
    "animation_effects",
    "particle",
    // File persistence is not an appearance change when its own receipt proves
    // the write. Without that receipt, no-op cannot be assumed.
    "persistence"
  )
);

export const ALL_FRESHNESS_SCOPES: readonly ControlFreshnessScope[] = [
  ...CAPABILITY_SEMANTIC_SCOPES,
];
