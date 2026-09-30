/// <reference types="three" />
/// <reference types="blockbench-types" />
import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { captureScreenshot, captureAppScreenshot, imageContent } from "@/lib/blockbench/capture";
import { readRenderedModelBounds, type RenderedModelBounds, type Vec3 } from "@/lib/geometry/renderedModelBounds";
import { STATUS_EXPERIMENTAL, STATUS_STABLE } from "@/lib/constants";
import { vector3Schema, projectionEnum } from "@/lib/zodObjects";

const CAPTURE_SIZE = 512;
const FRAME_PADDING = 0.12;
const PERSPECTIVE_FOV = 45;

const modelViewEnum = z.enum([
  "front",
  "back",
  "left",
  "right",
  "top",
  "bottom",
  "front_left_3q",
  "front_right_3q",
]);

export type ModelView = z.infer<typeof modelViewEnum>;

const visualEvidenceTargetEnum = z.enum([
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
]);

export type VisualEvidenceTarget = z.infer<typeof visualEvidenceTargetEnum>;
export type VisualEvidenceRisk = "LOW" | "MEDIUM" | "HIGH";
export type VisualEvidenceResolution = 256 | 384 | 512;
type FrontDirection = "+z" | "-z";
type FramingInput =
  | { mode: "model" }
  | { mode: "explicit"; min: Vec3; max: Vec3 };

interface CameraSpec {
  view: ModelView;
  projection: "orthographic" | "perspective";
  position: Vec3;
  target: Vec3;
  up: Vec3;
  zoom?: number;
  fov?: number;
}

export type ApprovedReferenceBoardSlot =
  | "upper_left"
  | "upper_front"
  | "upper_back"
  | "lower_top"
  | "lower_front_left_3q";

type ReferenceComparisonEntry = {
  view: ModelView;
  reference_slot: ApprovedReferenceBoardSlot | null;
  primary_evidence: readonly string[];
};

export function modelViewReferenceContract(
  view: ModelView
): ReferenceComparisonEntry {
  switch (view) {
    case "front":
      return {
        view,
        reference_slot: "upper_front",
        primary_evidence: ["width", "height", "silhouette", "count"],
      };
    case "back":
      return {
        view,
        reference_slot: "upper_back",
        primary_evidence: ["width", "height", "rear_topology", "asymmetry"],
      };
    case "left":
      return {
        view,
        reference_slot: "upper_left",
        primary_evidence: ["length", "height", "depth", "attachment"],
      };
    case "top":
      return {
        view,
        reference_slot: "lower_top",
        primary_evidence: ["width", "length", "depth", "negative_space"],
      };
    case "front_left_3q":
      return {
        view,
        reference_slot: "lower_front_left_3q",
        primary_evidence: ["layering", "attachment", "orientation", "depth"],
      };
    case "right":
      return {
        view,
        reference_slot: null,
        primary_evidence: ["length", "height", "depth", "attachment"],
      };
    case "bottom":
      return {
        view,
        reference_slot: null,
        primary_evidence: ["width", "length", "underside", "negative_space"],
      };
    case "front_right_3q":
      return {
        view,
        reference_slot: null,
        primary_evidence: ["layering", "attachment", "orientation", "depth"],
      };
  }
}

const MODEL_VIEW_SELECTION_ORDER: readonly ModelView[] = [
  "front",
  "left",
  "top",
  "back",
  "front_left_3q",
  "right",
  "bottom",
  "front_right_3q",
];

function orthogonalExpansionView(view: ModelView): ModelView {
  switch (view) {
    case "front":
    case "back":
      return "left";
    case "left":
    case "right":
      return "front";
    case "top":
    case "bottom":
      return "front_left_3q";
    case "front_left_3q":
    case "front_right_3q":
      return "front";
  }
}

const DETAIL_384_TARGETS = new Set<VisualEvidenceTarget>([
  "depth",
  "negative_space",
  "orientation",
  "asymmetry",
]);

