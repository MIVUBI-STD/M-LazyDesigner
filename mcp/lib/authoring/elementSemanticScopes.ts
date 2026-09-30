import type { CapabilitySemanticScope } from "../capabilities/manifest";

export type ElementSemanticType =
  | "cube"
  | "group"
  | "locator"
  | "null_object"
  | "element";

const BROAD_GEOMETRY_SCOPES: readonly CapabilitySemanticScope[] = [
  "GEOMETRY_STRUCTURE",
  "UV_MAPPING",
  "TEXTURE_APPEARANCE",
  "ANIMATION_MOTION",
];

export function removedElementSemanticScopes(
  type: ElementSemanticType | string
): CapabilitySemanticScope[] {
  if (type === "locator") {
    return ["GEOMETRY_STRUCTURE", "ANIMATION_EFFECTS"];
  }
  if (type === "null_object") {
    return ["GEOMETRY_STRUCTURE", "ANIMATION_MOTION"];
  }
  if (type === "cube" || type === "group") {
    return [...BROAD_GEOMETRY_SCOPES];
  }
  return [...BROAD_GEOMETRY_SCOPES];
}

export function renamedElementSemanticScopes(
  type: ElementSemanticType | string
): CapabilitySemanticScope[] {
  if (type === "cube") return ["GEOMETRY_STRUCTURE"];
  if (type === "locator") {
    return ["GEOMETRY_STRUCTURE", "ANIMATION_EFFECTS"];
  }
  if (type === "null_object" || type === "group") {
    return ["GEOMETRY_STRUCTURE", "ANIMATION_MOTION"];
  }
  return ["GEOMETRY_STRUCTURE", "ANIMATION_MOTION"];
}
