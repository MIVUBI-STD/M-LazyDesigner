/// <reference types="three" />
/// <reference types="blockbench-types" />
import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import {
  imageContent,
  isAbsoluteFilesystemPath,
} from "@/lib/util";
import { STATUS_EXPERIMENTAL, STATUS_STABLE } from "@/lib/constants";
import { resolveCoreTexture } from "@/lib/coreIdentity";
import { DEFAULT_BEDROCK_UV_RESOLUTION } from "./project";
import {
  colorSchema,
  textureIdOptionalSchema,
  pbrChannelEnum,
  renderModeEnum,
  renderSidesEnum,
} from "@/lib/zodObjects";
import {
  activateTextureToolDoc,
  addTextureGroupToolDoc,
  applyTextureToolDoc,
  registerTextureActivationTool,
  registerTextureAssignmentTools,
} from "./texture-assignment";
export {
  activateTextureParameters,
  addTextureGroupParameters,
  applyTextureParameters,
} from "./texture-assignment";
import {
  registerTextureMaterialTools,
  resolveTextureToolMaterial,
  textureMaterialToolDocs,
} from "./texture-materials";
export {
  assignTextureChannelParameters,
  configureMaterialParameters,
  createPbrMaterialParameters,
  getMaterialInfoParameters,
  hasExactTextureGroupNameCollision,
  importedTextureGroupName,
  importTextureSetParameters,
  isMinecraftTextureSetDocument,
  listMaterialsParameters,
  requireDistinctPbrChannelAssignments,
  requireMaterialConfigSavePostcondition,
  saveMaterialConfigParameters,
} from "./texture-materials";

// ============================================================================
// Texture Tool Parameter Schemas
// ============================================================================

export function isDeterministicTextureSource(value: string): boolean {
  if (value.startsWith("data:image/")) return true;
  return isAbsoluteFilesystemPath(value.replace(/^file:\/\//, ""));
}

export const createTextureParameters = z
  .object({
    name: z.string().min(1).describe("Non-empty texture name."),
    texture_id: textureIdOptionalSchema.describe(
      "Template rebuild only: UUID of the existing single base atlas to repack in place, preserving its identity and mapped pixels."
    ),
    type: z
      .enum(["blank", "template"])
      .default("blank")
      .describe(
        "Texture creation mode. Template builds UV layout from model geometry before any pixel painting."
      ),
    width: z.number().int().min(16).max(4096).default(16),
    height: z.number().int().min(16).max(4096).default(16),
    pixel_density: z
      .union([
        z.literal(16),
        z.literal(32),
        z.literal(64),
        z.literal(128),
        z.literal(256),
        z.literal(512),
      ])
      .default(16)
      .describe(
        "Template density in pixels per 16 model units. At 16x, one model unit maps to one texture pixel."
      ),
    rearrange_uv: z
      .boolean()
      .default(true)
      .describe("Generate and assign a fresh UV arrangement for template mode."),
    power_of_two: z
      .boolean()
      .default(true)
      .describe("Round the generated template atlas to a power-of-two square."),
    keep_multi_texture_occupancy: z
      .boolean()
      .default(true)
      .describe("Reuse identical existing UV occupancy when generating a template."),
    padding: z
      .boolean()
      .default(false)
      .describe("Reserve a one-pixel padding border around template islands."),
    data: z
      .string()
      .refine(isDeterministicTextureSource, {
        message:
          "Texture data must be an image data URL or an absolute POSIX, Windows-drive, UNC, or file:// path.",
      })
      .optional()
      .describe("Image data URL or deterministic absolute image file path."),
    group: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Optional TextureGroup UUID or unique exact name."
      ),
    fill_color: colorSchema
      .optional()
      .describe("RGBA color to fill the texture, as tuple or HEX string."),
    layer_name: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Non-empty texture layer name. Required if fill_color is set."
      ),
    pbr_channel: pbrChannelEnum
      .optional()
      .describe(
        "PBR channel: color, normal, height, or MER."
      ),
    render_mode: renderModeEnum
      .optional()
      .default("default")
      .describe(
        "Texture render mode."
      ),
    render_sides: renderSidesEnum
      .optional()
      .default("auto")
      .describe("Render sides for the texture. Auto, front, or double."),
  })
  .refine((params) => !(params.data && params.fill_color), {
    message:
      "The 'data' and 'fill_color' properties cannot both be defined.",
    path: ["data", "fill_color"],
  })
  .refine((params) => !(params.fill_color && !params.layer_name), {
    message:
      "The 'layer_name' property is required when 'fill_color' is set.",
    path: ["layer_name", "fill_color"],
  })
  .superRefine((params, ctx) => {
    if (params.texture_id !== undefined && params.type !== "template") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["texture_id"], message: "texture_id is only supported for template rebuild." });
    }
    if (params.type !== "template") return;
    if (params.data !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["data"],
        message: "Template mode owns bitmap generation; do not provide image data.",
      });
    }
    if (params.pbr_channel !== undefined && params.pbr_channel !== "color") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pbr_channel"],
        message: "Template mode creates the base-color atlas only.",
      });
    }
  })
  .refine(
    ({ pbr_channel, group }) => (pbr_channel && group) || !pbr_channel,
    {
      message:
        "The 'group' property is required when 'pbr_channel' is set.",
      path: ["group", "pbr_channel"],
    }
  );