const DETAIL_512_TARGETS = new Set<VisualEvidenceTarget>([
  "attachment",
  "layering",
  "rear_topology",
  "underside",
]);

export function selectCaptureSizeForEvidence(
  targets: readonly VisualEvidenceTarget[],
  risk: VisualEvidenceRisk = "LOW"
): VisualEvidenceResolution {
  let size: VisualEvidenceResolution = 256;
  if (targets.some((target) => DETAIL_512_TARGETS.has(target))) size = 512;
  else if (targets.some((target) => DETAIL_384_TARGETS.has(target))) size = 384;

  if (risk === "HIGH") return 512;
  if (risk === "MEDIUM" && size < 384) return 384;
  return size;
}

export function selectModelViewsForEvidence(
  targets: readonly VisualEvidenceTarget[],
  risk: VisualEvidenceRisk = "LOW"
) {
  const requested = [...new Set(targets)];
  const uncovered = new Set<VisualEvidenceTarget>(requested);
  const selected: ModelView[] = [];
  const coverage: Array<{
    view: ModelView;
    targets: VisualEvidenceTarget[];
  }> = [];

  while (uncovered.size > 0 && selected.length < 5) {
    let best:
      | {
          view: ModelView;
          covers: VisualEvidenceTarget[];
          referencePaired: boolean;
        }
      | undefined;

    for (const view of MODEL_VIEW_SELECTION_ORDER) {
      if (selected.includes(view)) continue;
      const contract = modelViewReferenceContract(view);
      const covers = contract.primary_evidence.filter(
        (target): target is VisualEvidenceTarget =>
          uncovered.has(target as VisualEvidenceTarget)
      );
      if (covers.length === 0) continue;

      const candidate = {
        view,
        covers,
        referencePaired: contract.reference_slot !== null,
      };
      if (
        !best ||
        candidate.covers.length > best.covers.length ||
        (candidate.covers.length === best.covers.length &&
          candidate.referencePaired &&
          !best.referencePaired)
      ) {
        best = candidate;
      }
    }

    if (!best) break;
    selected.push(best.view);
    coverage.push({ view: best.view, targets: best.covers });
    best.covers.forEach((target) => uncovered.delete(target));
  }

  const minimumViews = [...selected];
  if (uncovered.size === 0 && risk === "MEDIUM" && selected.length > 0 && selected.length < 5) {
    const orthogonal = orthogonalExpansionView(selected[0]!);
    if (!selected.includes(orthogonal)) selected.push(orthogonal);
  }
  if (uncovered.size === 0 && risk === "HIGH") {
    for (const view of ["front", "left", "top"] as const) {
      if (selected.length >= 5) break;
      if (!selected.includes(view)) selected.push(view);
    }
  }

  return {
    requested_targets: requested,
    risk,
    minimum_views: minimumViews,
    views: selected,
    coverage,
    uncovered_targets: [...uncovered],
    expansion:
      selected.length === minimumViews.length
        ? []
        : selected.filter((view) => !minimumViews.includes(view)),
  };
}

export function buildModelViewReferenceComparison(
  views: readonly ModelView[]
) {
  return {
    board_layout: "UPPER:LEFT|FRONT|BACK;LOWER:TOP|FRONT_LEFT_3Q",
    views: views.map(modelViewReferenceContract),
    difference_first: true,
    visual_verdict: "not_evaluated" as const,
  };
}

export const captureScreenshotParameters = z.object({});

export const captureAppScreenshotParameters = z.object({});

export const setCameraAngleParameters = z.object({
  position: vector3Schema.describe("Camera position."),
  target: vector3Schema.optional().describe("Camera target position."),
  rotation: vector3Schema.optional().describe("Camera rotation."),
  projection: projectionEnum.describe("Camera projection type."),
  zoom: z.number().positive().optional().describe("Orthographic camera zoom."),
});

