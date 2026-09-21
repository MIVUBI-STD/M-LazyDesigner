import {
  DEFAULT_UV_ISLAND_CONSTRAINTS,
  UV_LAYOUT_SCHEMA_VERSION,
  UV_PLANNER_VERSION,
  type UvFaceKey,
  type UvIsland,
  type UvIslandConstraintPatch,
  type UvIslandConstraints,
  type UvLayoutMetrics,
  type UvLayoutSnapshot,
  type UvRect,
} from "@/lib/uv/contracts";
import { boxUvFootprint } from "@/lib/boxUvLayout";

export type UvCubeFaceSnapshot = {
  face: UvFaceKey;
  uv: readonly number[];
  rotation?: number;
  enabled?: boolean;
};

export type UvCubeSnapshot = {
  uuid: string;
  name: string;
  from: readonly number[];
  to: readonly number[];
  box_uv: boolean;
  uv_offset?: readonly number[];
  autouv: number;
  mirror_uv: boolean;
  faces: readonly UvCubeFaceSnapshot[];
};

export type UvIslandConstraintResolver = (
  island: Omit<UvIsland, "constraints">
) => UvIslandConstraintPatch | undefined;

const FACE_KEYS: readonly UvFaceKey[] = [
  "north",
  "south",
  "east",
  "west",
  "up",
  "down",
];

function finiteDimension(
  from: readonly number[],
  to: readonly number[],
  axis: number
): number {
  const value = Math.abs(to[axis] - from[axis]);
  if (!Number.isFinite(value)) {
    throw new Error("UV island extraction requires finite Cube dimensions.");
  }
  return value;
}

function facePhysicalSize(
  face: UvFaceKey,
  from: readonly number[],
  to: readonly number[]
): [number, number] {
  if (from.length !== 3 || to.length !== 3) {
    throw new Error("UV island extraction requires [x,y,z] Cube bounds.");
  }
  const x = finiteDimension(from, to, 0);
  const y = finiteDimension(from, to, 1);
  const z = finiteDimension(from, to, 2);

  if (face === "north" || face === "south") return [x, y];
  if (face === "east" || face === "west") return [z, y];
  return [x, z];
}

