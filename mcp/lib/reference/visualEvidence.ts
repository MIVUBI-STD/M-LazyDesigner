export const MODEL_VIEWS = [
  "front",
  "back",
  "left",
  "right",
  "top",
  "bottom",
  "front_left_3q",
  "front_right_3q",
] as const;

export type ModelView = (typeof MODEL_VIEWS)[number];

export const VISUAL_EVIDENCE_TARGETS = [
  "width",
  "height",
  "length",
  "depth",
  "silhouette",
  "count",
  "rear_topology",
  "asymmetry",
  "attachment",
  "negative_space",
  "layering",
  "orientation",
  "underside",
] as const;

export type VisualEvidenceTarget = (typeof VISUAL_EVIDENCE_TARGETS)[number];
export type VisualEvidenceRisk = "LOW" | "MEDIUM" | "HIGH";
export type VisualEvidenceResolution = 256 | 384 | 512;