export const listTexturesParameters = z.object({
  diagnostics: z.boolean().optional().default(true).describe(
    "Keep true for UV/coverage/seam/PBR review; false returns texture inventory without UV or pixel diagnostics."
  ),
});

export const getTextureParameters = z.object({
  texture: textureIdOptionalSchema,
});

export const textureToolDocs: ToolSpec[] = [
  {
    name: "create_texture",
    description:
      "Creates a texture and returns compact metadata. Use get_texture only when image data is needed.",
    annotations: {
      title: "Create Texture",
      destructiveHint: true,
      openWorldHint: true,
    },
    parameters: createTextureParameters,
    status: STATUS_EXPERIMENTAL,
  },
  applyTextureToolDoc,
  addTextureGroupToolDoc,
  {
    name: "list_textures",
    description:
      "Lists texture identity; diagnostics=false skips UV/pixel analysis for discovery. Default true includes UV hygiene and bounded coverage/seam/PBR diagnostics. Seam scope is intra-Cube; cross-Cube continuity is not evaluated. Coverage states.varied means pixel variation, not styling acceptance; solid_color_faces identifies flat surfaces for review. Empty scans are incomplete. Pixel-read budget counts unique texture regions per invocation; every face remains accounted. Fractional logical UV is diagnostic; NON_INTEGRAL_PIXEL_MAPPING blocks non-integral physical texels. Readiness is not visual layout approval.",
    annotations: {
      title: "List Textures",
      readOnlyHint: true,
    },
    parameters: listTexturesParameters,
    status: STATUS_STABLE,
  },
  {
    name: "get_texture",
    description:
      "Returns image data for the selected or explicitly identified texture.",
    annotations: {
      title: "Get Texture",
      readOnlyHint: true,
    },
    parameters: getTextureParameters,
    status: STATUS_STABLE,
  },
  ...textureMaterialToolDocs,
  activateTextureToolDoc,
];

function resolveGetTextureTexture(reference: string): Texture {
  return resolveCoreTexture(reference, "Use list_textures to confirm the intended UUID or texture ID before reading image data.");
}


export type TextureProductionRole =
  | "base_color_candidate"
  | "explicit_variant"
  | "pbr_support";

export type TextureRoleMetadata = {
  pbr_channel?: string | null;
  has_group: boolean;
  group_is_material?: boolean | null;
};

export function classifyTextureProductionRole(
  metadata: TextureRoleMetadata
): TextureProductionRole {
  const channel = metadata.pbr_channel ?? "color";
  if (channel !== "color") return "pbr_support";
  if (metadata.has_group && metadata.group_is_material === false) {
    return "explicit_variant";
  }
  return "base_color_candidate";
}

export function isAiProductionColorCanvas(
  width: number,
  height: number
): boolean {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width === height &&
    width >= DEFAULT_BEDROCK_UV_RESOLUTION &&
    width % DEFAULT_BEDROCK_UV_RESOLUTION === 0
  );
}

export function isProvisionalTextureCanvas(
  width: number,
  height: number
): boolean {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width === height &&
    width >= 16 &&
    width <= 1024 &&
    width % 16 === 0
  );
}

export const UV_ATLAS_AUDIT_EXAMPLE_LIMIT = 6;

export type UvAtlasUsage = {
  cube_uuid: string;
  cube_name: string;
  face: string;
  uv: readonly number[];
  box_uv: boolean;
  autouv: number;
  mirror_uv: boolean;
  face_rotation: number;
  surface_area?: number;
  pixel_scale?: readonly [number, number];
};

type NormalizedUvUsage = UvAtlasUsage & {
  rect: [number, number, number, number];
};

function normalizedUvRect(
  values: readonly number[]
): [number, number, number, number] | null {
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    return null;
  }
  return [
    Math.min(values[0], values[2]),
    Math.min(values[1], values[3]),
    Math.max(values[0], values[2]),
    Math.max(values[1], values[3]),
  ];
}

function uvUsageExample(usage: UvAtlasUsage) {
  return {
    cube_uuid: usage.cube_uuid,
    cube_name: usage.cube_name,
    face: usage.face,
    uv: [...usage.uv],
    box_uv: usage.box_uv,
    autouv: usage.autouv,
    mirror_uv: usage.mirror_uv,
    face_rotation: usage.face_rotation,
  };
}