function normalizedRect(values: readonly number[]): UvRect {
  if (
    values.length !== 4 ||
    values.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("UV face rectangle requires four finite coordinates.");
  }
  const left = Math.min(values[0], values[2]);
  const top = Math.min(values[1], values[3]);
  const right = Math.max(values[0], values[2]);
  const bottom = Math.max(values[1], values[3]);
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function requireBoxUvOffset(value: readonly number[] | undefined): [number, number] {
  if (
    !value ||
    value.length !== 2 ||
    value.some((entry) => !Number.isFinite(entry))
  ) {
    throw new Error(
      "Box-UV island extraction requires a finite [u,v] uv_offset."
    );
  }
  return [value[0], value[1]];
}

export function mergeUvIslandConstraints(
  overrides?: UvIslandConstraintPatch
): UvIslandConstraints {
  return {
    ...DEFAULT_UV_ISLAND_CONSTRAINTS,
    ...overrides,
    rotation: {
      ...DEFAULT_UV_ISLAND_CONSTRAINTS.rotation,
      ...overrides?.rotation,
    },
    density: {
      ...DEFAULT_UV_ISLAND_CONSTRAINTS.density,
      ...overrides?.density,
    },
  };
}

function createIsland(
  base: Omit<UvIsland, "constraints">,
  resolveConstraints?: UvIslandConstraintResolver
): UvIsland {
  return {
    ...base,
    constraints: mergeUvIslandConstraints(resolveConstraints?.(base)),
  };
}

export function extractUvIslands(
  cubes: readonly UvCubeSnapshot[],
  resolveConstraints?: UvIslandConstraintResolver
): UvIsland[] {
  const islands: UvIsland[] = [];

  for (const cube of cubes) {
    if (!cube.uuid || !cube.name) {
      throw new Error("UV island extraction requires Cube UUID and name.");
    }

    if (cube.box_uv) {
      const [u, v] = requireBoxUvOffset(cube.uv_offset);
      const [width, height] = boxUvFootprint(cube.from, cube.to);
      const physicalWidth = finiteDimension(cube.from, cube.to, 0);
      const physicalHeight = finiteDimension(cube.from, cube.to, 1);
      const physicalDepth = finiteDimension(cube.from, cube.to, 2);
      const base: Omit<UvIsland, "constraints"> = {
        id: `box:${cube.uuid}`,
        source: {
          cube_uuid: cube.uuid,
          cube_name: cube.name,
          faces: [...FACE_KEYS],
          box_uv: true,
          mirror_uv: cube.mirror_uv,
          autouv: cube.autouv,
        },
        rect: { x: u, y: v, width, height },
        physical: {
          width: physicalWidth,
          height: physicalHeight,
          area:
            2 *
            (physicalWidth * physicalHeight +
              physicalWidth * physicalDepth +
              physicalHeight * physicalDepth),
          density_basis: {
            u_model_units: width,
            v_model_units: height,
          },
        },
      };
      islands.push(createIsland(base, resolveConstraints));
      continue;
    }

    const faces = [...cube.faces]
      .filter((face) => face.enabled !== false)
      .sort(
        (left, right) =>
          FACE_KEYS.indexOf(left.face) - FACE_KEYS.indexOf(right.face)
      );

    for (const face of faces) {
      const rect = normalizedRect(face.uv);
      const [physicalWidth, physicalHeight] = facePhysicalSize(
        face.face,
        cube.from,
        cube.to
      );
      const base: Omit<UvIsland, "constraints"> = {
        id: `face:${cube.uuid}:${face.face}`,
        source: {
          cube_uuid: cube.uuid,
          cube_name: cube.name,
          faces: [face.face],
          box_uv: false,
          mirror_uv: cube.mirror_uv,
          autouv: cube.autouv,
          face_rotation: face.rotation ?? 0,
        },
        rect,
        physical: {
          width: physicalWidth,
          height: physicalHeight,
          area: physicalWidth * physicalHeight,
          density_basis: {
            u_model_units: physicalWidth,
            v_model_units: physicalHeight,
          },
        },
      };
      islands.push(createIsland(base, resolveConstraints));
    }
  }

  return islands;
}

function occupiedBounds(islands: readonly UvIsland[]): UvRect | null {
  if (islands.length === 0) return null;
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const island of islands) {
    left = Math.min(left, island.rect.x);
    top = Math.min(top, island.rect.y);
    right = Math.max(right, island.rect.x + island.rect.width);
    bottom = Math.max(bottom, island.rect.y + island.rect.height);
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function measureUvLayout(
  islands: readonly UvIsland[]
): UvLayoutMetrics {
  return {
    island_count: islands.length,
    face_count: islands.reduce(
      (sum, island) => sum + island.source.faces.length,
      0
    ),
    physical_area: islands.reduce(
      (sum, island) => sum + island.physical.area,
      0
    ),
    uv_area: islands.reduce(
      (sum, island) => sum + island.rect.width * island.rect.height,
      0
    ),
    occupied_bounds: occupiedBounds(islands),
  };
}

export function buildUvLayoutSnapshot(
  cubes: readonly UvCubeSnapshot[],
  logicalWidth: number,
  logicalHeight: number,
  resolveConstraints?: UvIslandConstraintResolver
): UvLayoutSnapshot {
  if (
    !Number.isFinite(logicalWidth) ||
    !Number.isFinite(logicalHeight) ||
    logicalWidth <= 0 ||
    logicalHeight <= 0
  ) {
    throw new Error("UV layout snapshot requires positive logical dimensions.");
  }

  const islands = extractUvIslands(cubes, resolveConstraints);
  return {
    schema: UV_LAYOUT_SCHEMA_VERSION,
    planner_version: UV_PLANNER_VERSION,
    logical_width: logicalWidth,
    logical_height: logicalHeight,
    islands,
    metrics: measureUvLayout(islands),
  };
}
