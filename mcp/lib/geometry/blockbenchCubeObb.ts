import {
  type OrientedBox,
  type Vec3,
} from "@/lib/geometry/orientedBoxContact";

export type Matrix4Elements = readonly [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

type CubeObbInput = {
  from: readonly number[];
  to: readonly number[];
  origin: readonly number[];
  inflate?: number;
  matrixWorld: readonly number[];
};

const AXIS_EPSILON = 1e-10;

function requireFiniteVec3(
  values: readonly number[],
  context: string
): Vec3 {
  if (values.length !== 3 || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`${context} must contain exactly three finite values.`);
  }
  return [values[0], values[1], values[2]];
}

function requireMatrix4Elements(
  values: readonly number[],
  context: string
): Matrix4Elements {
  if (values.length !== 16 || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`${context} must contain exactly 16 finite matrix values.`);
  }
  return values as Matrix4Elements;
}

function magnitude(value: Vec3): number {
  return Math.hypot(value[0], value[1], value[2]);
}

function normalizeAxis(value: Vec3, context: string): { axis: Vec3; scale: number } {
  const scale = magnitude(value);
  if (!Number.isFinite(scale) || scale <= AXIS_EPSILON) {
    throw new Error(`${context} must have a finite non-zero basis scale.`);
  }
  return {
    axis: [value[0] / scale, value[1] / scale, value[2] / scale],
    scale,
  };
}

function transformPoint(point: Vec3, matrix: Matrix4Elements): Vec3 {
  const [x, y, z] = point;
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ];
}

/**
 * Convert a Blockbench Cube's authored local cuboid plus world matrix into an
 * oriented box suitable for exact Cube-vs-Cube SAT contact analysis.
 *
 * `matrixWorld` owns Cube rotation plus ancestor Group transforms. Inflate is
 * applied symmetrically to the authored span before basis scale is applied.
 */
export function orientedBoxFromBlockbenchCubeState(
  input: CubeObbInput,
  context = "Blockbench Cube"
): OrientedBox {
  const from = requireFiniteVec3(input.from, `${context} from`);
  const to = requireFiniteVec3(input.to, `${context} to`);
  const origin = requireFiniteVec3(input.origin, `${context} origin`);
  const matrix = requireMatrix4Elements(input.matrixWorld, `${context} matrixWorld`);
  const inflate = input.inflate ?? 0;
  if (!Number.isFinite(inflate)) {
    throw new Error(`${context} inflate must be finite.`);
  }

  const localCenter: Vec3 = [
    (from[0] + to[0]) / 2 - origin[0],
    (from[1] + to[1]) / 2 - origin[1],
    (from[2] + to[2]) / 2 - origin[2],
  ];
  if (localCenter.some((value) => !Number.isFinite(value))) {
    throw new Error(`${context} local center is non-finite.`);
  }

  const localHalfSizes: Vec3 = [
    Math.abs(to[0] - from[0]) / 2 + inflate,
    Math.abs(to[1] - from[1]) / 2 + inflate,
    Math.abs(to[2] - from[2]) / 2 + inflate,
  ];
  if (
    localHalfSizes.some(
      (value) => !Number.isFinite(value) || value < 0
    )
  ) {
    throw new Error(
      `${context} inflate would produce a negative or non-finite rendered half-size.`
    );
  }

  const xBasis = normalizeAxis(
    [matrix[0], matrix[1], matrix[2]],
    `${context} world X basis`
  );
  const yBasis = normalizeAxis(
    [matrix[4], matrix[5], matrix[6]],
    `${context} world Y basis`
  );
  const zBasis = normalizeAxis(
    [matrix[8], matrix[9], matrix[10]],
    `${context} world Z basis`
  );

  return {
    center: transformPoint(localCenter, matrix),
    axes: [xBasis.axis, yBasis.axis, zBasis.axis],
    halfSizes: [
      localHalfSizes[0] * xBasis.scale,
      localHalfSizes[1] * yBasis.scale,
      localHalfSizes[2] * zBasis.scale,
    ],
  };
}

/**
 * Runtime bridge for the active Blockbench scene. This is intentionally kept
 * internal until the public `measure_geometry` ToolSpec is generated locally.
 */
export function orientedBoxFromCube(cube: Cube): OrientedBox {
  if (!cube.mesh) {
    throw new Error(
      `Cube ${cube.name} (${cube.uuid}) has no preview mesh; exact world-space OBB measurement is unavailable.`
    );
  }
  cube.mesh.updateMatrixWorld(true);
  return orientedBoxFromBlockbenchCubeState(
    {
      from: cube.from,
      to: cube.to,
      origin: cube.origin,
      inflate: cube.inflate ?? 0,
      matrixWorld: cube.mesh.matrixWorld.elements,
    },
    `Cube ${cube.name} (${cube.uuid})`
  );
}
