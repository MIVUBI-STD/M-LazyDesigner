/// <reference types="blockbench-types" />

import { getAllToolDefinitions } from "@/lib/factories";
import { analyzeAxisAlignedSurfaceEvidence } from "@/lib/geometrySurfaceEvidence";
import { analyzeUvPhysicalEvidence, type UvPhysicalFaceInput } from "@/lib/uvPhysicalEvidence";

type JsonRecord = Record<string, unknown>;
const FACE_KEYS = ["north", "south", "east", "west", "up", "down"] as const;
const wired = new Set<string>();

function objectRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function nonZeroRotation(values: readonly number[] | undefined): boolean {
  return Boolean(values && values.slice(0, 3).some((value) => Number.isFinite(value) && Math.abs(value) > 1e-5));
}

function geometrySurfaceRuntime() {
  if (typeof Cube === "undefined") {
    return { state: "unavailable" as const, reason: "blockbench_geometry_runtime_unavailable" as const };
  }
  const groups = typeof Group === "undefined" ? [] : (Group.all ?? []);
  const transformedGroups = groups.filter((group: Group) => nonZeroRotation(group.rotation));
  const meshCount = typeof Mesh === "undefined" ? 0 : (Mesh.all ?? []).filter((mesh: Mesh) => mesh.visibility !== false).length;
  return analyzeAxisAlignedSurfaceEvidence(
    (Cube.all ?? [])
      .filter((cube: Cube) => cube.visibility !== false)
      .map((cube: Cube) => ({
        uuid: cube.uuid,
        name: cube.name,
        from: [...cube.from],
        to: [...cube.to],
        inflate: cube.inflate ?? 0,
        rotation: [...cube.rotation],
      })),
    {
      unsupportedTransformCount: transformedGroups.length,
      unsupportedMeshCount: meshCount,
    }
  );
}

function uvPhysicalRuntime() {
  if (typeof Cube === "undefined") {
    return { state: "unavailable" as const, reason: "blockbench_geometry_runtime_unavailable" as const };
  }
  const faces: UvPhysicalFaceInput[] = [];
  for (const cube of Cube.all ?? []) {
    const inflate = Number(cube.inflate ?? 0);
    const size = [0, 1, 2].map((axis) => Math.abs(Number(cube.to[axis]) - Number(cube.from[axis])) + 2 * inflate);
    for (const faceName of FACE_KEYS) {
      const face = cube.faces?.[faceName];
      if (!face || face.enabled === false) continue;
      const texture = face.getTexture?.();
      faces.push({
        cube_uuid: cube.uuid,
        cube_name: cube.name,
        face: faceName,
        cube_size: size,
        uv: [...face.uv],
        texture_uuid: texture?.uuid ?? (typeof face.texture === "string" ? face.texture : null),
      });
    }
  }
  const base = analyzeUvPhysicalEvidence(faces);
  const meshCount = typeof Mesh === "undefined" ? 0 : (Mesh.all ?? []).filter((mesh: Mesh) => mesh.visibility !== false).length;
  return {
    ...base,
    cube_face_scope_complete: meshCount === 0,
    unsupported_mesh_count: meshCount,
    ...(meshCount > 0
      ? { note: `${base.note} Mesh UV topology is outside this cube-face evidence and must be reviewed separately.` }
      : {}),
  };
}

function wire(toolName: string, field: string, read: () => unknown): void {
  const key = `${toolName}:${field}`;
  if (wired.has(key)) return;
  const definition = getAllToolDefinitions()[toolName];
  if (!definition) return;
  const execute = definition.execute;
  definition.execute = async (args, context) => {
    const result = await execute(args, context);
    const record = objectRecord(result);
    const structured = record ? objectRecord(record.structuredContent) : null;
    if (!structured) return result;
    return {
      ...record,
      structuredContent: { ...structured, [field]: read() },
    } as typeof result;
  };
  wired.add(key);
}

/** Adds read-only deterministic evidence without expanding the public MCP catalog. */
export function wireAuthoringEvidenceRuntime(): void {
  wire("inspect_model_bounds", "surface_integrity", geometrySurfaceRuntime);
  wire("list_textures", "physical_uv_evidence", uvPhysicalRuntime);
}
