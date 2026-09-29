export type ControllerBlendCurvePoint = {
  time: number;
  value: number;
};

export function normalizeControllerBlendCurve(
  points: readonly ControllerBlendCurvePoint[]
): Record<string, number> {
  if (points.length < 2 || points.length > 16) {
    throw new Error("Controller blend curve requires 2..16 authored points.");
  }
  const seen = new Set<number>();
  const sorted = points
    .map((point, index) => {
      if (
        !Number.isFinite(point.time) ||
        point.time < 0 ||
        point.time > 1 ||
        !Number.isFinite(point.value)
      ) {
        throw new Error(
          `Controller blend curve point ${index} requires finite time 0..1 and finite value.`
        );
      }
      if (seen.has(point.time)) {
        throw new Error(
          `Controller blend curve time ${point.time} appears more than once.`
        );
      }
      seen.add(point.time);
      return point;
    })
    .sort((left, right) => left.time - right.time);

  return Object.fromEntries(
    sorted.map((point) => [String(point.time), point.value])
  );
}

export function controllerGraphHasCycleFrom(
  graph: Readonly<Record<string, readonly string[]>>,
  startUuid: string
): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (uuid: string): boolean => {
    if (visiting.has(uuid)) return true;
    if (visited.has(uuid)) return false;
    visiting.add(uuid);
    for (const next of graph[uuid] ?? []) {
      if (visit(next)) return true;
    }
    visiting.delete(uuid);
    visited.add(uuid);
    return false;
  };

  return visit(startUuid);
}

export function wouldCreateControllerCompositionCycle(
  graph: Readonly<Record<string, readonly string[]>>,
  ownerUuid: string,
  targetUuid: string
): boolean {
  // owner===target is used by diagnostics to query the current graph. Actual
  // self-link mutation is rejected before this helper is called.
  if (ownerUuid === targetUuid) {
    return controllerGraphHasCycleFrom(graph, ownerUuid);
  }
  const pending = [targetUuid];
  const visited = new Set<string>();
  while (pending.length) {
    const current = pending.pop()!;
    if (current === ownerUuid) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of graph[current] ?? []) {
      if (!visited.has(next)) pending.push(next);
    }
  }
  return false;
}