const finiteFramingCoordinateSchema = z.number().finite();

const explicitFramingSchema = z
  .object({
    mode: z.literal("explicit"),
    min: z.tuple([
      finiteFramingCoordinateSchema,
      finiteFramingCoordinateSchema,
      finiteFramingCoordinateSchema,
    ]),
    max: z.tuple([
      finiteFramingCoordinateSchema,
      finiteFramingCoordinateSchema,
      finiteFramingCoordinateSchema,
    ]),
  })
  .refine(
    (value) =>
      value.max.every((entry, axis) => {
        const span = entry - value.min[axis];
        return span > 0 && Number.isFinite(span);
      }),
    {
      message:
        "Each explicit max axis must be greater than min and produce a finite span.",
      path: ["max"],
    }
  );

const uniqueModelViewsSchema = z
  .array(modelViewEnum)
  .min(1)
  .max(5)
  .refine((views) => new Set(views).size === views.length, {
    message: "views must contain unique canonical view names.",
  });

export const captureModelViewsParameters = z
  .object({
  size: z.number().int().min(32).max(1024).optional().describe("Explicit square PNG pixels override. When omitted with evidence_targets, runtime selects 256/384/512 from evidence detail and verification risk. Explicit views without evidence_targets retain the 512 default. 32-64 remains for intentional icons only."),
  highlight_missing_textures: z.boolean().default(false).describe("Diagnostic capture: brighten native missing-texture materials temporarily. Restores state; not a normal shaded comparison or flashing UI."),
  views: uniqueModelViewsSchema.optional().describe(
    "Explicit one-to-five canonical views. Omit when evidence_targets can deterministically select the minimum useful set."
  ),
  evidence_targets: z
    .array(visualEvidenceTargetEnum)
    .min(1)
    .max(13)
    .optional()
    .describe(
      "Current unanswered visual claim(s). When views is omitted, runtime deterministically selects canonical views that cover these targets."
    ),
  verification_risk: z
    .enum(["LOW", "MEDIUM", "HIGH"])
    .default("LOW")
    .describe(
      "Risk-aware evidence expansion. LOW keeps minimum useful views; MEDIUM adds one orthogonal view; HIGH ensures front/left/top core coverage when possible."
    ),
  front_direction: z
    .enum(["+z", "-z"])
    .describe(
      "Explicit object front direction; no default, preventing mirrored comparisons."
    ),
  framing: z
    .union([
      z.object({ mode: z.literal("model") }),
      explicitFramingSchema,
    ])
    .optional()
    .default({ mode: "model" }),
})
  .superRefine((value, ctx) => {
    if (!value.views?.length && !value.evidence_targets?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide explicit views or evidence_targets.",
        path: ["views"],
      });
    }
  });

export const cameraToolDocs: ToolSpec[] = [
  {
    name: "capture_screenshot",
    description:
      "Returns the image data of the current editor view. This is a branch-only observation helper when that specific editor view carries evidence that canonical views cannot answer. For normal reference-driven geometry review, prefer `capture_model_views` so framing/orientation are deterministic.",
    annotations: {
      title: "Capture Screenshot",
      readOnlyHint: true,
    },
    parameters: captureScreenshotParameters,
    status: STATUS_STABLE,
  },
  {
    name: "capture_app_screenshot",
    description:
      "Source-preserved generic Blockbench full-application screenshot helper. It is disabled in the normal BlockIT Bedrock Entity surface; use `capture_model_views` or `capture_screenshot` for model evidence.",
    annotations: {
      title: "Capture App Screenshot",
      readOnlyHint: true,
    },
    parameters: captureAppScreenshotParameters,
    status: STATUS_EXPERIMENTAL,
  },
  {
    name: "set_camera_angle",
    description:
      "Source-preserved generic editor-camera mutation helper. It is disabled in the normal BlockIT Bedrock Entity surface because `capture_model_views` provides deterministic observation without mutating the active editor camera.",
    annotations: {
      title: "Set Camera Angle",
      destructiveHint: true,
    },
    parameters: setCameraAngleParameters,
    status: STATUS_EXPERIMENTAL,
  },
  {
    name: "capture_model_views",
    description:
      "Captures deterministic labeled square PNG views without changing the active editor camera. Provide explicit views, or evidence_targets plus optional verification_risk so runtime selects views and 256/384/512 evidence resolution deterministically. Explicit size overrides automatic resolution; explicit views without evidence_targets retain 512×512. Returns observation only; no score/PASS/FAIL.",
    annotations: {
      title: "Capture Model Views",
      readOnlyHint: true,
    },
    parameters: captureModelViewsParameters,
    status: STATUS_STABLE,
  },
];

