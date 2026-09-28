import { capabilitiesByStateClass } from "../../../lib/capabilities/manifest";
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
    "particle"
  )
);

export const ALL_FRESHNESS_SCOPES: readonly ControlFreshnessScope[] = [
  "GEOMETRY_STRUCTURE",
  "UV_MAPPING",
  "TEXTURE_APPEARANCE",
  "MATERIAL_RENDER",
  "ANIMATION_MOTION",
  "ANIMATION_CONTROLLER",
  "ANIMATION_EFFECTS",
  "PARTICLE_SYSTEM",
];
