import { createHash } from "node:crypto";
import { canonicalJson } from "../../lib/semantic/canonical";
import type {
  ControlProfile,
  ControlReferenceAssetKind,
  ControlReferenceProjection,
  ControlReferenceStage,
} from "./referenceTypes";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function stringList(value: unknown, limit = 16): string[] {
  return Array.isArray(value)
    ? value
        .filter(
          (entry): entry is string =>
            typeof entry === "string" && entry.trim().length > 0
        )
        .map((entry) => entry.trim())
        .slice(0, limit)
    : [];
}

function profileValue(value: unknown): ControlProfile | null {
  const candidate = stringValue(value);
  return candidate &&
    [
      "PROP_FURNITURE",
      "VEHICLE",
      "HUMANOID",
      "CREATURE",
      "MECHANICAL",
      "PLANT_FOLIAGE",
      "GENERIC",
    ].includes(candidate)
    ? (candidate as ControlProfile)
    : null;
}

function assetKindValue(value: unknown): ControlReferenceAssetKind | null {
  const candidate = stringValue(value)?.toUpperCase();
  return candidate === "MODEL" || candidate === "PARTICLE" ? candidate : null;
}

function normalizeStage(value: unknown): ControlReferenceStage | null {
  const candidate = stringValue(value)?.toUpperCase();
  if (
    candidate === "GEOMETRY" ||
    candidate === "TEXTURE" ||
    candidate === "ANIMATION"
  ) {
    return candidate;
  }
  return null;
}

export function emptyReference(
  unavailableReason: NonNullable<
    ControlReferenceProjection["unavailable_reason"]
  >
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
    readiness: {
      overall: null,
      geometry: null,
      texture: null,
      animation: null,
    },
    particle: null,
    blocking_unknowns: [],
    non_blocking_unknowns: [],
    documents: {},
    images: [],
    unavailable_reason: unavailableReason,
  };
}

export function parseReferencePackage(
  raw: string,
  sourcePath: string,
  packageRoot: string
): ControlReferenceProjection | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  const root = record(parsed);
  if (!root || stringValue(root.schema) !== "lazydesigner-reference-v1") {
    return null;
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
  const assetKind =
    assetKindValue(asset?.kind) ?? (selectedProfile ? "MODEL" : null);
  const imageEntries = Array.isArray(root.images) ? root.images : [];
  const images = imageEntries.flatMap((entry) => {
    const item = record(entry);
    if (!item) return [];
    const id = stringValue(item.id);
    const file = stringValue(item.file);
    if (!id || !file) return [];
    const usedBy = (Array.isArray(item.used_by) ? item.used_by : [])
      .map(normalizeStage)
      .filter(
        (stage): stage is ControlReferenceStage => stage !== null
      );
    return [{
      id,
      file,
      role: stringValue(item.role),
      used_by: [...new Set(usedBy)],
      status: stringValue(item.status),
    }];
  });

  return {
    available: true,
    source_path: sourcePath,
    package_root: packageRoot,
    fingerprint: createHash("sha256")
      .update(canonicalJson(parsed))
      .digest("hex"),
    schema: "lazydesigner-reference-v1",
    asset_name: stringValue(asset?.name),
    asset_kind: assetKind,
    intent: stringValue(asset?.intent),
    selected_profile: selectedProfile,
    requirements: {
      dimensions_blocks: dimensions
        ? {
            width: numberOrNull(dimensions.width),
            height: numberOrNull(dimensions.height),
            length: numberOrNull(dimensions.length),
          }
        : null,
      player_relative_scale: stringValue(
        requirements?.player_relative_scale
      ),
      animation_required: boolOrNull(requirements?.animation_required),
    },
    readiness: {
      overall: stringValue(readiness?.overall),
      geometry: stringValue(readiness?.geometry),
      texture: stringValue(readiness?.texture),
      animation: stringValue(readiness?.animation),
    },
    particle:
      assetKind === "PARTICLE"
        ? {
            identifier: stringValue(particle?.identifier),
            particle_json: stringValue(particle?.particle_json),
            texture_reference: stringValue(particle?.texture_reference),
            texture_png: stringValue(particle?.texture_png),
            texture_state: stringValue(particle?.texture_state),
            recommended_locator: stringValue(
              particle?.recommended_locator
            ),
            recommended_animation: stringValue(
              particle?.recommended_animation
            ),
            trigger_intent: stringValue(particleTrigger?.intent),
            trigger_time_seconds: numberOrNull(
              particleTrigger?.time_seconds
            ),
            bind_to_actor: boolOrNull(particle?.bind_to_actor),
            review_state: stringValue(particle?.review_state),
          }
        : null,
    blocking_unknowns: stringList(unknowns?.blocking),
    non_blocking_unknowns: stringList(unknowns?.non_blocking),
    documents: {
      ...(stringValue(documents?.geometry)
        ? { GEOMETRY: stringValue(documents?.geometry)! }
        : {}),
      ...(stringValue(documents?.texture)
        ? { TEXTURE: stringValue(documents?.texture)! }
        : {}),
      ...(stringValue(documents?.animation)
        ? { ANIMATION: stringValue(documents?.animation)! }
        : {}),
    },
    images,
  };
}