function uvRectArea(rect: readonly number[]): number {
  return Math.max(0, rect[2] - rect[0]) * Math.max(0, rect[3] - rect[1]);
}

function uvRectsEqual(a: readonly number[], b: readonly number[]): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

function uvRectIntersection(
  a: readonly number[],
  b: readonly number[]
): [number, number, number, number] | null {
  const left = Math.max(a[0], b[0]);
  const top = Math.max(a[1], b[1]);
  const right = Math.min(a[2], b[2]);
  const bottom = Math.min(a[3], b[3]);
  if (left >= right || top >= bottom) return null;
  return [left, top, right, bottom];
}

function boundedExamples<T>(
  values: readonly T[],
  limit: number
): { examples: T[]; examples_truncated: boolean } {
  return {
    examples: values.slice(0, limit),
    examples_truncated: values.length > limit,
  };
}

export function buildUvAtlasAudit(
  usages: readonly UvAtlasUsage[],
  logicalWidth: number | null | undefined,
  logicalHeight: number | null | undefined,
  exampleLimit: number = UV_ATLAS_AUDIT_EXAMPLE_LIMIT
) {
  if (
    typeof logicalWidth !== "number" ||
    typeof logicalHeight !== "number" ||
    !Number.isFinite(logicalWidth) ||
    !Number.isFinite(logicalHeight) ||
    logicalWidth <= 0 ||
    logicalHeight <= 0
  ) {
    return {
      state: "unavailable" as const,
      reason: "logical_uv_canvas_unavailable" as const,
      enabled_faces: usages.length,
    };
  }

  const width = logicalWidth;
  const height = logicalHeight;
  const invalidUv: UvAtlasUsage[] = [];
  const valid: NormalizedUvUsage[] = [];

  for (const usage of usages) {
    const rect = normalizedUvRect(usage.uv);
    if (!rect) {
      invalidUv.push(usage);
      continue;
    }
    valid.push({ ...usage, rect });
  }

  const outOfBounds = valid.filter(
    ({ rect }) =>
      rect[0] < 0 ||
      rect[1] < 0 ||
      rect[2] > width ||
      rect[3] > height
  );
  const fractionalUv = valid.filter(({ uv }) =>
    uv.some((value) => !Number.isInteger(value))
  );
  const nonIntegralPixels = valid.filter(({ uv, pixel_scale = [1, 1] }) =>
    pixel_scale.some(value => !Number.isFinite(value) || value <= 0) ||
    uv.some((value, axis) => !Number.isInteger(value * pixel_scale[axis % 2]))
  );
  const degenerateUv = valid.filter(({ rect }) => uvRectArea(rect) === 0);
  const collapsedSurfaceUv = degenerateUv.filter(({ surface_area }) => surface_area === undefined || surface_area > 0);

  const unlockedByCube = new Map<string, UvAtlasUsage>();
  for (const usage of valid) {
    if (usage.box_uv && usage.autouv !== 0 && !unlockedByCube.has(usage.cube_uuid)) {
      unlockedByCube.set(usage.cube_uuid, usage);
    }
  }
  const unlocked = [...unlockedByCube.values()];

  const reusable = valid.filter(({ rect }) => uvRectArea(rect) > 0);
  const exactReuseMap = new Map<string, NormalizedUvUsage[]>();
  for (const usage of reusable) {
    const key = usage.rect.join(",");
    const group = exactReuseMap.get(key) ?? [];
    group.push(usage);
    exactReuseMap.set(key, group);
  }

  const exactReuseGroups = [...exactReuseMap.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
      rect: group[0].rect,
      owner_count: group.length,
      owners: group
        .slice(0, exampleLimit)
        .map((usage) => uvUsageExample(usage)),
      owners_truncated: group.length > exampleLimit,
    }));

  const sorted = [...reusable].sort(
    (a, b) =>
      a.rect[0] - b.rect[0] ||
      a.rect[2] - b.rect[2] ||
      a.rect[1] - b.rect[1]
  );
  let partialOverlapPairCount = 0;
  const partialOverlapExamples: Array<{
    a: ReturnType<typeof uvUsageExample>;
    b: ReturnType<typeof uvUsageExample>;
    intersection: [number, number, number, number];
  }> = [];

  for (let i = 0; i < sorted.length; i += 1) {
    const a = sorted[i];
    for (let j = i + 1; j < sorted.length; j += 1) {
      const b = sorted[j];
      if (b.rect[0] >= a.rect[2]) break;
      if (uvRectsEqual(a.rect, b.rect)) continue;
      const intersection = uvRectIntersection(a.rect, b.rect);
      if (!intersection) continue;
      partialOverlapPairCount += 1;
      if (partialOverlapExamples.length < exampleLimit) {
        partialOverlapExamples.push({
          a: uvUsageExample(a),
          b: uvUsageExample(b),
          intersection,
        });
      }
    }
  }

  const reasons: string[] = [];
  if (invalidUv.length > 0) reasons.push("INVALID_UV");
  if (outOfBounds.length > 0) reasons.push("OUT_OF_BOUNDS");
  if (nonIntegralPixels.length > 0) reasons.push("NON_INTEGRAL_PIXEL_MAPPING");
  if (unlocked.length > 0) reasons.push("BOX_UV_AUTOUV_UNLOCKED");
  if (partialOverlapPairCount > 0) reasons.push("PARTIAL_OVERLAP");
  if (collapsedSurfaceUv.length > 0) reasons.push("COLLAPSED_SURFACE_UV");

  const invalidBounded = boundedExamples(
    invalidUv.map(uvUsageExample),
    exampleLimit
  );
  const outOfBoundsBounded = boundedExamples(
    outOfBounds.map(uvUsageExample),
    exampleLimit
  );
  const fractionalBounded = boundedExamples(
    fractionalUv.map(uvUsageExample),
    exampleLimit
  );
  const degenerateBounded = boundedExamples(
    degenerateUv.map(uvUsageExample),
    exampleLimit
  );
  const unlockedBounded = boundedExamples(
    unlocked.map(uvUsageExample),
    exampleLimit
  );
  const reuseBounded = boundedExamples(exactReuseGroups, exampleLimit);

  // Exact rectangle union in logical UV units; reuse/partial overlap must not
  // inflate occupancy. Clip to the canvas while retaining out-of-bounds errors.
  const clipped = reusable.map(({ rect }) => [
    Math.max(0, rect[0]), Math.max(0, rect[1]),
    Math.min(width, rect[2]), Math.min(height, rect[3]),
  ]).filter(r => r[2] > r[0] && r[3] > r[1]);
  const xs = [...new Set(clipped.flatMap(r => [r[0], r[2]]))].sort((a, b) => a - b);
  let occupiedArea = 0;
  for (let i = 1; i < xs.length; i++) {
    const intervals = clipped.filter(r => r[0] < xs[i] && r[2] > xs[i - 1])
      .map(r => [r[1], r[3]]).sort((a, b) => a[0] - b[0]);
    let end = -Infinity;
    let span = 0;
    for (const [lo, hi] of intervals) {
      span += Math.max(0, hi - Math.max(lo, end));
      end = Math.max(end, hi);
    }
    occupiedArea += (xs[i] - xs[i - 1]) * span;
  }
  const bounds = clipped.length ? {
    min: [Math.min(...clipped.map(r => r[0])), Math.min(...clipped.map(r => r[1]))],
    max: [Math.max(...clipped.map(r => r[2])), Math.max(...clipped.map(r => r[3]))],
  } : null;

  return {
    state: "available" as const,
    logical_canvas: { width, height },
    packing: {
      units: "logical_uv_units" as const,
      face_area: reusable.reduce((sum, usage) => sum + uvRectArea(usage.rect), 0),
      occupied_area: occupiedArea,
      occupancy_ratio: occupiedArea / (width * height),
      occupied_bounds: bounds,
      occupied_size: bounds ? [bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1]] : [0, 0],
      padding: "unverified" as const,
      // Native Box-UV nets contain valid touching faces. A global face-gap
      // threshold cannot certify island padding or a smaller feasible atlas.
    },
    enabled_faces: usages.length,
    valid_uv_faces: valid.length,
    invalid_uv: {
      count: invalidUv.length,
      ...invalidBounded,
    },
    out_of_bounds: {
      count: outOfBounds.length,
      ...outOfBoundsBounded,
    },
    fractional_uv: {
      count: fractionalUv.length,
      ...fractionalBounded,
    },
    non_integral_pixel_mapping: {
      count: nonIntegralPixels.length,
      ...boundedExamples(nonIntegralPixels.map(uvUsageExample), exampleLimit),
    },
    degenerate_uv: {
      count: degenerateUv.length,
      ...degenerateBounded,
    },
    collapsed_surface_uv: {
      count: collapsedSurfaceUv.length,
      ...boundedExamples(collapsedSurfaceUv.map(uvUsageExample), exampleLimit),
    },
    unlocked_box_uv_cubes: {
      count: unlocked.length,
      ...unlockedBounded,
    },
    exact_reuse: {
      region_count: exactReuseGroups.length,
      ...reuseBounded,
    },
    partial_overlap: {
      pair_count: partialOverlapPairCount,
      examples: partialOverlapExamples,
      examples_truncated: partialOverlapPairCount > partialOverlapExamples.length,
    },
    production_gate: {
      state: reasons.length === 0 ? ("ready" as const) : ("review_required" as const),
      reasons,
    },
  };
}

