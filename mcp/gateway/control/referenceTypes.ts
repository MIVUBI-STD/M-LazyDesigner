export type ControlProfile =
  | "PROP_FURNITURE"
  | "VEHICLE"
  | "HUMANOID"
  | "CREATURE"
  | "MECHANICAL"
  | "PLANT_FOLIAGE"
  | "GENERIC";

export type ControlReferenceAssetKind = "MODEL" | "PARTICLE";
export type ControlReferenceStage = "GEOMETRY" | "TEXTURE" | "ANIMATION";

export type ControlReferenceProjection = {
  available: boolean;
  source_path: string | null;
  package_root: string | null;
  fingerprint: string | null;
  schema: string | null;
  asset_name: string | null;
  asset_kind: ControlReferenceAssetKind | null;
  intent: string | null;
  selected_profile: ControlProfile | null;
  requirements: {
    dimensions_blocks: {
      width: number | null;
      height: number | null;
      length: number | null;
    } | null;
    player_relative_scale: string | null;
    animation_required: boolean | null;
  };
  readiness: {
    overall: string | null;
    geometry: string | null;
    texture: string | null;
    animation: string | null;
  };
  particle: {
    identifier: string | null;
    particle_json: string | null;
    texture_reference: string | null;
    texture_png: string | null;
    texture_state: string | null;
    recommended_locator: string | null;
    recommended_animation: string | null;
    trigger_intent: string | null;
    trigger_time_seconds: number | null;
    bind_to_actor: boolean | null;
    review_state: string | null;
  } | null;
  blocking_unknowns: string[];
  non_blocking_unknowns: string[];
  documents: Partial<Record<ControlReferenceStage, string>>;
  images: Array<{
    id: string;
    file: string;
    role: string | null;
    used_by: ControlReferenceStage[];
    status: string | null;
  }>;
  unavailable_reason?:
    | "REFERENCE_PATH_UNAVAILABLE"
    | "REFERENCE_NOT_FOUND"
    | "REFERENCE_UNREADABLE"
    | "REFERENCE_INVALID";
};