function resizePreview(preview: Preview, width: number, height: number): void {
  const runtimePreview = preview as Preview & {
    resize: (width: number, height: number) => Preview;
  };
  runtimePreview.resize(width, height);
}

function boundsFromExplicit(
  framing: Extract<FramingInput, { mode: "explicit" }>
): RenderedModelBounds {
  const { min, max } = framing;
  const size: Vec3 = [
    max[0] - min[0],
    max[1] - min[1],
    max[2] - min[2],
  ];
  const center: Vec3 = [
    min[0] + size[0] / 2,
    min[1] + size[1] / 2,
    min[2] + size[2] / 2,
  ];

  return {
    min: [...min],
    max: [...max],
    center,
    size_xyz: size,
    dimensions: { width: size[0], height: size[1], length: size[2] },
    footprint: {
      min_xz: [min[0], min[2]],
      max_xz: [max[0], max[2]],
      size: { width: size[0], length: size[2] },
    },
  };
}

function scale(value: Vec3, scalar: number): Vec3 {
  return [value[0] * scalar, value[1] * scalar, value[2] * scalar];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function normalize(value: Vec3): Vec3 {
  const length = Math.hypot(value[0], value[1], value[2]);
  if (!Number.isFinite(length) || length <= 1e-8) {
    throw new Error("Cannot derive a canonical camera direction from a zero vector.");
  }
  return [value[0] / length, value[1] / length, value[2] / length];
}

function objectAxes(frontDirection: FrontDirection): {
  front: Vec3;
  right: Vec3;
} {
  const sign = frontDirection === "+z" ? 1 : -1;
  return { front: [0, 0, sign], right: [sign, 0, 0] };
}

function principalDirection(
  view: Exclude<ModelView, "front_left_3q" | "front_right_3q">,
  frontDirection: FrontDirection
): { direction: Vec3; up: Vec3 } {
  const { front, right } = objectAxes(frontDirection);
  switch (view) {
    case "front":
      return { direction: front, up: [0, 1, 0] };
    case "back":
      return { direction: scale(front, -1), up: [0, 1, 0] };
    case "left":
      return { direction: scale(right, -1), up: [0, 1, 0] };
    case "right":
      return { direction: right, up: [0, 1, 0] };
    case "top":
      return { direction: [0, 1, 0], up: scale(front, -1) };
    case "bottom":
      return { direction: [0, -1, 0], up: front };
  }
}

function principalSpans(
  view: ModelView,
  bounds: RenderedModelBounds
): [number, number] {
  const [width, height, length] = bounds.size_xyz;
  switch (view) {
    case "front":
    case "back":
      return [width, height];
    case "left":
    case "right":
      return [length, height];
    case "top":
    case "bottom":
      return [width, length];
    default:
      throw new Error(`${view} is not an orthographic principal view.`);
  }
}

function orthographicZoom(
  preview: Preview,
  horizontalSpan: number,
  verticalSpan: number
): number {
  const paddedWidth = Math.max(horizontalSpan * (1 + FRAME_PADDING * 2), 1e-4);
  const paddedHeight = Math.max(verticalSpan * (1 + FRAME_PADDING * 2), 1e-4);

  // Official Preview.resize() uses left/right = ±width/80 and
  // top/bottom = ±height/80, so the zoom=1 world span is width/40 × height/40.
  const zoom = Math.min(
    preview.width / 40 / paddedWidth,
    preview.height / 40 / paddedHeight
  );
  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new Error("Unable to calculate canonical orthographic framing.");
  }
  return zoom;
}

