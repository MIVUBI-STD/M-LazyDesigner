/// <reference types="blockbench-types" />

export function requirePixelsWithinTexture(
  texture: Texture,
  points: Array<{ x: number; y: number }>
): void {
  for (const point of points) {
    if (
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      point.x < 0 ||
      point.y < 0 ||
      point.x >= texture.width ||
      point.y >= texture.height
    ) {
      throw new Error(
        `Coordinate (${point.x}, ${point.y}) is outside texture "${texture.name}" (${texture.width}x${texture.height}). Use in-bounds pixel coordinates.`
      );
    }
  }
}

export function getRuntimePainter(): BlockbenchRuntimePainter {
  return Painter as unknown as BlockbenchRuntimePainter;
}

type PaintCoordinate = { x: number; y: number };

export function requirePaintCoordinates(
  coordinates: readonly PaintCoordinate[],
  toolName: string
): void {
  if (coordinates.length === 0) {
    throw new Error(`${toolName} requires at least one coordinate.`);
  }
}

type TexturePixelRegion = {
  rect: [number, number, number, number];
  size: [number, number];
};

function requirePositiveTextureDimension(value: number, context: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${context} must be a finite positive texture dimension.`);
  }
  return value;
}

function requireFiniteTexturePoint(
  point: PaintCoordinate,
  width: number,
  height: number,
  context: string
): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`${context} must use finite texture coordinates.`);
  }
  if (point.x < 0 || point.y < 0 || point.x >= width || point.y >= height) {
    throw new Error(
      `${context} (${point.x}, ${point.y}) is outside texture bounds 0..${width - 1} × 0..${height - 1}.`
    );
  }
}

export function normalizeTexturePixelRegion(
  start: PaintCoordinate,
  end: PaintCoordinate,
  width: number,
  height: number,
  context: string
): TexturePixelRegion {
  requirePositiveTextureDimension(width, `${context} texture width`);
  requirePositiveTextureDimension(height, `${context} texture height`);
  requireFiniteTexturePoint(start, width, height, `${context} start`);
  requireFiniteTexturePoint(end, width, height, `${context} end`);
  if (
    !Number.isInteger(start.x) ||
    !Number.isInteger(start.y) ||
    !Number.isInteger(end.x) ||
    !Number.isInteger(end.y)
  ) {
    throw new Error(`${context} requires integer pixel coordinates for bounded region authoring.`);
  }

  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x) + 1;
  const bottom = Math.max(start.y, end.y) + 1;
  return {
    rect: [left, top, right, bottom],
    size: [right - left, bottom - top],
  };
}

export function texturePixelRectToUvTag(
  rect: readonly number[],
  width: number,
  height: number,
  uvWidth: number,
  uvHeight: number,
  context: string
): [number, number, number, number] {
  requirePositiveTextureDimension(width, `${context} texture width`);
  requirePositiveTextureDimension(height, `${context} texture height`);
  requirePositiveTextureDimension(uvWidth, `${context} UV width`);
  requirePositiveTextureDimension(uvHeight, `${context} UV height`);
  if (
    rect.length !== 4 ||
    rect.some((value) => !Number.isFinite(value) || !Number.isInteger(value))
  ) {
    throw new Error(`${context} requires an integer [left, top, right, bottom] pixel rectangle.`);
  }
  const [left, top, right, bottom] = rect;
  if (left < 0 || top < 0 || right <= left || bottom <= top || right > width || bottom > height) {
    throw new Error(`${context} pixel rectangle is outside the active texture frame.`);
  }
  return [
    (left / width) * uvWidth,
    (top / height) * uvHeight,
    (right / width) * uvWidth,
    (bottom / height) * uvHeight,
  ];
}

export function requireTextureCoordinatesWithinBounds(
  coordinates: readonly PaintCoordinate[],
  width: number,
  height: number,
  toolName: string
): void {
  requirePositiveTextureDimension(width, `${toolName} texture width`);
  requirePositiveTextureDimension(height, `${toolName} texture height`);
  coordinates.forEach((coordinate, index) =>
    requireFiniteTexturePoint(
      coordinate,
      width,
      height,
      `${toolName} coordinate[${index}]`
    )
  );
}

export function exactPixelBounds(coordinates: readonly PaintCoordinate[]): TexturePixelRegion {
  const xs = coordinates.map((coordinate) => coordinate.x);
  const ys = coordinates.map((coordinate) => coordinate.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs) + 1;
  const bottom = Math.max(...ys) + 1;
  return { rect: [left, top, right, bottom], size: [right - left, bottom - top] };
}

export function isExactPixelAuthoringRequest(
  coordinates: readonly PaintCoordinate[],
  settings: {
    size: number;
    opacity: number;
    softness: number;
    shape: string;
    blendMode: string;
    connectStrokes: boolean;
    mirrorPainting: boolean;
    lockAlpha: boolean;
    eraseMode: boolean;
  }
): boolean {
  return (
    coordinates.every(
      (coordinate) => Number.isInteger(coordinate.x) && Number.isInteger(coordinate.y)
    ) &&
    settings.size === 1 &&
    settings.opacity === 255 &&
    settings.softness === 0 &&
    settings.shape === "square" &&
    settings.blendMode === "default" &&
    settings.connectStrokes === false &&
    settings.mirrorPainting === false &&
    settings.lockAlpha === false &&
    settings.eraseMode === false
  );
}
