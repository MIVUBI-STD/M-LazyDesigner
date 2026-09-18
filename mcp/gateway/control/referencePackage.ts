import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

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
  unavailable_reason?: "REFERENCE_PATH_UNAVAILABLE" | "REFERENCE_NOT_FOUND" | "REFERENCE_UNREADABLE" | "REFERENCE_INVALID";
};

type JsonRecord = Record<string, unknown>;

type CachedReference = {
  signature: string;
  projection: ControlReferenceProjection;
};

const MAX_REFERENCE_PACKAGE_BYTES = 1024 * 1024;
const cache = new Map<string, CachedReference>();

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function stringList(value: unknown, limit = 16): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      .map((entry) => entry.trim())
      .slice(0, limit)
    : [];
}

function profileValue(value: unknown): ControlProfile | null {
  const candidate = stringValue(value);
  return candidate && [
    "PROP_FURNITURE",
    "VEHICLE",
    "HUMANOID",
    "CREATURE",
    "MECHANICAL",
    "PLANT_FOLIAGE",
    "GENERIC",
  ].includes(candidate)
    ? candidate as ControlProfile
    : null;
}

function assetKindValue(value: unknown): ControlReferenceAssetKind | null {
  const candidate = stringValue(value)?.toUpperCase();
  return candidate === "MODEL" || candidate === "PARTICLE"
    ? candidate
    : null;
}

function normalizeStage(value: unknown): ControlReferenceStage | null {
  const candidate = stringValue(value)?.toUpperCase();
  if (candidate === "GEOMETRY" || candidate === "TEXTURE" || candidate === "ANIMATION") {
    return candidate;
  }
  return null;
}

function referencePath(input?: string | null): string | null {
  if (!input) return null;
  return basename(input).toLowerCase() === "reference.json" ? input : join(input, "REFERENCE.json");
}

export async function readReferencePackageProjection(
  inputPath?: string | null
): Promise<ControlReferenceProjection> {
  const sourcePath = referencePath(inputPath);
  if (!sourcePath) return emptyReference("REFERENCE_PATH_UNAVAILABLE");

  try {
    const info = await stat(sourcePath);
    if (!info.isFile() || info.size > MAX_REFERENCE_PACKAGE_BYTES) {
      return {
        ...emptyReference("REFERENCE_INVALID"),
        source_path: sourcePath,
        package_root: dirname(sourcePath),
      };
    }
    const signature = `${info.size}:${info.mtimeMs}`;
    const cached = cache.get(sourcePath);
    if (cached?.signature === signature) return cached.projection;

    const raw = await readFile(sourcePath, "utf8");
    const root = record(JSON.parse(raw) as unknown);
    if (!root || stringValue(root.schema) !== "lazydesigner-reference-v1") {
      return { ...emptyReference("REFERENCE_INVALID"), source_path: sourcePath, package_root: dirname(sourcePath) };
    }

    const asset = record(root.asset);
    const requirements = record(root.requirements);
    const dimensions = record(requirements?.dimensions_blocks);
    const readiness = record(root.readiness);
    const unknowns = record(root.unknowns);
    const documents = record(root.documents);
    const particle = record(root.particle);
    const particleTrigger = record(particle?.trigger);
    const selectedProfile = profileValue(asset?.profile);
    const assetKind = assetKindValue(asset?.kind) ?? (selectedProfile ? "MODEL" : null);
    const imageEntries = Array.isArray(root.images) ? root.images : [];
    const images = imageEntries.flatMap((entry) => {
      const item = record(entry);
      if (!item) return [];
      const id = stringValue(item.id);
      const file = stringValue(item.file);
      if (!id || !file) return [];
      const usedBy = (Array.isArray(item.used_by) ? item.used_by : [])
        .map(normalizeStage)
        .filter((stage): stage is ControlReferenceStage => stage !== null);
      return [{
        id,
        file,
        role: stringValue(item.role),
        used_by: [...new Set(usedBy)],
        status: stringValue(item.status),
      }];
    });

    const projection: ControlReferenceProjection = {
      available: true,
      source_path: sourcePath,
      package_root: dirname(sourcePath),
      fingerprint: createHash("sha256").update(raw).digest("hex"),
      schema: "lazydesigner-reference-v1",
      asset_name: stringValue(asset?.name),
      asset_kind: assetKind,
      intent: stringValue(asset?.intent),
      selected_profile: selectedProfile,
      requirements: {
        dimensions_blocks: dimensions ? {
          width: numberOrNull(dimensions.width),
          height: numberOrNull(dimensions.height),
          length: numberOrNull(dimensions.length),
        } : null,
        player_relative_scale: stringValue(requirements?.player_relative_scale),
        animation_required: boolOrNull(requirements?.animation_required),
      },
      readiness: {
        overall: stringValue(readiness?.overall),
        geometry: stringValue(readiness?.geometry),
        texture: stringValue(readiness?.texture),
        animation: stringValue(readiness?.animation),
      },
      particle: assetKind === "PARTICLE" ? {
        identifier: stringValue(particle?.identifier),
        particle_json: stringValue(particle?.particle_json),
        texture_reference: stringValue(particle?.texture_reference),
        texture_png: stringValue(particle?.texture_png),
        texture_state: stringValue(particle?.texture_state),
        recommended_locator: stringValue(particle?.recommended_locator),
        recommended_animation: stringValue(particle?.recommended_animation),
        trigger_intent: stringValue(particleTrigger?.intent),
        trigger_time_seconds: numberOrNull(particleTrigger?.time_seconds),
        bind_to_actor: boolOrNull(particle?.bind_to_actor),
        review_state: stringValue(particle?.review_state),
      } : null,
      blocking_unknowns: stringList(unknowns?.blocking),
      non_blocking_unknowns: stringList(unknowns?.non_blocking),
      documents: {
        ...(stringValue(documents?.geometry) ? { GEOMETRY: stringValue(documents?.geometry)! } : {}),
        ...(stringValue(documents?.texture) ? { TEXTURE: stringValue(documents?.texture)! } : {}),
        ...(stringValue(documents?.animation) ? { ANIMATION: stringValue(documents?.animation)! } : {}),
      },
      images,
    };

    cache.set(sourcePath, { signature, projection });
    return projection;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    return {
      ...emptyReference(code === "ENOENT" ? "REFERENCE_NOT_FOUND" : "REFERENCE_UNREADABLE"),
      source_path: sourcePath,
      package_root: dirname(sourcePath),
    };
  }
}

function emptyReference(
  unavailableReason: NonNullable<ControlReferenceProjection["unavailable_reason"]>
): ControlReferenceProjection {
  return {
    available: false,
    source_path: null,
    package_root: null,
    fingerprint: null,
    schema: null,
    asset_name: null,
    asset_kind: null,
    intent: null,
    selected_profile: null,
    requirements: {
      dimensions_blocks: null,
      player_relative_scale: null,
      animation_required: null,
    },
    readiness: { overall: null, geometry: null, texture: null, animation: null },
    particle: null,
    blocking_unknowns: [],
    non_blocking_unknowns: [],
    documents: {},
    images: [],
    unavailable_reason: unavailableReason,
  };
}