const CUBE_FACE_KEYS = [
  "north",
  "south",
  "east",
  "west",
  "up",
  "down",
] as const;

function collectUvAtlasUsages(): UvAtlasUsage[] {
  if (!Project) return [];

  const usages: UvAtlasUsage[] = [];
  for (const cube of Cube.all) {
    for (const faceKey of CUBE_FACE_KEYS) {
      const face = cube.faces[faceKey];
      if (!face || face.enabled === false || face.texture === null) continue;
      const size = cube.size();
      const texture = face.getTexture();
      const axes = faceKey === "up" || faceKey === "down" ? [0, 2] : faceKey === "east" || faceKey === "west" ? [2, 1] : [0, 1];
      usages.push({
        cube_uuid: cube.uuid,
        cube_name: cube.name,
        face: faceKey,
        uv: [...face.uv],
        box_uv: cube.box_uv === true,
        autouv: cube.autouv,
        mirror_uv: cube.mirror_uv === true,
        face_rotation: face.rotation,
        surface_area: Math.abs(size[axes[0]] * size[axes[1]]),
        pixel_scale: texture ? [
          texture.width / texture.getUVWidth(),
          texture.height / texture.getUVHeight(),
        ] : undefined,
      });
    }
  }
  return usages;
}

function textureGroupFor(texture: Texture): TextureGroup | null {
  if (!texture.group) return null;
  return (
    TextureGroup.all.find(
      (group: TextureGroup) => group.uuid === texture.group
    ) ?? null
  );
}

