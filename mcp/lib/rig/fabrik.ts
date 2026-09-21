export type RigVec3 = readonly [number, number, number];

export type FabrikOptions = {
  tolerance?: number;
  max_iterations?: number;
};

function add(a: RigVec3, b: RigVec3): [number, number, number] { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub(a: RigVec3, b: RigVec3): [number, number, number] { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function scale(a: RigVec3, s: number): [number, number, number] { return [a[0] * s, a[1] * s, a[2] * s]; }
function length(a: RigVec3): number { return Math.hypot(a[0], a[1], a[2]); }
function distance(a: RigVec3, b: RigVec3): number { return length(sub(a, b)); }
function unit(from: RigVec3, to: RigVec3): [number, number, number] {
  const delta = sub(to, from);
  const magnitude = length(delta);
  if (magnitude === 0) throw new Error("FABRIK cannot normalize a zero-length direction.");
  return scale(delta, 1 / magnitude);
}

export function solveFabrikChain(points: readonly RigVec3[], target: RigVec3, options: FabrikOptions = {}) {
  if (points.length < 2) throw new Error("FABRIK requires at least two chain points.");
  if (![...target, ...points.flat()].every(Number.isFinite)) throw new Error("FABRIK inputs must be finite.");
  const tolerance = options.tolerance ?? 1e-3;
  const maxIterations = options.max_iterations ?? 24;
  if (!(tolerance > 0) || !Number.isInteger(maxIterations) || maxIterations <= 0) throw new Error("Invalid FABRIK solve options.");

  const originalRoot = [...points[0]] as [number, number, number];
  const solved = points.map((point) => [...point] as [number, number, number]);
  const lengths = points.slice(0, -1).map((point, index) => {
    const segmentLength = distance(point, points[index + 1]);
    if (!(segmentLength > 0)) throw new Error("FABRIK chain segments must have non-zero length.");
    return segmentLength;
  });
  const totalLength = lengths.reduce((sum, value) => sum + value, 0);
  const rootToTarget = distance(originalRoot, target);

  if (rootToTarget >= totalLength) {
    const direction = unit(originalRoot, target);
    solved[0] = originalRoot;
    for (let i = 0; i < lengths.length; i += 1) solved[i + 1] = add(solved[i], scale(direction, lengths[i]));
    return { points: solved, reached: Math.abs(rootToTarget - totalLength) <= tolerance, iterations: 1, residual: distance(solved.at(-1)!, target), stretched: true };
  }

  let iterations = 0;
  while (iterations < maxIterations && distance(solved.at(-1)!, target) > tolerance) {
    iterations += 1;
    solved[solved.length - 1] = [...target] as [number, number, number];
    for (let i = solved.length - 2; i >= 0; i -= 1) {
      const direction = unit(solved[i + 1], solved[i]);
      solved[i] = add(solved[i + 1], scale(direction, lengths[i]));
    }
    solved[0] = originalRoot;
    for (let i = 0; i < lengths.length; i += 1) {
      const direction = unit(solved[i], solved[i + 1]);
      solved[i + 1] = add(solved[i], scale(direction, lengths[i]));
    }
  }
  const residual = distance(solved.at(-1)!, target);
  return { points: solved, reached: residual <= tolerance, iterations, residual, stretched: false };
}
