import { readFile, stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import {
  emptyReference,
  parseReferencePackage,
} from "./referenceParser";
import type { ControlReferenceProjection } from "./referenceTypes";
import { inspectReferenceImages } from "./referenceImageEvidence";
import { fileMetadataSignature } from "./fileSignature";

export type {
  ControlProfile,
  ControlReferenceAssetKind,
  ControlReferenceProjection,
  ControlReferenceSemanticFacts,
  ControlReferenceStage,
  ControlReferenceStructuredFact,
} from "./referenceTypes";

export const REFERENCE_FACT_PAGE_SECTIONS = [
  "parts", "articulation", "materials", "animation_guidance", "constraints",
  "unknowns.blocking", "unknowns.non_blocking",
] as const;
export type ReferenceFactPageSection = typeof REFERENCE_FACT_PAGE_SECTIONS[number];

export type ReferenceFactPage = {
  section: ReferenceFactPageSection;
  reference_fingerprint: string;
  offset: number;
  limit: number;
  total_count: number;
  returned_count: number;
  has_more: boolean;
  items: unknown[];
};

/**
 * Explicit, read-only recovery of canonical REFERENCE.json facts that were
 * omitted from a bounded Control projection. Never silently truncate a page.
 * Client must pin the current Reference fingerprint before requesting data.
 */
export async function readReferenceFactPage(
  inputPath: string,
  request: {
    section: ReferenceFactPageSection;
    offset: number;
    limit: number;
    expectedFingerprint: string;
  }
): Promise<ReferenceFactPage> {
  const sourcePath = referencePath(inputPath);
  if (!sourcePath) throw new Error("REFERENCE_FACT_CONTEXT_REQUIRED: reference path missing.");
  if (!Number.isInteger(request.offset) || request.offset < 0 ||
      !Number.isInteger(request.limit) || request.limit < 1 || request.limit > 24 ||
      !REFERENCE_FACT_PAGE_SECTIONS.includes(request.section)) {
    throw new Error("REFERENCE_FACT_PAGE_INVALID: section, offset or limit is invalid.");
  }
  // Retain the existing package size boundary. Reject, do not clip, oversize input.
  const info = await stat(sourcePath);
  if (!info.isFile() || info.size > MAX_REFERENCE_PACKAGE_BYTES) {
    throw new Error("REFERENCE_FACT_SOURCE_INVALID: source is not a valid bounded file.");
  }
  const raw = await readFile(sourcePath, "utf8");
  if (Buffer.byteLength(raw, "utf8") > MAX_REFERENCE_PACKAGE_BYTES) {
    throw new Error("REFERENCE_FACT_SOURCE_INVALID: source grew during reading.");
  }
  const projection = parseReferencePackage(raw, sourcePath, dirname(sourcePath));
  if (!projection?.fingerprint) {
    throw new Error("REFERENCE_FACT_SOURCE_INVALID: canonical REFERENCE.json is malformed.");
  }
  if (projection.fingerprint !== request.expectedFingerprint) {
    throw new Error("REFERENCE_FACT_REVISION_CHANGED: reorient through status before retrieving more facts.");
  }
  const document = JSON.parse(raw) as Record<string, unknown>;
  const unknowns = document.unknowns && typeof document.unknowns === "object" &&
    !Array.isArray(document.unknowns)
      ? document.unknowns as Record<string, unknown> : {};
  const values = request.section === "unknowns.blocking" ? unknowns.blocking
    : request.section === "unknowns.non_blocking" ? unknowns.non_blocking
    : document[request.section];
  if (values !== undefined && !Array.isArray(values)) {
    throw new Error("REFERENCE_FACT_SOURCE_INVALID: section is not an array.");
  }
  const all = (values ?? []) as unknown[];
  if (request.offset > all.length) {
    throw new Error("REFERENCE_FACT_OFFSET_OUT_OF_RANGE: start at a valid source index.");
  }
  const items = all.slice(request.offset, request.offset + request.limit);
  // Byte ceiling covers raw nested values, not only entry count. A large item
  // fails explicitly; the client can narrow the request or read the source file.
  if (Buffer.byteLength(JSON.stringify(items), "utf8") > 16 * 1024) {
    throw new Error("REFERENCE_FACT_PAGE_TOO_LARGE: reduce limit or read the canonical source section directly.");
  }
  return {
    section: request.section,
    reference_fingerprint: projection.fingerprint,
    offset: request.offset,
    limit: request.limit,
    total_count: all.length,
    returned_count: items.length,
    has_more: request.offset + items.length < all.length,
    items,
  };
}

type CachedReference = {
  signature: string;
  projection: ControlReferenceProjection;
};

const MAX_REFERENCE_PACKAGE_BYTES = 1024 * 1024;
const cache = new Map<string, CachedReference>();

function referencePath(input?: string | null): string | null {
  if (!input) return null;
  return basename(input).toLowerCase() === "reference.json"
    ? input
    : join(input, "REFERENCE.json");
}

export async function readReferencePackageProjection(
  inputPath?: string | null
): Promise<ControlReferenceProjection> {
  const sourcePath = referencePath(inputPath);
  if (!sourcePath) {
    return emptyReference("REFERENCE_PATH_UNAVAILABLE");
  }

  try {
    const info = await stat(sourcePath);
    if (!info.isFile() || info.size > MAX_REFERENCE_PACKAGE_BYTES) {
      return {
        ...emptyReference("REFERENCE_INVALID"),
        source_path: sourcePath,
        package_root: dirname(sourcePath),
      };
    }

    const signature = fileMetadataSignature(info);
    const cached = cache.get(sourcePath);
    if (cached?.signature === signature) {
      return inspectReferenceImages(cached.projection);
    }

    const raw = await readFile(sourcePath, "utf8");
    const projection = parseReferencePackage(
      raw,
      sourcePath,
      dirname(sourcePath)
    );

    if (!projection) {
      return {
        ...emptyReference("REFERENCE_INVALID"),
        source_path: sourcePath,
        package_root: dirname(sourcePath),
      };
    }

    cache.set(sourcePath, { signature, projection });
    return inspectReferenceImages(projection);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    return {
      ...emptyReference(
        code === "ENOENT"
          ? "REFERENCE_NOT_FOUND"
          : "REFERENCE_UNREADABLE"
      ),
      source_path: sourcePath,
      package_root: dirname(sourcePath),
    };
  }
}
