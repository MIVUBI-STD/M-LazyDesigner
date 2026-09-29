const CUBE_AXIS_NAMES = ["x", "y", "z"] as const;

export function hasFiniteCubeSpan(
  from: readonly number[],
  to: readonly number[]
): boolean {
  return (
    from.length === 3 &&
    to.length === 3 &&
    from.every(Number.isFinite) &&
    to.every(Number.isFinite) &&
    to.every((entry, axis) => Number.isFinite(entry - from[axis]))
  );
}

export function requireFiniteCubeSpan(
  from: readonly number[],
  to: readonly number[],
  context: string
): void {
  if (!hasFiniteCubeSpan(from, to)) {
    throw new Error(
      `${context} would produce a non-finite Cube size. Use finite from/to coordinates whose per-axis difference is also finite.`
    );
  }
}

export function validateCubeGeometrySpan(
  from: readonly number[],
  to: readonly number[],
  inflate = 0,
  context = "Cube"
) {
  requireFiniteCubeSpan(from, to, context);
  if (!Number.isFinite(inflate)) {
    throw new Error(`${context} inflate must be finite.`);
  }

  const authoredSize = to.map(
    (value, axis) => value - from[axis]
  ) as [number, number, number];
  const reversedAxes = CUBE_AXIS_NAMES.filter(
    (_, axis) => authoredSize[axis] < 0
  );
  if (reversedAxes.length > 0) {
    throw new Error(
      `${context} reverses authored Cube bounds on ${reversedAxes.join(", ")}. Keep to >= from on every axis.`
    );
  }

  const authoredCollapsedAxes = CUBE_AXIS_NAMES.filter(
    (_, axis) => authoredSize[axis] === 0
  );
  if (authoredCollapsedAxes.length >= 2) {
    throw new Error(
      `${context} collapses ${authoredCollapsedAxes.length} authored axes (${authoredCollapsedAxes.join(", ")}). A visible Cube needs positive 3D span or exactly one zero-span plane-like axis.`
    );
  }

  const renderedSize = authoredSize.map(
    (size) => size + inflate * 2
  ) as [number, number, number];
  if (renderedSize.some((size) => !Number.isFinite(size))) {
    throw new Error(
      `${context} inflate would produce a non-finite rendered span.`
    );
  }

  const negativeRenderedAxes = CUBE_AXIS_NAMES.filter(
    (_, axis) => renderedSize[axis] < 0
  );
  if (negativeRenderedAxes.length > 0) {
    throw new Error(
      `${context} inflate/deflate would produce a negative rendered span on ${negativeRenderedAxes.join(", ")}. Reduce deflate or increase the authored span.`
    );
  }

  const renderedCollapsedAxes = CUBE_AXIS_NAMES.filter(
    (_, axis) => renderedSize[axis] === 0
  );
  if (renderedCollapsedAxes.length >= 2) {
    throw new Error(
      `${context} inflate/deflate collapses ${renderedCollapsedAxes.length} rendered axes (${renderedCollapsedAxes.join(", ")}). Keep a solid volume or exactly one plane-like axis.`
    );
  }

  return {
    authored_size: authoredSize,
    rendered_size: renderedSize,
    representation:
      renderedCollapsedAxes.length === 1
        ? ("plane_like" as const)
        : ("solid" as const),
  };
}
