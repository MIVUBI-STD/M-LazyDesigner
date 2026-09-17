import { expect, test } from "bun:test";
import { analyzeMinecraftStyleEvidence } from "@/lib/minecraftStyleEvidence";

test("surface-only detail in geometry is surfaced as over-modeling evidence", () => {
  const result = analyzeMinecraftStyleEvidence({
    features: [
      { id: "painted_panel_line", owner: "geometry", surface_only: true },
      { id: "main_handle", owner: "geometry", affects_silhouette: true },
    ],
  });
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected Minecraft style evidence");
  expect(result.issue_examples[0]).toEqual({ kind: "surface_detail_overmodeled", feature_id: "painted_panel_line" });
});

test("silhouette-critical feature cannot be hidden in texture-only ownership", () => {
  const result = analyzeMinecraftStyleEvidence({
    features: [{ id: "roof_fin", owner: "texture", affects_silhouette: true }],
  });
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected Minecraft style evidence");
  expect(result.issue_examples[0]).toEqual({ kind: "silhouette_under_modeled", feature_id: "roof_fin" });
});

test("mixed pixel scales become review evidence without a scalar quality score", () => {
  const result = analyzeMinecraftStyleEvidence({
    features: [
      { id: "body", owner: "texture", pixel_scale: 1 },
      { id: "attachment", owner: "texture", pixel_scale: 0.25 },
    ],
  });
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected Minecraft style evidence");
  expect(result.issue_examples.some((issue) => issue.kind === "pixel_scale_conflict")).toBe(true);
  expect(result.visual_verdict).toBe("not_evaluated");
});

test("intentional non-Vanilla direction remains a caller decision rather than an automatic failure", () => {
  const result = analyzeMinecraftStyleEvidence({
    features: [{ id: "hero_prop", owner: "geometry", affects_volume: true, pixel_scale: 1 }],
  });
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected Minecraft style evidence");
  expect(result.representation_ready).toBe(true);
  expect(result.note).toContain("explicit non-Vanilla art direction");
});
