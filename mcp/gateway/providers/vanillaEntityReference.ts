import { open, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { inflateRawSync } from "node:zlib";
import type { BackendTool, JsonRecord } from "../protocol";

export const VANILLA_ENTITY_REFERENCE_CAPABILITY =
  "get_vanilla_entity_reference";

export type VanillaEntityReferenceErrorCode =
  | "REFERENCE_SOURCE_UNAVAILABLE"
  | "REFERENCE_NOT_FOUND"
  | "REFERENCE_AMBIGUOUS"
  | "REFERENCE_PARSE_FAILED"
  | "REFERENCE_OUTPUT_TOO_LARGE"
  | "REFERENCE_INVALID_INPUT";

export class VanillaEntityReferenceError extends Error {
  constructor(
    readonly code: VanillaEntityReferenceErrorCode,
    message: string,
    readonly details: JsonRecord = {},
    readonly safeToRetry: boolean = false
  ) {
    super(message);
    this.name = "VanillaEntityReferenceError";
  }
}

export const VANILLA_ENTITY_REFERENCE_TOOL: BackendTool = {
  name: VANILLA_ENTITY_REFERENCE_CAPABILITY,
  description:
    "Read-only lazy reference for cached Minecraft Bedrock vanilla entity geometry. Use only when the user explicitly needs a vanilla mob/model/rig reference; normal authoring should not call it.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      entity: {
        type: "string",
        minLength: 1,
        description:
          "Vanilla Bedrock entity/model name, e.g. cow, iron_golem, or minecraft:cow.",
      },
      detail: {
        type: "string",
        enum: ["summary", "rig", "geometry"],
        default: "summary",
        description:
          "summary is compact; rig returns hierarchy/pivots; geometry returns cube construction.",
      },
      bone: {
        type: "string",
        minLength: 1,
        description:
          "Optional exact bone name for a focused rig/geometry read.",
      },
      variant: {
        type: "string",
        minLength: 1,
        description:
          "Optional model/geometry variant token when the cached vanilla file exposes multiple variants.",
      },
    },
    required: ["entity"],
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};

const BEDROCK_ARCHIVE_RE = /^v(\d+)\.(\d+)\.(\d+)\.(\d+)\.zip$/i;
const ENTITY_MODEL_PATH_RE =
  /(?:^|\/)resource_pack\/models\/entity\/([^/]+)\.geo\.json$/i;
const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_SIGNATURE = 0x04034b50;
const MAX_EOCD_SEARCH = 65_557;
const MAX_CENTRAL_DIRECTORY_BYTES = 32 * 1024 * 1024;
const MAX_SOURCE_ENTRY_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_OUTPUT_BYTES = 96 * 1024;
const DEFAULT_ENTITY_CACHE_SIZE = 3;

type Vec3 = [number, number, number];
type ReferenceDetail = "summary" | "rig" | "geometry";

