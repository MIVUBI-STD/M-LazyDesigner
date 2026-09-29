export type TextureSelectionCoordinates = Readonly<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}>;

export function rectangleSelectionPredicate(
  coordinates: TextureSelectionCoordinates
): (x: number, y: number) => boolean {
  const minX = Math.floor(Math.min(coordinates.x1, coordinates.x2));
  const maxX = Math.ceil(Math.max(coordinates.x1, coordinates.x2));
  const minY = Math.floor(Math.min(coordinates.y1, coordinates.y2));
  const maxY = Math.ceil(Math.max(coordinates.y1, coordinates.y2));
  return (x, y) => x >= minX && x < maxX && y >= minY && y < maxY;
}

export function ellipseSelectionPredicate(
  coordinates: TextureSelectionCoordinates
): (x: number, y: number) => boolean {
  const centerX = (coordinates.x1 + coordinates.x2) / 2;
  const centerY = (coordinates.y1 + coordinates.y2) / 2;
  const radiusX = Math.abs(coordinates.x2 - coordinates.x1) / 2;
  const radiusY = Math.abs(coordinates.y2 - coordinates.y1) / 2;
  if (radiusX === 0 || radiusY === 0) {
    throw new Error("Ellipse selection requires non-zero width and height.");
  }

  return (x, y) => {
    const dx = (x + 0.5 - centerX) / radiusX;
    const dy = (y + 0.5 - centerY) / radiusY;
    return dx * dx + dy * dy <= 1;
  };
}