function textureProductionRole(texture: Texture): TextureProductionRole {
  const group = textureGroupFor(texture);
  return classifyTextureProductionRole({
    pbr_channel: texture.pbr_channel ?? "color",
    has_group: Boolean(texture.group),
    group_is_material: group?.is_material ?? null,
  });
}

function safeTextureRatio(
  pixels: number,
  uvUnits: number
): number | null {
  if (
    !Number.isFinite(pixels) ||
    !Number.isFinite(uvUnits) ||
    pixels <= 0 ||
    uvUnits <= 0
  ) {
    return null;
  }
  return pixels / uvUnits;
}

function textureInventoryEntry(texture: Texture) {
  const group = textureGroupFor(texture);
  const uvWidth = texture.getUVWidth();
  const uvHeight = texture.getUVHeight();
  const displayHeight = texture.display_height;

  return {
    name: texture.name,
    uuid: texture.uuid,
    id: texture.id,
    role: textureProductionRole(texture),
    group: group
      ? {
          uuid: group.uuid,
          name: group.name,
          is_material: group.is_material,
        }
      : null,
    pbr_channel: texture.pbr_channel || "color",
    is_default: Texture.getDefault()?.uuid === texture.uuid,
    is_selected: Texture.selected?.uuid === texture.uuid,
    bitmap: {
      width: texture.width,
      height: texture.height,
      display_height: displayHeight,
    },
    logical_uv: {
      width: uvWidth,
      height: uvHeight,
    },
    physical_pixels_per_uv_unit: {
      x: safeTextureRatio(texture.width, uvWidth),
      y: safeTextureRatio(displayHeight, uvHeight),
    },
    animated: texture.height !== displayHeight,
    render_mode: texture.render_mode,
    render_sides: texture.render_sides,
  };
}

function currentTextureInventory() {
  const textures = Project?.textures ?? Texture.all;
  const entries = textures.map(textureInventoryEntry);
  const baseColorCandidates = entries.filter(
    (entry) => entry.role === "base_color_candidate"
  );
  const explicitVariants = entries.filter(
    (entry) => entry.role === "explicit_variant"
  );
  const pbrSupport = entries.filter(
    (entry) => entry.role === "pbr_support"
  );

  return {
    state:
      baseColorCandidates.length === 0
        ? ("none" as const)
        : baseColorCandidates.length === 1
          ? ("single" as const)
          : ("fragmented" as const),
    base_color_candidates: baseColorCandidates.map((entry) => ({
      uuid: entry.uuid,
      name: entry.name,
      group: entry.group,
      bitmap: entry.bitmap,
    })),
    explicit_variants: explicitVariants.map((entry) => ({
      uuid: entry.uuid,
      name: entry.name,
      group: entry.group,
      bitmap: entry.bitmap,
    })),
    pbr_support: pbrSupport.map((entry) => ({
      uuid: entry.uuid,
      name: entry.name,
      pbr_channel: entry.pbr_channel,
      group: entry.group,
      bitmap: entry.bitmap,
    })),
    default_texture_uuid: Texture.getDefault()?.uuid ?? null,
    selected_texture_uuid: Texture.selected?.uuid ?? null,
    textures: entries,
  };
}

