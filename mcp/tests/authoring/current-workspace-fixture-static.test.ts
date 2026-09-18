import { describe, expect, test } from "bun:test";
import { buildUvAtlasAudit, type UvAtlasUsage } from "@/server/tools/texture";

const FIXTURE = {
  name: "lift",
  readme: "../workspace/active/lift/README.md",
  model: "../workspace/active/lift/lift.bbmodel",
  geometry: "../workspace/active/lift/lift.geo.json",
  animation: "../workspace/active/lift/lift.animation.json",
  references: [
    "../workspace/active/lift/references/approved-reference.png",
    "../workspace/active/lift/references/window-detail.png",
  ],
} as const;

const FACE_KEYS = ["north", "south", "east", "west", "up", "down"] as const;
type JsonObject = Record<string, any>;

async function json(path: string): Promise<JsonObject> {
  return Bun.file(path).json() as Promise<JsonObject>;
}

function uvUsages(elements: JsonObject[]): UvAtlasUsage[] {
  const usages: UvAtlasUsage[] = [];
  for (const cube of elements) {
    const size = [0, 1, 2].map(
      (axis) => Number(cube.to?.[axis]) - Number(cube.from?.[axis])
    );
    for (const faceKey of FACE_KEYS) {
      const face = cube.faces?.[faceKey] as JsonObject | undefined;
      if (!face || face.texture === null || face.texture === undefined || !Array.isArray(face.uv)) {
        continue;
      }
      const axes =
        faceKey === "up" || faceKey === "down"
          ? [0, 2]
          : faceKey === "east" || faceKey === "west"
            ? [2, 1]
            : [0, 1];
      usages.push({
        cube_uuid: String(cube.uuid),
        cube_name: String(cube.name),
        face: faceKey,
        uv: face.uv.map(Number),
        box_uv: cube.box_uv === true,
        autouv: Number(cube.autouv ?? 0),
        mirror_uv: cube.mirror_uv === true,
        face_rotation: Number(face.rotation ?? 0),
        surface_area: Math.abs(size[axes[0]] * size[axes[1]]),
      });
    }
  }
  return usages;
}

describe("current representative workspace fixture", () => {
  test("keeps current asset continuity on the canonical workspace state vocabulary", async () => {
    const readme = await Bun.file(FIXTURE.readme).text();

    expect(readme).toContain("Current Stage: COMPLETE");
    expect(readme).toContain("Geometry: APPROVED");
    expect(readme).toContain("UV Layout: PASS");
    expect(readme).toContain("Texturing: APPROVED");
    expect(readme).toContain("Animation: APPROVED");
    expect(readme).toContain("Geometry Strategy: DIRECT");
    expect(readme).toContain("Fixture boundary:");
    expect(readme).toContain("historical structural/compatibility fixture media only");
    expect(readme).toContain("not** a craftsmanship, visual-quality, acceptance-quality, or efficiency benchmark");
    expect(readme).not.toContain("Current Stage: DELIVERED");
    expect(readme).not.toContain("## Prior tests / remaining proof");
  });

  test("is a healthy non-trivial Bedrock input without becoming product law", async () => {
    const model = await json(FIXTURE.model);
    const elements = (model.elements ?? []) as JsonObject[];
    const groups = (model.groups ?? []) as JsonObject[];
    const textures = (model.textures ?? []) as JsonObject[];

    expect(model.meta?.model_format).toBe("bedrock");
    expect(elements.length).toBeGreaterThan(1);
    expect(groups.length).toBeGreaterThan(1);
    expect(new Set(elements.map((element) => element.uuid)).size).toBe(elements.length);
    expect(new Set(groups.map((group) => group.uuid)).size).toBe(groups.length);
    expect(elements.every((element) => element.type === "cube")).toBe(true);

    expect(Number(model.resolution?.width)).toBeGreaterThan(0);
    expect(Number(model.resolution?.height)).toBeGreaterThan(0);
    expect(textures.length).toBeGreaterThan(0);
    expect(textures.some((texture) => String(texture.source).startsWith("data:image/png;base64,"))).toBe(true);

    for (const reference of FIXTURE.references) {
      const file = Bun.file(reference);
      expect(await file.exists(), `${FIXTURE.name}: ${reference}`).toBe(true);
      expect(file.size).toBeGreaterThan(0);
    }
  });

  test("exercises the generic UV audit without fixture-specific packing thresholds", async () => {
    const model = await json(FIXTURE.model);
    const elements = (model.elements ?? []) as JsonObject[];
    const usages = uvUsages(elements);
    expect(usages.length).toBeGreaterThan(0);

    const width = Number(model.resolution?.width);
    const height = Number(model.resolution?.height);
    const audit = buildUvAtlasAudit(usages, width, height);
    expect(audit.state).toBe("available");
    if (audit.state !== "available") return;

    expect(audit.invalid_uv.count).toBe(0);
    expect(audit.fractional_uv.count).toBe(0);
    expect(audit.packing.occupied_area).toBeGreaterThan(0);
    expect(audit.packing.occupied_size[0]).toBeLessThanOrEqual(width);
    expect(audit.packing.occupied_size[1]).toBeLessThanOrEqual(height);
    expect(audit.packing.occupancy_ratio).toBeGreaterThan(0);
    expect(audit.packing.occupancy_ratio).toBeLessThanOrEqual(1);
    expect(audit.packing.padding).toBe("unverified");
  });

  test("keeps compiled geometry and animation exports consistent with the editable fixture", async () => {
    const [model, geo, exported] = await Promise.all([
      json(FIXTURE.model),
      json(FIXTURE.geometry),
      json(FIXTURE.animation),
    ]);

    const geometry = geo["minecraft:geometry"]?.[0] as JsonObject | undefined;
    expect(geometry).toBeDefined();
    if (!geometry) return;

    expect(Number(geometry.description?.texture_width)).toBe(Number(model.resolution?.width));
    expect(Number(geometry.description?.texture_height)).toBe(Number(model.resolution?.height));

    const bones = (geometry.bones ?? []) as JsonObject[];
    const compiledCubeCount = bones.reduce(
      (sum, bone) => sum + ((bone.cubes ?? []) as unknown[]).length,
      0
    );
    expect(compiledCubeCount).toBe(((model.elements ?? []) as unknown[]).length);

    const boneNames = new Set(bones.map((bone) => String(bone.name)));
    for (const group of (model.groups ?? []) as JsonObject[]) {
      expect(boneNames.has(String(group.name)), `Missing compiled bone ${String(group.name)}`).toBe(true);
    }

    const nativeAnimations = (model.animations ?? []) as JsonObject[];
    const exportedAnimations = (exported.animations ?? {}) as Record<string, JsonObject>;
    expect(Object.keys(exportedAnimations).sort()).toEqual(
      nativeAnimations.map((animation) => String(animation.name)).sort()
    );

    for (const native of nativeAnimations) {
      const compiled = exportedAnimations[String(native.name)];
      if (!compiled) throw new Error(`Missing compiled animation ${String(native.name)}.`);
      expect(Number(compiled.animation_length)).toBe(Number(native.length));

      const nativeAnimatedBones = Object.values(native.animators ?? {})
        .filter(
          (animator): animator is JsonObject =>
            Boolean(animator) &&
            typeof animator === "object" &&
            Array.isArray((animator as JsonObject).keyframes) &&
            (animator as JsonObject).keyframes.length > 0
        )
        .map((animator) => String(animator.name))
        .sort();
      expect(Object.keys(compiled.bones ?? {}).sort()).toEqual(nativeAnimatedBones);
    }
  });
});