function cameraSpec(
  preview: Preview,
  view: ModelView,
  frontDirection: FrontDirection,
  bounds: RenderedModelBounds
): CameraSpec {
  const target = bounds.center;
  const maxSpan = Math.max(...bounds.size_xyz, 1);

  if (view !== "front_left_3q" && view !== "front_right_3q") {
    const { direction, up } = principalDirection(view, frontDirection);
    const distance = Math.max(64, maxSpan * 4 + 32);
    const [horizontalSpan, verticalSpan] = principalSpans(view, bounds);
    return {
      view,
      projection: "orthographic",
      position: add(target, scale(direction, distance)),
      target: [...target],
      up,
      zoom: orthographicZoom(preview, horizontalSpan, verticalSpan),
    };
  }

  const { front, right } = objectAxes(frontDirection);
  const side = view === "front_left_3q" ? scale(right, -1) : right;
  const horizontal = normalize(add(front, side));
  const elevation = (30 * Math.PI) / 180;
  const direction = normalize([
    horizontal[0] * Math.cos(elevation),
    Math.sin(elevation),
    horizontal[2] * Math.cos(elevation),
  ]);
  const radius = 0.5 * Math.hypot(...bounds.size_xyz) * (1 + FRAME_PADDING * 2);
  const distance = Math.max(
    16,
    radius / Math.sin((PERSPECTIVE_FOV * Math.PI) / 360)
  );

  return {
    view,
    projection: "perspective",
    position: add(target, scale(direction, distance)),
    target: [...target],
    up: [0, 1, 0],
    fov: PERSPECTIVE_FOV,
  };
}

export function prepareOffscreenPreview(preview: Preview, size = CAPTURE_SIZE): void {
  resizePreview(preview, size, size);

  // Preview.resize() updates the active projection only. Normalize both bases so
  // switching between principal and 3/4 views stays deterministic.
  preview.camPers.aspect = 1;
  preview.camPers.updateProjectionMatrix();
  preview.camOrtho.left = -size / 80;
  preview.camOrtho.right = size / 80;
  preview.camOrtho.top = size / 80;
  preview.camOrtho.bottom = -size / 80;
  preview.camOrtho.updateProjectionMatrix();
}

function applyCamera(preview: Preview, spec: CameraSpec): void {
  preview.setProjectionMode(spec.projection === "orthographic");
  const camera = preview.camera;
  camera.position.fromArray(spec.position);
  camera.up.fromArray(spec.up);
  preview.controls.target.fromArray(spec.target);
  camera.lookAt(preview.controls.target);

  const distance = Math.hypot(
    spec.position[0] - spec.target[0],
    spec.position[1] - spec.target[1],
    spec.position[2] - spec.target[2]
  );

  if (spec.projection === "orthographic") {
    preview.camOrtho.zoom = spec.zoom ?? 1;
    preview.camOrtho.near = -Math.max(200, distance * 2);
    preview.camOrtho.far = Math.max(20_000, distance * 4);
    preview.camOrtho.updateProjectionMatrix();
  } else {
    preview.camPers.fov = spec.fov ?? PERSPECTIVE_FOV;
    preview.camPers.aspect = 1;
    preview.camPers.near = Math.max(0.01, distance / 10_000);
    preview.camPers.far = Math.max(20_000, distance * 4);
    preview.camPers.updateProjectionMatrix();
  }

  preview.controls.update();
}