function requireTextureCreationPreflight(params: {
  width: number;
  height: number;
  data?: string;
  pbr_channel?: z.infer<typeof pbrChannelEnum>;
  textureGroup?: TextureGroup;
}): void {
  const requestedRole = classifyTextureProductionRole({
    pbr_channel: params.pbr_channel ?? "color",
    has_group: Boolean(params.textureGroup),
    group_is_material: params.textureGroup?.is_material ?? null,
  });

  const existingTextures = Project?.textures ?? Texture.all;
  const existingBase = existingTextures.filter(
    (texture) => textureProductionRole(texture) === "base_color_candidate"
  );

  if (requestedRole === "base_color_candidate") {
    if (existingBase.length > 0) {
      const [first] = existingBase;
      throw new Error(
        `A base-color atlas already exists: "${first.name}" (${first.uuid}). Reuse that atlas instead of creating a color texture per body part/material zone. Explicit color variants must be placed in an explicit non-material TextureGroup.`
      );
    }
    if (
      params.data === undefined &&
      !isAiProductionColorCanvas(params.width, params.height) &&
      !isProvisionalTextureCanvas(params.width, params.height)
    ) {
      throw new Error(
        `New AI-authored base-color atlases must use a square 128-based canvas (128, 256, 384, 512, ...) for production; provisional 16-based 16..1024 also allowed. Received ${params.width}×${params.height}. Existing imported texture data may retain authored dimensions.`
      );
    }
    return;
  }

  if (requestedRole === "explicit_variant") {
    if (existingBase.length !== 1) {
      throw new Error(
        `An explicit color variant requires exactly one established base-color atlas; found ${existingBase.length}. Resolve the base atlas first.`
      );
    }
    if (
      params.data === undefined &&
      (params.width !== existingBase[0].width ||
        params.height !== existingBase[0].height)
    ) {
      throw new Error(
        `A new AI-authored color variant must match the base atlas bitmap size ${existingBase[0].width}×${existingBase[0].height}; received ${params.width}×${params.height}.`
      );
    }
    return;
  }

  if (params.textureGroup?.is_material !== true) {
    throw new Error(
      "PBR support textures require an explicit material TextureGroup. Use create_pbr_material/add the support texture to that material instead of a variant/non-material group."
    );
  }

  if (params.data !== undefined) return;

  if (existingBase.length !== 1) {
    throw new Error(
      `A new PBR support texture requires exactly one established base-color atlas; found ${existingBase.length}. Create/resolve the base atlas first.`
    );
  }
  if (
    params.width !== existingBase[0].width ||
    params.height !== existingBase[0].height
  ) {
    throw new Error(
      `New PBR support textures must match the base atlas bitmap size ${existingBase[0].width}×${existingBase[0].height}; received ${params.width}×${params.height}.`
    );
  }
}

// ============================================================================
// Tool Registration
// ============================================================================

// Native generateTemplate owns its Undo edit, but cancellation discards its save
// without reverting. Retain a native snapshot until the returned atlas is accepted.
export async function runNativeTemplateEdit<T>(generate: () => Promise<void>, accept: () => T): Promise<T> {
  if (Undo.current_save) throw new Error("Finish the current edit before generating a template.");
  const project = Project;
  const saved = project.saved;
  const history = [...Undo.history];
  const index = Undo.index;
  const aspects = (): UndoAspects => ({ elements: [...Cube.all], textures: [...Texture.all], bitmap: true, uv_only: true, uv_mode: true, selected_texture: true, texture_order: true });
  Undo.initEdit(aspects());
  const before = Undo.current_save!;
  Undo.cancelEdit(false);
  try {
    await generate();
    const entry = Undo.history[Undo.index - 1];
    if (!entry || history.includes(entry)) throw new Error("Native template generation was cancelled before completion.");
    const result = accept();
    // Include the existing atlas in rebuild Undo, and any post-generation metadata.
    Undo.initEdit(aspects());
    entry.before = before;
    entry.post = Undo.current_save!;
    Undo.cancelEdit(false);
    return result;
  } catch (error) {
    Undo.initEdit(aspects());
    const current = Undo.current_save!;
    Undo.cancelEdit(false);
    Undo.loadSave(before, current);
    Undo.history.splice(0, Undo.history.length, ...history);
    Undo.index = index;
    project.saved = saved;
    Canvas.updateAll();
    throw error;
  } finally {
    if (Dialog.open?.id === "generate_template_progress") Dialog.open.hide();
    Blockbench.setProgress(0);
  }
}

