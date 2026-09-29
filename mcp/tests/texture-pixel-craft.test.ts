import { expect, test } from "bun:test";
import { analyzeTexturePixelCraft } from "@/lib/texturePixelCraft";

function rgbaGrid(
  width: number,
  height: number,
  pixel: (x: number, y: number) => [number, number, number, number]
) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      data.set(pixel(x, y), (y * width + x) * 4);
    }
  }
  return data;
}

test("coherent flat material region stays unfragmented", () => {
  const rgba = rgbaGrid(4, 4, () => [120, 90, 60, 255]);
  const result = analyzeTexturePixelCraft(rgba, 4, 4);
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected available");
  expect(result.isolation.isolated_visible_pixel_count).toBe(0);
  expect(result.color_clusters.component_count).toBe(1);
  expect(result.color_clusters.tiny_component_visible_ratio).toBe(0);
  expect(result.local_transitions.quantized_color_transition_ratio).toBe(0);
  expect(result.review_hints).toEqual([]);
});

test("isolated checker noise becomes bounded review evidence without failing style", () => {
  const rgba = rgbaGrid(5, 5, (x, y) =>
    (x + y) % 2 === 0
      ? [255, 0, 0, 255]
      : [0, 0, 255, 255]
  );
  const result = analyzeTexturePixelCraft(rgba, 5, 5);
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected available");
  expect(result.color_clusters.tiny_component_visible_ratio).toBe(1);
  expect(result.local_transitions.quantized_color_transition_ratio).toBe(1);
  expect(result.review_hints).toContain(
    "HIGH_TINY_CLUSTER_FRAGMENTATION"
  );
  expect(result.visual_verdict).toBe("not_evaluated");
});

test("alpha cutout complexity is measured without calling it an error", () => {
  const rgba = rgbaGrid(5, 5, (x, y) =>
    x === 2 || y === 2
      ? [80, 180, 80, 255]
      : [0, 0, 0, 0]
  );
  const result = analyzeTexturePixelCraft(rgba, 5, 5);
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected available");
  expect(result.alpha_boundary.edge_count).toBeGreaterThan(0);
  expect(result.note).toContain("can be intentional");
});

test("large atlas refuses expensive exact cluster scan and requests focused evidence", () => {
  const width = 256;
  const height = 256;
  const rgba = new Uint8ClampedArray(width * height * 4);
  const result = analyzeTexturePixelCraft(rgba, width, height);
  expect(result.state).toBe("unavailable");
  if (result.state !== "unavailable") throw new Error("expected unavailable");
  expect(result.reason).toBe("region_too_large_for_exact_pixel_craft");
  expect(result.suggested_action).toContain("focused get_texture region");
});
