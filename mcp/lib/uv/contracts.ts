export const UV_LAYOUT_SCHEMA_VERSION = 1 as const;
export const UV_PLANNER_VERSION = 1 as const;

export type UvFaceKey =
  | "north"
  | "south"
  | "east"
  | "west"
  | "up"
  | "down";

export type UvRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type UvRotationStep = 90 | 180 | 360;

export type UvDensityPolicy =
  | "PRESERVE"
  | "NORMALIZE"
  | "CUSTOM";

export type UvMirrorPolicy =
  | "ALLOW"
  | "FORBID"
  | "REQUIRE";

export type UvIslandConstraints = {
  locked: boolean;
  rotation: {
    allowed: boolean;
    step: UvRotationStep;
  };
  density: {
    policy: UvDensityPolicy;
    target_pixels_per_model_unit?: number;
    multiplier?: number;
  };
  stack_group?: string;
  lock_group?: string;
  semantic_group?: string;
  mirror_policy: UvMirrorPolicy;
  unique_detail: boolean;
  padding_pixels: number;
  priority: number;
};

export type UvIslandConstraintPatch = Omit<
  Partial<UvIslandConstraints>,
  "rotation" | "density"
> & {
  rotation?: Partial<UvIslandConstraints["rotation"]>;
  density?: Partial<UvIslandConstraints["density"]>;
};

export type UvIslandSource = {
  cube_uuid: string;
  cube_name: string;
  faces: UvFaceKey[];
  box_uv: boolean;
  mirror_uv: boolean;
  autouv: number;
};

export type UvIslandPhysical = {
  width: number;
  height: number;
  area: number;
  density_basis: {
    u_model_units: number;
    v_model_units: number;
  };
};

export type UvIsland = {
  id: string;
  source: UvIslandSource;
  rect: UvRect;
  physical: UvIslandPhysical;
  constraints: UvIslandConstraints;
};

export type UvLayoutMetrics = {
  island_count: number;
  face_count: number;
  physical_area: number;
  uv_area: number;
  occupied_bounds: UvRect | null;
};

export type UvLayoutSnapshot = {
  schema: typeof UV_LAYOUT_SCHEMA_VERSION;
  planner_version: typeof UV_PLANNER_VERSION;
  logical_width: number;
  logical_height: number;
  islands: UvIsland[];
  metrics: UvLayoutMetrics;
};

export type UvPackingBackendId =
  | "first_fit_v1"
  | "maxrects_v1"
  | "blockbench_native";

export type UvPackingScore = {
  valid: boolean;
  hard_violations: string[];
  occupancy_ratio: number;
  density_error: number;
  movement_cost: number;
  fragmentation: number;
  semantic_spread: number;
};

export type UvPackingMode =
  | "REPACK_ALL"
  | "ADD_ONLY"
  | "AFFECTED_ONLY"
  | "REPACK_SELECTED";

export type UvIslandPlacementTransform = {
  island_id: string;
  rotated_90: boolean;
};

export type UvLayoutPlan = {
  schema: 1;
  planner_version: number;
  backend: UvPackingBackendId;
  backend_version: number;
  mode: UvPackingMode;
  before: UvLayoutSnapshot;
  proposed: UvLayoutSnapshot;
  score: UvPackingScore;
  moved_island_ids: string[];
  fixed_island_ids: string[];
  placement_transforms: UvIslandPlacementTransform[];
};

export type UvLayoutReceipt = {
  schema: 1;
  planner_version: number;
  backend: UvPackingBackendId;
  backend_version: number;
  changed_island_ids: string[];
  before_metrics: UvLayoutMetrics;
  after_metrics: UvLayoutMetrics;
};

export const DEFAULT_UV_ISLAND_CONSTRAINTS: UvIslandConstraints = {
  locked: false,
  rotation: {
    allowed: true,
    step: 90,
  },
  density: {
    policy: "PRESERVE",
  },
  mirror_policy: "ALLOW",
  unique_detail: false,
  padding_pixels: 1,
  priority: 0,
};