export function registerTextureTools() {
  createTool(textureToolDocs[0].name, {
    ...textureToolDocs[0],
    parameters: createTextureParameters,
    async execute({
      name,
      texture_id,
      type,
      width,
      height,
      pixel_density,
      rearrange_uv,
      power_of_two,
      keep_multi_texture_occupancy,
      padding,
      data,
      pbr_channel,
      fill_color,
      group,
      layer_name,
      render_mode,
      render_sides,
    }) {
      const textureGroup =
        group !== undefined ? resolveTextureToolMaterial(group) : undefined;

      const rebuildTexture = texture_id === undefined ? undefined : resolveCoreTexture(texture_id, "Use list_textures to identify the base atlas.");
      if (rebuildTexture) {
        const baseAtlases = Texture.all.filter(texture => textureProductionRole(texture) === "base_color_candidate");
        if (baseAtlases.length !== 1 || baseAtlases[0] !== rebuildTexture) {
          throw new Error("Template rebuild requires the single existing base-color atlas.");
        }
        if (Texture.all.some(texture => texture !== rebuildTexture)) {
          throw new Error("Rebuild UV before adding variants or PBR channels; dependent atlases require matching remapping.");
        }
      } else requireTextureCreationPreflight({
        width,
        height,
        data,
        pbr_channel,
        textureGroup,
      });

      if (type === "template") {
        if (group !== undefined) {
          throw new Error(
            "Template mode creates the single base-color atlas; assign it to a material group after UV generation."
          );
        }

        const generator = (
          globalThis as typeof globalThis & {
            TextureGenerator?: {
              generateTemplate: (
                options: Record<string, unknown>,
                callback: (dataUrl: string) => Texture
              ) => Promise<void>;
            };
          }
        ).TextureGenerator;
        if (!generator?.generateTemplate) {
          throw new Error(
            "Blockbench TextureGenerator is unavailable. Reload BlockIT/Blockbench before creating a texture template."
          );
        }

        // The native callback route uses all visible elements for Bedrock's
        // single atlas; changing the user's selection is unnecessary.
        if (!Cube.all.some(cube => cube.visibility)) {
          throw new Error(
            "Template generation requires at least one visible Cube."
          );
        }

        const nativeColor = fill_color
          ? (globalThis as typeof globalThis & { tinycolor?: (value: unknown) => unknown })
            .tinycolor?.(
              Array.isArray(fill_color)
                ? {
                  r: Number(fill_color[0]),
                  g: Number(fill_color[1]),
                  b: Number(fill_color[2]),
                  a: Number(fill_color[3] ?? 255) / 255,
                }
                : fill_color
            )
          : undefined;

        let templateTexture: Texture | undefined;
        return await runNativeTemplateEdit(async () => {
            await generator.generateTemplate({
              name,
              type: "template",
              resolution: pixel_density,
              color: nativeColor,
              rearrange_uv,
              power: power_of_two,
              double_use: keep_multi_texture_occupancy,
              padding,
              particle: "auto",
              texture: rebuildTexture ?? Texture.getDefault(),
            }, (dataUrl: string) => {
                templateTexture = rebuildTexture
                  ? rebuildTexture.updateSource(dataUrl)
                  : new Texture({ name, keep_size: true }).fromDataURL(dataUrl).add(false).select();
                return templateTexture;
            });
            if (templateTexture) await templateTexture.img.decode();
            Canvas.updateAll();
        }, () => {
        if (!templateTexture) {
          throw new Error("Blockbench did not return the generated texture template.");
        }
        const templateUvAudit = buildUvAtlasAudit(
          collectUvAtlasUsages(),
          templateTexture.getUVWidth(),
          templateTexture.getUVHeight()
        );
        if (
          templateUvAudit.state !== "available" ||
          templateUvAudit.invalid_uv.count > 0 ||
          templateUvAudit.out_of_bounds.count > 0 ||
          templateUvAudit.production_gate.state !== "ready"
        ) {
          throw new Error(
            `Native template generation finished without a valid UV atlas. The edit was rolled back; inspect the affected geometry/UV before retrying. Reasons: ${templateUvAudit.state === "available" ? templateUvAudit.production_gate.reasons.join(", ") : templateUvAudit.reason}`
          );
        }
        templateTexture.render_mode = render_mode;
        templateTexture.render_sides = render_sides;
        if (fill_color && layer_name) {
          templateTexture.activateLayers(false);
          templateTexture.getActiveLayer().name = layer_name;
        }
        Canvas.updateAll();

        const templateResult = {
          texture: {
            ...textureInventoryEntry(templateTexture),
            uuid: templateTexture.uuid,
          },
          template: {
            pixel_density,
            pixels_per_model_unit: pixel_density / 16,
            rearranged_uv: rearrange_uv,
            power_of_two: power_of_two,
            keep_multi_texture_occupancy,
            padding,
            uv_locked: true,
          },
          uv_audit: templateUvAudit,
          rebuilt: Boolean(rebuildTexture),
        };
        return {
          content: [
            {
              type: "text" as const,
              text: `Created texture template "${templateTexture.name}" (${templateTexture.uuid}) with native UV generation at ${pixel_density}x. Paint only after inspecting the returned UV/atlas evidence.`,
            },
          ],
          structuredContent: templateResult,
        };
        });
      }

      Undo.initEdit({
        textures: [],
        collections: [],
      });

      let texture!: Texture;

      try {
        texture = new Texture({
          name,
          width,
          height,
          group: textureGroup?.uuid,
          pbr_channel,
          render_mode,
          render_sides,
          internal: true,
        });

        if (data) {
          if (data.startsWith("data:image/")) {
            texture.source = data;
            texture.width = width;
            texture.height = height;
          } else {
            texture = texture.fromFile({
              name: data.split(/[\/\\]/).pop() || data,
              path: data.replace(/^file:\/\//, ""),
            });
          }

          texture.load();
          texture.fillParticle();
          texture.layers_enabled = false;
        } else {
          const { ctx } = texture.getActiveCanvas();

          if (
            ctx.canvas.width !== texture.width ||
            ctx.canvas.height !== texture.height
          ) {
            ctx.canvas.width = texture.width;
            ctx.canvas.height = texture.height;
          }

          if (fill_color) {
            const color = Array.isArray(fill_color)
              // @ts-ignore - tinycolor is available globally in Blockbench
              ? tinycolor({
                r: Number(fill_color[0]),
                g: Number(fill_color[1]),
                b: Number(fill_color[2]),
                a: Number(fill_color[3] ?? 255) / 255,
              })
              // @ts-ignore - tinycolor ok
              : tinycolor(fill_color);

            ctx.fillStyle = color.toRgbString().toLowerCase();
            ctx.fillRect(0, 0, texture.width, texture.height);
          } else {
            ctx.clearRect(0, 0, texture.width, texture.height);
          }

          texture.updateSource(ctx.canvas.toDataURL("image/png", 1));
          texture.updateLayerChanges(true);
        }

        texture.add();

        if (fill_color && layer_name) {
          texture.activateLayers(false);
          texture.getActiveLayer().name = layer_name;
        }

        Undo.finishEdit("Agent created texture", {
          textures: [texture],
          collections: [],
        });
      } catch (error) {
        if (texture) texture.remove(true);
        Undo.cancelEdit();
        Canvas.updateAll();
        throw error;
      }

      Canvas.updateAll();

      const result = {
        texture: {
          ...textureInventoryEntry(texture),
          uuid: texture.uuid,
        },
      };
      return {
        content: [
          {
            type: "text" as const,
            text: `Created texture "${texture.name}" (${texture.uuid}). Use get_texture only when image evidence is needed.`,
          },
        ],
        structuredContent: result,
      };
    },
  }, textureToolDocs[0].status);

  registerTextureAssignmentTools();

createTool(textureToolDocs[3].name, {
    ...textureToolDocs[3],
    parameters: listTexturesParameters,
    async execute({ diagnostics }) {
      const inventory = currentTextureInventory();
      const uvAudit = diagnostics === false ? null : buildUvAtlasAudit(
        collectUvAtlasUsages(),
        Project?.texture_width ?? null,
        Project?.texture_height ?? null
      );
      const uvGate =
        uvAudit?.state === "available"
          ? uvAudit.production_gate.state
          : diagnostics === false ? "not_requested" : "unavailable";
      const result = {
        logical_uv: {
          width: Project?.texture_width ?? null,
          height: Project?.texture_height ?? null,
        },
        atlas_state: {
          state: inventory.state,
          base_color_candidates: inventory.base_color_candidates,
          explicit_variants: inventory.explicit_variants,
          pbr_support: inventory.pbr_support,
          default_texture_uuid: inventory.default_texture_uuid,
          selected_texture_uuid: inventory.selected_texture_uuid,
        },
        ...(uvAudit ? { uv_audit: uvAudit } : {}),
        textures: inventory.textures,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${inventory.textures.length} texture(s); base-color atlas state: ${inventory.state}; UV atlas gate: ${uvGate}.`,
          },
        ],
        structuredContent: result,
      };
    },
  }, textureToolDocs[3].status);

  createTool(textureToolDocs[4].name, {
    ...textureToolDocs[4],
    parameters: getTextureParameters,
    async execute({ texture }) {
      const available = Project?.textures ?? Texture.all;
      if (!texture && available.length > 1) {
        throw new Error(
          "Multiple textures are loaded. Pass texture explicitly so atlas evidence cannot drift to implicit default state."
        );
      }
      const image = texture
        ? resolveGetTextureTexture(texture)
        : Texture.getDefault();
      if (!image) {
        throw new Error(
          "No default texture available. Use the create_texture tool to create one first, or specify a texture ID."
        );
      }

      const imageResult = imageContent({ url: image.getDataURL() });
      return {
        ...imageResult,
        structuredContent: {
          inspection: "full_atlas",
          texture: textureInventoryEntry(image),
        },
      };
    },
  }, textureToolDocs[4].status);

  registerTextureMaterialTools();

  registerTextureActivationTool();
}
