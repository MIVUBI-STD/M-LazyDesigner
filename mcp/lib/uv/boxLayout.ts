export type BoxUvRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Capacity is a provisional layout limitation, not invalid Geometry input. */
export class BoxUvCapacityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BoxUvCapacityError";
  }
}

function finiteSpan(
  from: readonly number[],
  to: readonly number[],
  axis: number
): number {
  const start = from[axis];
  const end = to[axis];
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error("Box-UV footprint requires finite Cube from/to coordinates.");
  }
  const span = Math.abs(end - start);
  if (!Number.isFinite(span)) {
    throw new Error("Box-UV footprint requires a finite derived Cube span.");
  }
  return span;
}

function bedrockBoxUvAxisSize(span: number): number {
  // Blockbench Bedrock Box UV defaults to Cube.size(axis, true), which floors
  // authored span with a tiny epsilon before the template applies Math.round.
  return Math.max(1, Math.floor(span + 0.0000001));
}

/**
 * Logical Box-UV footprint matching Blockbench's default Bedrock Box UV size
 * semantics. Zero/sub-unit axes reserve one logical UV unit.
 */
export function boxUvFootprint(
  from: readonly number[],
  to: readonly number[]
): [number, number] {
  if (from.length !== 3 || to.length !== 3) {
    throw new Error("Box-UV footprint requires [x,y,z] from/to coordinates.");
  }

  const sizeX = bedrockBoxUvAxisSize(finiteSpan(from, to, 0));
  const sizeY = bedrockBoxUvAxisSize(finiteSpan(from, to, 1));
  const sizeZ = bedrockBoxUvAxisSize(finiteSpan(from, to, 2));

  return [2 * (sizeX + sizeZ), sizeY + sizeZ];
}

function requireCanvasDimension(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer logical UV dimension.`);
  }
  return value;
}

function requireRegion(region: BoxUvRegion, label: string): BoxUvRegion {
  if (
    !Number.isFinite(region.x) ||
    !Number.isFinite(region.y) ||
    !Number.isFinite(region.width) ||
    !Number.isFinite(region.height) ||
    region.width <= 0 ||
    region.height <= 0
  ) {
    throw new Error(`${label} must be a finite positive Box-UV region.`);
  }
  return { ...region };
}

function regionsOverlap(a: BoxUvRegion, b: BoxUvRegion): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Deterministic first-fit Box-UV packing. Existing regions remain fixed;
 * incoming footprints are packed largest-first and returned in input order.
 * Invalid data always throws an ordinary Error. Canvas/occupancy exhaustion
 * throws BoxUvCapacityError so Geometry can defer provisional layout only.
 */
export function packBoxUvOffsets(
  occupiedRegions: readonly BoxUvRegion[],
  footprints: readonly (readonly [number, number])[],
  logicalWidth: number,
  logicalHeight: number
): [number, number][] {
  const width = requireCanvasDimension(logicalWidth, "Logical UV width");
  const height = requireCanvasDimension(logicalHeight, "Logical UV height");
  const occupied = occupiedRegions.map((region, index) =>
    requireRegion(region, `Occupied Box-UV region[${index}]`)
  );

  const planned: Array<[number, number] | null> = Array(footprints.length).fill(null);
  const ordered = footprints
    .map(([regionWidth, regionHeight], index) => ({
      index,
      width: regionWidth,
      height: regionHeight,
    }))
    .sort(
      (a, b) =>
        b.width * b.height - a.width * a.height ||
        b.height - a.height ||
        b.width - a.width ||
        a.index - b.index
    );

  // Validate every input before a deferrable capacity failure can mask it.
  for (const item of ordered) {
    if (
      !Number.isInteger(item.width) ||
      !Number.isInteger(item.height) ||
      item.width <= 0 ||
      item.height <= 0
    ) {
      throw new Error(
        `Incoming Box-UV footprint[${item.index}] must use positive integer dimensions.`
      );
    }
  }
  for (const [index, region] of occupied.entries()) {
    if (
      region.x < 0 ||
      region.y < 0 ||
      region.x + region.width > width ||
      region.y + region.height > height
    ) {
      throw new BoxUvCapacityError(
        `Occupied Box-UV region[${index}] exceeds the ${width}×${height} logical UV canvas. Repair existing UV state before auto-packing more Cubes.`
      );
    }
  }

  for (const item of ordered) {
    if (item.width > width || item.height > height) {
      throw new BoxUvCapacityError(
        `Box-UV footprint ${item.width}×${item.height} exceeds the ${width}×${height} logical UV canvas.`
      );
    }

    let found: [number, number] | null = null;
    for (let y = 0; y <= height - item.height && found === null; y += 1) {
      let x = 0;
      while (x <= width - item.width) {
        const candidate: BoxUvRegion = {
          x,
          y,
          width: item.width,
          height: item.height,
        };
        const collision = occupied.find((region) => regionsOverlap(candidate, region));
        if (!collision) {
          found = [x, y];
          occupied.push(candidate);
          break;
        }
        x = Math.max(x + 1, Math.ceil(collision.x + collision.width));
      }
    }

    if (!found) {
      throw new BoxUvCapacityError(
        `Unable to auto-pack Box-UV footprint ${item.width}×${item.height} into the ${width}×${height} logical UV canvas without overlap. Increase project resolution or use explicit per-face UV.`
      );
    }
    planned[item.index] = found;
  }

  return planned.map((offset, index) => {
    if (!offset) {
      throw new Error(`Box-UV packer did not produce an offset for footprint[${index}].`);
    }
    return offset;
  });
}
