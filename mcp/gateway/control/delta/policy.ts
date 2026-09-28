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

export const UV_FIELDS = new Set([
  "faces", "box_uv", "uv_offset", "mirror_uv", "autouv",
]);

export const SHAPE_FIELDS = new Set([
  "from", "to", "inflate",
]);

export const HIERARCHY_OR_MOTION_STRUCTURE = new Set([
  "add_group", "modify_group", "reparent_element", "rename_element",
  "manage_locator", "manage_null_object", "bone_rigging",
]);

export const TEXTURE_APPEARANCE_MUTATIONS = new Set(
  capabilitiesByStateClass("texture_appearance")
);

export const MATERIAL_RENDER_MUTATIONS = new Set(
  capabilitiesByStateClass("material_render")
);

export const ANIMATION_MOTION_MUTATIONS = new Set(
  capabilitiesByStateClass("animation_motion")
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
