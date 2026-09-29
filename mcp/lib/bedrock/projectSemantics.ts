export type LogicalUvResolution = {
  width: number;
  height: number;
};

export type LogicalUvResizePolicy = "keep" | "rescale_uv";

export type LogicalUvResizePlan = {
  previous: LogicalUvResolution;
  next: LogicalUvResolution;
  policy: LogicalUvResizePolicy;
  uv_multiplier: [number, number];
  requires_box_uv_integrality_check: boolean;
};

export type WorldAabb = {
  min: [number, number, number];
  max: [number, number, number];
};

export type BedrockVisibleBounds = {
  width: number;
  height: number;
  offset_y: number;
};

function requirePositiveInteger(value: number, context: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${context} must be a positive integer.`);
  }
  return value;
}

function requireFiniteVec3(
  value: readonly number[],
  context: string
): asserts value is readonly [number, number, number] {
  if (value.length !== 3 || value.some((component) => !Number.isFinite(component))) {
    throw new Error(`${context} must contain exactly three finite components.`);
  }
}

export function planLogicalUvResolutionChange(
  previous: LogicalUvResolution,
  next: LogicalUvResolution,
  policy: LogicalUvResizePolicy
): LogicalUvResizePlan {
  const previousWidth = requirePositiveInteger(
    previous.width,
    "Previous logical UV width"
  );
  const previousHeight = requirePositiveInteger(
    previous.height,
    "Previous logical UV height"
  );
  const nextWidth = requirePositiveInteger(next.width, "Next logical UV width");
  const nextHeight = requirePositiveInteger(next.height, "Next logical UV height");

  const multiplier: [number, number] =
    policy === "rescale_uv"
      ? [nextWidth / previousWidth, nextHeight / previousHeight]
      : [1, 1];

  return {
    previous: { width: previousWidth, height: previousHeight },
    next: { width: nextWidth, height: nextHeight },
    policy,
    uv_multiplier: multiplier,
    requires_box_uv_integrality_check:
      policy === "rescale_uv" &&
      (!Number.isInteger(multiplier[0]) || !Number.isInteger(multiplier[1])),
  };
}

/**
 * Mirrors Blockbench's native Bedrock static visible-box basis:
 * horizontal width is a centered X/Z diameter in Minecraft blocks, while
 * height/offset are derived from Y block extents. This helper intentionally
 * computes the minimum required authored bounds only; runtime policy decides
 * whether to keep a larger existing Project.visible_box.
 */
export function fitBedrockVisibleBoundsFromWorldAabb(
  bounds: WorldAabb,
  paddingBlocks = 0
): BedrockVisibleBounds {
  requireFiniteVec3(bounds.min, "Visible-bounds minimum");
  requireFiniteVec3(bounds.max, "Visible-bounds maximum");
  if (!Number.isFinite(paddingBlocks) || paddingBlocks < 0) {
    throw new Error("Visible-bounds padding must be a finite value >= 0 blocks.");
  }

  const [minX, minY, minZ] = bounds.min;
  const [maxX, maxY, maxZ] = bounds.max;
  if (minX > maxX || minY > maxY || minZ > maxZ) {
    throw new Error("Visible-bounds minimum cannot exceed maximum on any axis.");
  }

  const blockSize = 16;
  const paddingUnits = paddingBlocks * blockSize;
  const radiusUnits =
    Math.max(maxX, -minX, maxZ, -minZ, 0) + paddingUnits;
  const width = Math.ceil((radiusUnits * 2) / blockSize);

  const yMinBlocks = Math.floor((minY - paddingUnits) / blockSize);
  const yMaxBlocks = Math.ceil((maxY + paddingUnits) / blockSize);

  return {
    width,
    height: yMaxBlocks - yMinBlocks,
    offset_y: (yMaxBlocks + yMinBlocks) / 2,
  };
}

export function expandBedrockVisibleBounds(
  current: BedrockVisibleBounds,
  required: BedrockVisibleBounds
): BedrockVisibleBounds {
  const values = [
    current.width,
    current.height,
    current.offset_y,
    required.width,
    required.height,
    required.offset_y,
  ];
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("Visible bounds must contain finite values.");
  }
  if (current.width < 0 || current.height < 0 || required.width < 0 || required.height < 0) {
    throw new Error("Visible-bounds width/height cannot be negative.");
  }

  const currentMinY = current.offset_y - current.height / 2;
  const currentMaxY = current.offset_y + current.height / 2;
  const requiredMinY = required.offset_y - required.height / 2;
  const requiredMaxY = required.offset_y + required.height / 2;
  const minY = Math.min(currentMinY, requiredMinY);
  const maxY = Math.max(currentMaxY, requiredMaxY);

  return {
    width: Math.max(current.width, required.width),
    height: maxY - minY,
    offset_y: (maxY + minY) / 2,
  };
}