export function withShadedCapture<T>(capture: () => T): T {
  const shading = typeof settings === "undefined" ? undefined : settings.shading;
  if (typeof shading?.value !== "boolean") {
    throw new Error("Blockbench shading state is unavailable; comparison capture requires Shading ON.");
  }
  const previous = shading.value;
  try {
    shading.value = true;
    Canvas.updateShading();
    return capture();
  } finally {
    shading.value = previous;
    Canvas.updateShading();
  }
}

export function withMissingTextureHighlight<T>(enabled: boolean, capture: () => T): T {
  if (!enabled) return capture();
  const materials = (Canvas as unknown as {emptyMaterials?: Array<{uniforms?: {BRIGHTNESS?: {value:number}}}>}).emptyMaterials;
  if (!Array.isArray(materials)) throw new Error("Native missing-texture materials are unavailable.");
  const uniforms = [...new Set(materials.map(material => material.uniforms?.BRIGHTNESS).filter((uniform): uniform is {value:number} => !!uniform))];
  if (uniforms.some(uniform => !Number.isFinite(uniform.value))) throw new Error("Missing-texture brightness is invalid.");
  const previous = uniforms.map(uniform => uniform.value);
  try {
    uniforms.forEach(uniform => uniform.value=2.5);
    return capture();
  } finally {uniforms.forEach((uniform,index)=>uniform.value=previous[index]);}
}

function captureOffscreenPng(preview: Preview, highlightMissing = false): string {
  let dataUrl: string | undefined;
  withShadedCapture(() => withMissingTextureHighlight(highlightMissing, () => Canvas.withoutGizmos(() => {
    preview.render();
    dataUrl = preview.canvas.toDataURL("image/png");
  })));
  if (!dataUrl) {
    throw new Error("Blockbench returned no image data for canonical model view capture.");
  }
  return dataUrl;
}