type ZipEntry = {
  name: string;
  modelBase: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

type ZipIndex = {
  archivePath: string;
  mtimeMs: number;
  entries: ZipEntry[];
};

type GeometryDefinition = {
  identifier: string;
  description: JsonRecord;
  bones: JsonRecord[];
};

type CachedGeometryDocument = {
  archivePath: string;
  entryName: string;
  modelBase: string;
  definitions: GeometryDefinition[];
};

export type VanillaEntityReferenceProviderOptions = {
  archivePath?: string;
  cacheDirectories?: string[];
  maxOutputBytes?: number;
  entityCacheSize?: number;
};

export type VanillaEntityReferenceCallResult = JsonRecord & {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: JsonRecord;
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function finiteVec3(value: unknown): Vec3 | null {
  if (!Array.isArray(value) || value.length < 3) return null;
  const x = finiteNumber(value[0]);
  const y = finiteNumber(value[1]);
  const z = finiteNumber(value[2]);
  return x === null || y === null || z === null ? null : [x, y, z];
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^minecraft:/, "")
    .replace(/\.geo\.json$/i, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeGeometryIdentifier(value: string): string {
  return normalizeToken(value.replace(/^geometry[.:]/i, ""));
}

function uniquePaths(paths: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const rawPath of paths) {
    const value = rawPath?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

export function defaultAssetBrowserCacheDirectories(): string[] {
  const home = process.env.HOME?.trim() || homedir();
  const override = process.env.BLOCKIT_VANILLA_ASSET_CACHE_DIR;
  const appData = process.env.APPDATA?.trim();
  const xdgConfig = process.env.XDG_CONFIG_HOME?.trim();
  const cacheName = "minecraft_assets_cache";

  if (process.platform === "win32") {
    return uniquePaths([
      override,
      appData ? join(appData, "Blockbench", cacheName) : undefined,
      appData ? join(appData, "blockbench", cacheName) : undefined,
    ]);
  }

  if (process.platform === "darwin") {
    return uniquePaths([
      override,
      join(home, "Library", "Application Support", "Blockbench", cacheName),
      join(home, "Library", "Application Support", "blockbench", cacheName),
    ]);
  }

  return uniquePaths([
    override,
    xdgConfig ? join(xdgConfig, "Blockbench", cacheName) : undefined,
    xdgConfig ? join(xdgConfig, "blockbench", cacheName) : undefined,
    join(home, ".config", "Blockbench", cacheName),
    join(home, ".config", "blockbench", cacheName),
  ]);
}

function archiveVersion(name: string): [number, number, number, number] | null {
  const match = BEDROCK_ARCHIVE_RE.exec(name);
  if (!match) return null;
  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
  ];
}

function compareArchiveNamesDescending(left: string, right: string): number {
  const a = archiveVersion(left);
  const b = archiveVersion(right);
  if (!a || !b) return left.localeCompare(right);
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return b[index]! - a[index]!;
  }
  return right.localeCompare(left);
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function findLatestBedrockArchive(
  cacheDirectories: readonly string[]
): Promise<string | null> {
  for (const directory of cacheDirectories) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    const candidates = entries
      .filter((entry) => entry.isFile() && BEDROCK_ARCHIVE_RE.test(entry.name))
      .map((entry) => entry.name)
      .sort(compareArchiveNamesDescending);
    if (candidates[0]) return join(directory, candidates[0]);
  }
  return null;
}

async function readExact(
  handle: Awaited<ReturnType<typeof open>>,
  length: number,
  position: number
): Promise<Buffer> {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await handle.read(buffer, 0, length, position);
  if (bytesRead !== length) {
    throw new VanillaEntityReferenceError(
      "REFERENCE_PARSE_FAILED",
      "Cached Bedrock asset archive ended unexpectedly while reading ZIP data."
    );
  }
  return buffer;
}

async function buildZipIndex(archivePath: string): Promise<ZipIndex> {
  const archiveStat = await stat(archivePath);
  const handle = await open(archivePath, "r");
  try {
    const tailLength = Math.min(archiveStat.size, MAX_EOCD_SEARCH);
    const tail = await readExact(
      handle,
      tailLength,
      archiveStat.size - tailLength
    );
    let eocdOffset = -1;
    for (let offset = tail.length - 22; offset >= 0; offset -= 1) {
      if (tail.readUInt32LE(offset) === ZIP_EOCD_SIGNATURE) {
        eocdOffset = offset;
        break;
      }
    }
    if (eocdOffset < 0) {
      throw new VanillaEntityReferenceError(
        "REFERENCE_PARSE_FAILED",
        "Cached Bedrock asset archive has no readable ZIP directory."
      );
    }

    const totalEntries = tail.readUInt16LE(eocdOffset + 10);
    const centralSize = tail.readUInt32LE(eocdOffset + 12);
    const centralOffset = tail.readUInt32LE(eocdOffset + 16);
    if (
      totalEntries === 0xffff ||
      centralSize === 0xffffffff ||
      centralOffset === 0xffffffff
    ) {
      throw new VanillaEntityReferenceError(
        "REFERENCE_PARSE_FAILED",
        "ZIP64 cached Bedrock archives are not supported by the lightweight vanilla reference reader."
      );
    }
    if (centralSize > MAX_CENTRAL_DIRECTORY_BYTES) {
      throw new VanillaEntityReferenceError(
        "REFERENCE_PARSE_FAILED",
        "Cached Bedrock asset archive directory exceeds the vanilla reference safety bound."
      );
    }

    const central = await readExact(handle, centralSize, centralOffset);
    const entries: ZipEntry[] = [];
    let offset = 0;
    for (let index = 0; index < totalEntries; index += 1) {
      if (
        offset + 46 > central.length ||
        central.readUInt32LE(offset) !== ZIP_CENTRAL_SIGNATURE
      ) {
        throw new VanillaEntityReferenceError(
          "REFERENCE_PARSE_FAILED",
          "Cached Bedrock asset archive contains a malformed ZIP directory entry."
        );
      }
      const compressionMethod = central.readUInt16LE(offset + 10);
      const compressedSize = central.readUInt32LE(offset + 20);
      const uncompressedSize = central.readUInt32LE(offset + 24);
      const fileNameLength = central.readUInt16LE(offset + 28);
      const extraLength = central.readUInt16LE(offset + 30);
      const commentLength = central.readUInt16LE(offset + 32);
      const localHeaderOffset = central.readUInt32LE(offset + 42);
      const fileNameStart = offset + 46;
      const fileNameEnd = fileNameStart + fileNameLength;
      if (fileNameEnd > central.length) {
        throw new VanillaEntityReferenceError(
          "REFERENCE_PARSE_FAILED",
          "Cached Bedrock asset archive contains a truncated ZIP filename."
        );
      }
      const name = central.toString("utf8", fileNameStart, fileNameEnd);
      const modelMatch = ENTITY_MODEL_PATH_RE.exec(name);
      if (modelMatch?.[1]) {
        entries.push({
          name,
          modelBase: normalizeToken(modelMatch[1]),
          compressionMethod,
          compressedSize,
          uncompressedSize,
          localHeaderOffset,
        });
      }
      offset = fileNameEnd + extraLength + commentLength;
    }

    return {
      archivePath,
      mtimeMs: archiveStat.mtimeMs,
      entries,
    };
  } finally {
    await handle.close();
  }
}

async function readZipEntry(archivePath: string, entry: ZipEntry): Promise<string> {
  if (entry.uncompressedSize > MAX_SOURCE_ENTRY_BYTES) {
    throw new VanillaEntityReferenceError(
      "REFERENCE_PARSE_FAILED",
      "Vanilla entity geometry entry exceeds the source safety bound."
    );
  }
  const handle = await open(archivePath, "r");
  try {
    const localHeader = await readExact(handle, 30, entry.localHeaderOffset);
    if (localHeader.readUInt32LE(0) !== ZIP_LOCAL_SIGNATURE) {
      throw new VanillaEntityReferenceError(
        "REFERENCE_PARSE_FAILED",
        "Cached Bedrock asset archive contains an invalid local ZIP header."
      );
    }
    const fileNameLength = localHeader.readUInt16LE(26);
    const extraLength = localHeader.readUInt16LE(28);
    const dataOffset = entry.localHeaderOffset + 30 + fileNameLength + extraLength;
    const compressed = await readExact(
      handle,
      entry.compressedSize,
      dataOffset
    );
    let content: Buffer;
    if (entry.compressionMethod === 0) {
      content = compressed;
    } else if (entry.compressionMethod === 8) {
      content = inflateRawSync(compressed);
    } else {
      throw new VanillaEntityReferenceError(
        "REFERENCE_PARSE_FAILED",
        `Vanilla entity geometry uses unsupported ZIP compression method ${entry.compressionMethod}.`
      );
    }
    if (content.length > MAX_SOURCE_ENTRY_BYTES) {
      throw new VanillaEntityReferenceError(
        "REFERENCE_PARSE_FAILED",
        "Vanilla entity geometry expands beyond the source safety bound."
      );
    }
    return content.toString("utf8");
  } finally {
    await handle.close();
  }
}

function geometryDefinitions(document: unknown): GeometryDefinition[] {
  if (!isRecord(document)) {
    throw new VanillaEntityReferenceError(
      "REFERENCE_PARSE_FAILED",
      "Vanilla entity geometry JSON root is not an object."
    );
  }

  const modern = document["minecraft:geometry"];
  if (Array.isArray(modern)) {
    return modern.flatMap((raw, index) => {
      if (!isRecord(raw)) return [];
      const rawDescription = isRecord(raw.description) ? raw.description : {};
      const identifier =
        typeof rawDescription.identifier === "string"
          ? rawDescription.identifier
          : `geometry.unknown.${index}`;
      const rawBones = Array.isArray(raw.bones)
        ? raw.bones.filter(isRecord)
        : [];
      return [{ identifier, description: rawDescription, bones: rawBones }];
    });
  }

  return Object.entries(document).flatMap(([identifier, raw]) => {
    if (!identifier.startsWith("geometry.") || !isRecord(raw)) return [];
    const legacyDescription: JsonRecord = {
      identifier,
      texture_width:
        finiteNumber(raw.texture_width) ?? finiteNumber(raw.texturewidth),
      texture_height:
        finiteNumber(raw.texture_height) ?? finiteNumber(raw.textureheight),
    };
    const rawBones = Array.isArray(raw.bones)
      ? raw.bones.filter(isRecord)
      : [];
    return [{ identifier, description: legacyDescription, bones: rawBones }];
  });
}

function canonicalModelPath(entryName: string): string {
  const marker = "resource_pack/models/entity/";
  const index = entryName.toLowerCase().indexOf(marker);
  return index >= 0 ? entryName.slice(index) : entryName;
}

function selectEntry(
  entries: readonly ZipEntry[],
  entityKey: string,
  variantKey: string | null
): ZipEntry {
  const exact = entries.find((entry) => entry.modelBase === entityKey);
  if (!variantKey && exact) return exact;

  if (variantKey) {
    const exactVariantNames = new Set([
      `${entityKey}_${variantKey}`,
      `${variantKey}_${entityKey}`,
    ]);
    const exactVariant = entries.find((entry) =>
      exactVariantNames.has(entry.modelBase)
    );
    if (exactVariant) return exactVariant;
    if (exact) return exact;
  }

  const candidates = entries.filter((entry) => {
    if (!entry.modelBase.includes(entityKey)) return false;
    if (!variantKey) {
      return (
        entry.modelBase.startsWith(`${entityKey}_`) ||
        entry.modelBase.endsWith(`_${entityKey}`)
      );
    }
    return entry.modelBase.includes(variantKey);
  });

  if (candidates.length === 1) return candidates[0]!;
  if (candidates.length === 0) {
    throw new VanillaEntityReferenceError(
      "REFERENCE_NOT_FOUND",
      `No cached vanilla Bedrock entity model matched "${entityKey}"${
        variantKey ? ` variant "${variantKey}"` : ""
      }.`,
      { entity: entityKey, variant: variantKey }
    );
  }
  throw new VanillaEntityReferenceError(
    "REFERENCE_AMBIGUOUS",
    `Cached vanilla Bedrock entity model "${entityKey}" is ambiguous; specify a variant or a more exact entity/model name.`,
    {
      entity: entityKey,
      variant: variantKey,
      candidates: candidates.slice(0, 12).map((entry) => entry.modelBase),
    }
  );
}

function selectGeometryDefinition(
  definitions: readonly GeometryDefinition[],
  entityKey: string,
  variantKey: string | null
): GeometryDefinition {
  if (definitions.length === 0) {
    throw new VanillaEntityReferenceError(
      "REFERENCE_PARSE_FAILED",
      "Vanilla entity model file contains no Bedrock geometry definitions."
    );
  }

  if (variantKey) {
    const matches = definitions.filter((definition) =>
      normalizeGeometryIdentifier(definition.identifier).includes(variantKey)
    );
    if (matches.length === 1) return matches[0]!;
    if (matches.length > 1) {
      throw new VanillaEntityReferenceError(
        "REFERENCE_AMBIGUOUS",
        `Vanilla entity geometry variant "${variantKey}" matches more than one geometry definition.`,
        { variants: matches.map((definition) => definition.identifier) }
      );
    }
  }

  const exact = definitions.find(
    (definition) =>
      normalizeGeometryIdentifier(definition.identifier) === entityKey
  );
  if (exact) return exact;

  const versioned = definitions
    .map((definition) => {
      const normalized = normalizeGeometryIdentifier(definition.identifier);
      const match = new RegExp(`^${entityKey}_v(\\d+)$`).exec(normalized);
      return match
        ? { definition, version: Number(match[1]) }
        : null;
    })
    .filter(
      (value): value is { definition: GeometryDefinition; version: number } =>
        value !== null
    )
    .sort((left, right) => right.version - left.version);
  if (versioned[0]) return versioned[0].definition;
  if (definitions.length === 1) return definitions[0]!;

  throw new VanillaEntityReferenceError(
    "REFERENCE_AMBIGUOUS",
    `Vanilla entity model exposes multiple geometry definitions; specify variant for "${entityKey}".`,
    { variants: definitions.map((definition) => definition.identifier) }
  );
}

function normalizeCube(cube: JsonRecord): JsonRecord {
  const result: JsonRecord = {};
  const origin = finiteVec3(cube.origin);
  const size = finiteVec3(cube.size);
  const pivot = finiteVec3(cube.pivot);
  const rotation = finiteVec3(cube.rotation);
  if (origin) result.origin = origin;
  if (size) result.size = size;
  if (pivot) result.pivot = pivot;
  if (rotation) result.rotation = rotation;
  const inflate = finiteNumber(cube.inflate);
  if (inflate !== null) result.inflate = inflate;
  if (typeof cube.mirror === "boolean") result.mirror = cube.mirror;
  if (cube.uv !== undefined) result.uv = cube.uv;
  return result;
}

function normalizeBone(
  bone: JsonRecord,
  detail: ReferenceDetail,
  includeGeometry: boolean
): JsonRecord {
  const result: JsonRecord = {
    name: typeof bone.name === "string" ? bone.name : "unnamed",
  };
  if (typeof bone.parent === "string") result.parent = bone.parent;
  const pivot = finiteVec3(bone.pivot);
  const rotation = finiteVec3(bone.rotation);
  if (pivot) result.pivot = pivot;
  if (rotation) result.rotation = rotation;
  if (typeof bone.mirror === "boolean") result.mirror = bone.mirror;
  const inflate = finiteNumber(bone.inflate);
  if (inflate !== null) result.inflate = inflate;
  const cubes = Array.isArray(bone.cubes) ? bone.cubes.filter(isRecord) : [];
  result.cube_count = cubes.length;
  if (detail === "geometry" && includeGeometry) {
    result.cubes = cubes.map(normalizeCube);
  }
  return result;
}

function geometryMetadata(definition: GeometryDefinition): JsonRecord {
  const description = definition.description;
  const textureWidth = finiteNumber(description.texture_width);
  const textureHeight = finiteNumber(description.texture_height);
  const visibleBoundsWidth = finiteNumber(description.visible_bounds_width);
  const visibleBoundsHeight = finiteNumber(description.visible_bounds_height);
  const visibleBoundsOffset = finiteVec3(description.visible_bounds_offset);
  const result: JsonRecord = {
    identifier: definition.identifier,
  };
  if (textureWidth !== null && textureHeight !== null) {
    result.texture_size = [textureWidth, textureHeight];
  }
  if (
    visibleBoundsWidth !== null ||
    visibleBoundsHeight !== null ||
    visibleBoundsOffset
  ) {
    result.visible_bounds = {
      ...(visibleBoundsWidth !== null ? { width: visibleBoundsWidth } : {}),
      ...(visibleBoundsHeight !== null ? { height: visibleBoundsHeight } : {}),
      ...(visibleBoundsOffset ? { offset: visibleBoundsOffset } : {}),
    };
  }
  return result;
}

function parseRequest(args: JsonRecord): {
  entityKey: string;
  detail: ReferenceDetail;
  bone: string | null;
  variantKey: string | null;
} {
  const allowed = new Set(["entity", "detail", "bone", "variant"]);
  for (const key of Object.keys(args)) {
    if (!allowed.has(key)) {
      throw new VanillaEntityReferenceError(
        "REFERENCE_INVALID_INPUT",
        `Unknown vanilla entity reference field "${key}".`
      );
    }
  }
  if (typeof args.entity !== "string" || !normalizeToken(args.entity)) {
    throw new VanillaEntityReferenceError(
      "REFERENCE_INVALID_INPUT",
      "entity must be a non-empty vanilla Bedrock entity/model name."
    );
  }
  const detail = args.detail ?? "summary";
  if (detail !== "summary" && detail !== "rig" && detail !== "geometry") {
    throw new VanillaEntityReferenceError(
      "REFERENCE_INVALID_INPUT",
      "detail must be summary, rig, or geometry."
    );
  }
  const bone =
    args.bone === undefined
      ? null
      : typeof args.bone === "string" && args.bone.trim()
        ? args.bone.trim()
        : null;
  if (args.bone !== undefined && bone === null) {
    throw new VanillaEntityReferenceError(
      "REFERENCE_INVALID_INPUT",
      "bone must be a non-empty exact bone name when provided."
    );
  }
  const variantKey =
    args.variant === undefined
      ? null
      : typeof args.variant === "string" && normalizeToken(args.variant)
        ? normalizeToken(args.variant)
        : null;
  if (args.variant !== undefined && variantKey === null) {
    throw new VanillaEntityReferenceError(
      "REFERENCE_INVALID_INPUT",
      "variant must be a non-empty token when provided."
    );
  }
  if (detail === "summary" && bone) {
    throw new VanillaEntityReferenceError(
      "REFERENCE_INVALID_INPUT",
      "bone is only valid with detail=rig or detail=geometry."
    );
  }
  return {
    entityKey: normalizeToken(args.entity),
    detail,
    bone,
    variantKey,
  };
}

export function shouldProbeVanillaEntityReference(query: string): boolean {
  const normalized = query.trim().toLowerCase().replace(/[_./-]+/g, " ");
  return (
    normalized.includes("vanilla") ||
    normalized.includes("get vanilla entity reference") ||
    normalized.includes("bedrock entity reference")
  );
}

export class VanillaEntityReferenceProvider {
  private readonly configuredArchivePath?: string;
  private readonly cacheDirectories: readonly string[];
  private readonly maxOutputBytes: number;
  private readonly entityCacheSize: number;
  private resolvedArchivePath: string | null = null;
  private zipIndex: ZipIndex | null = null;
  private readonly entityCache = new Map<string, CachedGeometryDocument>();

  constructor(options: VanillaEntityReferenceProviderOptions = {}) {
    this.configuredArchivePath = options.archivePath;
    this.cacheDirectories =
      options.cacheDirectories ?? defaultAssetBrowserCacheDirectories();
    this.maxOutputBytes =
      options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
    this.entityCacheSize = Math.max(
      1,
      Math.trunc(options.entityCacheSize ?? DEFAULT_ENTITY_CACHE_SIZE)
    );
  }

  async isAvailable(): Promise<boolean> {
    return (await this.locateArchive()) !== null;
  }

  private async locateArchive(): Promise<string | null> {
    if (this.configuredArchivePath) {
      return (await isFile(this.configuredArchivePath))
        ? this.configuredArchivePath
        : null;
    }
    if (this.resolvedArchivePath && (await isFile(this.resolvedArchivePath))) {
      return this.resolvedArchivePath;
    }
    this.resolvedArchivePath = await findLatestBedrockArchive(
      this.cacheDirectories
    );
    return this.resolvedArchivePath;
  }

  private async getZipIndex(archivePath: string): Promise<ZipIndex> {
    const archiveStat = await stat(archivePath);
    if (
      this.zipIndex &&
      this.zipIndex.archivePath === archivePath &&
      this.zipIndex.mtimeMs === archiveStat.mtimeMs
    ) {
      return this.zipIndex;
    }
    this.entityCache.clear();
    this.zipIndex = await buildZipIndex(archivePath);
    return this.zipIndex;
  }

  private rememberGeometry(cacheKey: string, value: CachedGeometryDocument): void {
    this.entityCache.delete(cacheKey);
    this.entityCache.set(cacheKey, value);
    while (this.entityCache.size > this.entityCacheSize) {
      const oldest = this.entityCache.keys().next().value as string | undefined;
      if (!oldest) break;
      this.entityCache.delete(oldest);
    }
  }

  private async loadGeometryDocument(
    archivePath: string,
    entry: ZipEntry
  ): Promise<CachedGeometryDocument> {
    const cacheKey = `${archivePath}|${entry.name}`;
    const cached = this.entityCache.get(cacheKey);
    if (cached) {
      this.entityCache.delete(cacheKey);
      this.entityCache.set(cacheKey, cached);
      return cached;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(await readZipEntry(archivePath, entry));
    } catch (error) {
      if (error instanceof VanillaEntityReferenceError) throw error;
      throw new VanillaEntityReferenceError(
        "REFERENCE_PARSE_FAILED",
        `Failed to parse cached vanilla entity geometry ${entry.modelBase}.`,
        { model: entry.modelBase }
      );
    }
    const loaded: CachedGeometryDocument = {
      archivePath,
      entryName: entry.name,
      modelBase: entry.modelBase,
      definitions: geometryDefinitions(parsed),
    };
    this.rememberGeometry(cacheKey, loaded);
    return loaded;
  }

  async invoke(args: JsonRecord): Promise<VanillaEntityReferenceCallResult> {
    const request = parseRequest(args);
    const archivePath = await this.locateArchive();
    if (!archivePath) {
      throw new VanillaEntityReferenceError(
        "REFERENCE_SOURCE_UNAVAILABLE",
        "No cached Bedrock release from Asset Browser is available for vanilla entity reference.",
        {
          source: "asset_browser",
          action:
            "Open a Bedrock release once in Asset Browser, or set BLOCKIT_VANILLA_ASSET_CACHE_DIR to its minecraft_assets_cache directory.",
        },
        true
      );
    }

    const index = await this.getZipIndex(archivePath);
    const entry = selectEntry(
      index.entries,
      request.entityKey,
      request.variantKey
    );
    const loaded = await this.loadGeometryDocument(archivePath, entry);
    const definition = selectGeometryDefinition(
      loaded.definitions,
      request.entityKey,
      request.variantKey
    );
    const allBones = definition.bones;
    const requestedBones = request.bone
      ? allBones.filter(
          (bone) =>
            typeof bone.name === "string" && bone.name === request.bone
        )
      : allBones;
    if (request.bone && requestedBones.length === 0) {
      throw new VanillaEntityReferenceError(
        "REFERENCE_NOT_FOUND",
        `Bone "${request.bone}" was not found in vanilla geometry ${definition.identifier}.`,
        {
          bone: request.bone,
          available_bones: allBones
            .map((bone) => (typeof bone.name === "string" ? bone.name : null))
            .filter((name): name is string => name !== null),
        }
      );
    }

    const cubeCount = allBones.reduce(
      (total, bone) =>
        total + (Array.isArray(bone.cubes) ? bone.cubes.filter(isRecord).length : 0),
      0
    );
    const rootBones = allBones
      .filter((bone) => typeof bone.parent !== "string")
      .map((bone) => (typeof bone.name === "string" ? bone.name : "unnamed"));
    const geometry = geometryMetadata(definition);
    const structured: JsonRecord = {
      entity: `minecraft:${request.entityKey}`,
      source: {
        provider: "asset_browser_cache",
        archive_version: basename(archivePath, ".zip"),
        model_file: canonicalModelPath(loaded.entryName),
      },
      geometry,
      available_geometry: loaded.definitions.map(
        (candidate) => candidate.identifier
      ),
      summary: {
        bone_count: allBones.length,
        cube_count: cubeCount,
        root_bones: rootBones,
      },
    };

    if (request.detail !== "summary") {
      structured.detail = request.detail;
      structured.bones = requestedBones.map((bone) =>
        normalizeBone(bone, request.detail, true)
      );
      if (request.bone) structured.focus_bone = request.bone;
    }

    const outputBytes = Buffer.byteLength(JSON.stringify(structured), "utf8");
    if (outputBytes > this.maxOutputBytes) {
      throw new VanillaEntityReferenceError(
        "REFERENCE_OUTPUT_TOO_LARGE",
        "Vanilla entity reference is too large for a compact response; request a specific bone or use detail=summary/rig.",
        {
          entity: request.entityKey,
          geometry: definition.identifier,
          output_bytes: outputBytes,
          max_output_bytes: this.maxOutputBytes,
          available_bones: allBones
            .map((bone) => (typeof bone.name === "string" ? bone.name : null))
            .filter((name): name is string => name !== null),
        }
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Loaded compact vanilla Bedrock reference ${definition.identifier} from the local Asset Browser cache (${request.detail}${
            request.bone ? `:${request.bone}` : ""
          }).`,
        },
      ],
      structuredContent: structured,
    };
  }
}
