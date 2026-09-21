export type Rgba = readonly [number, number, number, number];
export type PaletteRgb = readonly [number, number, number];

export type ProceduralTextureRecipe = {
  width: number;
  height: number;
  base: Rgba;
  gradient?: { axis: "x" | "y"; to: Rgba; strength?: number };
  noise?: { seed: number; amount: number };
  palette?: readonly PaletteRgb[];
  dither?: "bayer4";
};

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

function clampByte(value: number): number { return Math.max(0, Math.min(255, Math.round(value))); }
function mix(a: number, b: number, t: number): number { return a + (b - a) * t; }
function hashNoise(x: number, y: number, seed: number): number {
  let value = Math.imul(x + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(y + seed, 0xc2b2ae35);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  return ((value >>> 0) / 0xffffffff) * 2 - 1;
}
function nearestPalette(r: number, g: number, b: number, palette: readonly PaletteRgb[]): PaletteRgb {
  let best = palette[0];
  let bestDistance = Infinity;
  for (const color of palette) {
    const dr = r - color[0], dg = g - color[1], db = b - color[2];
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) { best = color; bestDistance = distance; }
  }
  return best;
}

export function renderProceduralTexture(recipe: ProceduralTextureRecipe): Uint8Array {
  if (!Number.isInteger(recipe.width) || recipe.width <= 0 || !Number.isInteger(recipe.height) || recipe.height <= 0) throw new Error("Procedural texture dimensions must be positive integers.");
  if (recipe.palette && recipe.palette.length === 0) throw new Error("Procedural texture palette cannot be empty.");
  if (recipe.noise && (!Number.isFinite(recipe.noise.amount) || recipe.noise.amount < 0)) throw new Error("Noise amount must be a finite non-negative number.");
  const out = new Uint8Array(recipe.width * recipe.height * 4);
  for (let y = 0; y < recipe.height; y += 1) {
    for (let x = 0; x < recipe.width; x += 1) {
      const axisT = recipe.gradient ? (recipe.gradient.axis === "x" ? x / Math.max(1, recipe.width - 1) : y / Math.max(1, recipe.height - 1)) : 0;
      const gradientT = recipe.gradient ? axisT * (recipe.gradient.strength ?? 1) : 0;
      let r = recipe.gradient ? mix(recipe.base[0], recipe.gradient.to[0], gradientT) : recipe.base[0];
      let g = recipe.gradient ? mix(recipe.base[1], recipe.gradient.to[1], gradientT) : recipe.base[1];
      let b = recipe.gradient ? mix(recipe.base[2], recipe.gradient.to[2], gradientT) : recipe.base[2];
      const a = recipe.gradient ? mix(recipe.base[3], recipe.gradient.to[3], gradientT) : recipe.base[3];
      if (recipe.noise) {
        const delta = hashNoise(x, y, recipe.noise.seed) * recipe.noise.amount;
        r += delta; g += delta; b += delta;
      }
      if (recipe.dither === "bayer4") {
        const threshold = (BAYER4[y & 3][x & 3] / 15 - 0.5) * 16;
        r += threshold; g += threshold; b += threshold;
      }
      if (recipe.palette) {
        const nearest = nearestPalette(r, g, b, recipe.palette);
        [r, g, b] = nearest;
      }
      const index = (y * recipe.width + x) * 4;
      out[index] = clampByte(r);
      out[index + 1] = clampByte(g);
      out[index + 2] = clampByte(b);
      out[index + 3] = clampByte(a);
    }
  }
  return out;
}