export function registerCameraTools() {
  createTool(cameraToolDocs[0].name, {
    ...cameraToolDocs[0],
    async execute() {
      return captureScreenshot();
    },
  }, cameraToolDocs[0].status, false);

  createTool(cameraToolDocs[1].name, {
    ...cameraToolDocs[1],
    async execute() {
      return captureAppScreenshot();
    },
  }, cameraToolDocs[1].status, false);

  createTool(cameraToolDocs[2].name, {
    ...cameraToolDocs[2],
    async execute(angle: { position: number[]; target?: number[]; rotation?: number[]; projection: string; zoom?: number }) {
      const preview = Preview.selected;
      if (!preview) throw new Error("No preview found in the Blockbench editor.");

      // @ts-expect-error Blockbench accepts an AnglePreset-like object here.
      preview.loadAnglePreset({ ...angle });
      if (angle.zoom !== undefined && preview.isOrtho) {
        preview.camOrtho.zoom = angle.zoom;
        preview.camOrtho.updateProjectionMatrix();
        preview.controls.update();
      }
      return captureScreenshot();
    },
  }, cameraToolDocs[2].status, false);

  createTool(cameraToolDocs[3].name, {
    ...cameraToolDocs[3],
    async execute({ views, evidence_targets, verification_risk, front_direction, framing, highlight_missing_textures, size }) {
      if (!Project) {
        throw new Error(
          "No project is open. Open or create the intended Bedrock project before capturing model views."
        );
      }
      if (!Preview.selected) {
        throw new Error("No active Blockbench preview is available.");
      }

      const observed = readRenderedModelBounds();
      const selection = views?.length
        ? {
            requested_targets: evidence_targets ?? [],
            risk: verification_risk as VisualEvidenceRisk,
            minimum_views: views as ModelView[],
            views: views as ModelView[],
            coverage: [],
            uncovered_targets: [],
            expansion: [],
          }
        : selectModelViewsForEvidence(
            (evidence_targets ?? []) as VisualEvidenceTarget[]
          );
      if (selection.views.length === 0 || selection.uncovered_targets.length > 0) {
        throw new Error(
          `Unable to select canonical model views for evidence targets: ${selection.uncovered_targets.join(", ") || "none selected"}.`
        );
      }
      const selectedViews = selection.views;
      const captureSize =
        size ??
        (evidence_targets?.length
          ? selectCaptureSizeForEvidence(
              evidence_targets as VisualEvidenceTarget[],
              verification_risk as VisualEvidenceRisk
            )
          : CAPTURE_SIZE);
      const framingInput = framing as FramingInput;
      if (framingInput.mode === "model") {
        if (!observed.bounds || observed.rendered_cube_count === 0) {
          throw new Error("Model framing requires visible Cube geometry to capture.");
        }
      } else if (observed.rendered_cube_count === 0) {
        throw new Error("Explicit framing requires visible Cube geometry to capture.");
      }

      const framingBounds =
        framingInput.mode === "explicit"
          ? boundsFromExplicit(framingInput)
          : observed.bounds!;

      const capturePreview = Screencam.NoAAPreview;
      if (!capturePreview || capturePreview === Preview.selected) {
        throw new Error(
          "Blockbench offscreen screenshot preview is unavailable; canonical capture refuses to mutate the active editor camera."
        );
      }
      prepareOffscreenPreview(capturePreview, captureSize);

      const content: Array<
        | { type: "text"; text: string }
        | { type: "image"; data: string; mimeType: string }
      > = [];
      const captures: Array<{
        view: ModelView;
        projection: "orthographic" | "perspective";
        width: number;
        height: number;
        png_bytes: number;
      }> = [];

      for (const view of selectedViews) {
        const spec = cameraSpec(
          capturePreview,
          view,
          front_direction as FrontDirection,
          framingBounds
        );
        applyCamera(capturePreview, spec);
        const image = imageContent(captureOffscreenPng(capturePreview, highlight_missing_textures), "image/png")
          .content[0];

        content.push({ type: "text", text: `VIEW ${view}` });
        content.push(image);
        captures.push({
          view,
          projection: spec.projection,
          width: captureSize,
          height: captureSize,
          png_bytes: Math.floor(image.data.length * 3 / 4) - (image.data.endsWith("==") ? 2 : image.data.endsWith("=") ? 1 : 0),
        });
      }

      const format = Format as { id?: string } | undefined;
      const structuredContent = {
        project: {
          uuid: Project.uuid,
          name: Project.name,
          format: format?.id ?? null,
        },
        count: captures.length,
        total_png_bytes: captures.reduce((sum, capture) => sum + capture.png_bytes, 0),
        front_direction,
        framing_mode: framingInput.mode,
        view_selection: {
          mode: views?.length ? "explicit" : "information_gain",
          requested_targets: selection.requested_targets,
          verification_risk: selection.risk,
          minimum_views: selection.minimum_views,
          expansion_views: selection.expansion,
          coverage: selection.coverage,
          selected_views: selectedViews,
        },
        resolution_selection: {
          mode: size === undefined && evidence_targets?.length ? "adaptive" : "explicit_or_default",
          requested_size: size ?? null,
          selected_size: captureSize,
        },
        captures,
        reference_comparison: buildModelViewReferenceComparison(
          captures.map((capture) => capture.view)
        ),
        offscreen_capture: true,
        render_evidence: {
          diagnostic_missing_texture_highlight: highlight_missing_textures,
          shading: true,
          brightness: Settings.get("brightness"),
          view_mode: Project.view_mode,
          source: "blockbench_preview",
          in_game_verified: false,
        },
        active_editor_camera_untouched: true,
        warnings: observed.warnings.length,
      };

      content.unshift({
        type: "text",
        text:
          "Canonical model views captured for observation only. Use reference_comparison to map captures to the approved five-preview board, judge differences directly, and treat correspondence metadata as non-scoring evidence only; this tool does not judge resemblance.",
      });

      return { content, structuredContent };
    },
  }, cameraToolDocs[3].status);
}