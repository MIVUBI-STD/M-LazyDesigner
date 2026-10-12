import type { ModelView } from "../../lib/reference/visualEvidence";
import type { ReferenceImageLandmark } from "../../lib/reference/landmarkEvidence";
import type { ReferenceImageRegion } from "../../lib/reference/imageRegionEvidence";

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

export type ControlReferenceFactValue =
  | string
  | number
  | boolean
  | string[];

export type ControlReferenceStructuredFact = Record<
  string,
  ControlReferenceFactValue
>;

export type ControlReferenceSemanticFacts = {
  parts: ControlReferenceStructuredFact[];
  articulation: ControlReferenceStructuredFact[];
  materials: ControlReferenceStructuredFact[];
  animation_guidance: ControlReferenceStructuredFact[];
  constraints: string[];
};

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
    /** Canonical single-view label; null for composite/unspecified sheets. */
    view?: ModelView | null;
    /** Source-image observations, not model vertices or solved camera calibration. */
    landmarks?: ReferenceImageLandmark[];
    /** Authored regions tied to semantic parts. Not automatic segmentation. */
    regions?: ReferenceImageRegion[];
    /** Read-time source-byte identity, not an approval or visual verdict. */
    sha256?: string | null;
    bytes?: number | null;
    media_type?: "image/png" | "image/jpeg" | "image/webp" | null;
    integrity?: "VERIFIED" | "MISSING" | "INVALID";
  }>;
  /**
   * Decision-critical facts already owned by REFERENCE.json. Optional for
   * compatibility with older callers; Control projects only the active-stage
   * subset rather than retransmitting every semantic section.
   */
  semantic_facts?: ControlReferenceSemanticFacts;
  /** Sections omitted by bounded Control projection; source REFERENCE.json is still intact. */
  truncated_sections?: Array<
    | "parts"
    | "articulation"
    | "materials"
    | "animation_guidance"
    | "constraints"
    | "unknowns.blocking"
    | "unknowns.non_blocking"
  >;
  unavailable_reason?:
    | "REFERENCE_PATH_UNAVAILABLE"
    | "REFERENCE_NOT_FOUND"
    | "REFERENCE_UNREADABLE"
    | "REFERENCE_INVALID";
};
