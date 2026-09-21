import { readFile, stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import {
  emptyReference,
  parseReferencePackage,
} from "./referenceParser";
import type { ControlReferenceProjection } from "./referenceTypes";

export type {
  ControlProfile,
  ControlReferenceAssetKind,
  ControlReferenceProjection,
  ControlReferenceStage,
} from "./referenceTypes";

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

    const signature = `${info.size}:${info.mtimeMs}`;
    const cached = cache.get(sourcePath);
    if (cached?.signature === signature) {
      return cached.projection;
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
    return projection;
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
