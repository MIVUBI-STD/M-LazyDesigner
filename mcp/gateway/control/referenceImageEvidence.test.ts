import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, stat, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { buildControlStageContext } from "./contextProjection";
import type { ControlWorkspaceProjection } from "./workspace";
import { readReferenceImageEvidence, summarizeReferenceAlphaSilhouette } from "./referenceImageEvidence";
import { readReferencePackageProjection } from "./referencePackage";

const RED_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8Dwn4GBgYGJAQoAHxcCAk+Uzr4AAAAASUVORK5CYII=", "base64"
);
const BLUE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGNkYPj/n4GBgYGJAQoAHRkCAjRcHicAAAAASUVORK5CYII=", "base64"
);
const dirs: string[] = [];
async function packageRoot(images: unknown[] = [{
  id: "IMG_FRONT", file: "images/front.png", role: "PRIMARY_GEOMETRY",
  view: "front", used_by: ["GEOMETRY"], status: "APPROVED",
}]) {
  const root = await mkdtemp(join(tmpdir(), "ld-reference-"));
  dirs.push(root);
  await mkdir(join(root, "images"));
  await writeFile(join(root, "images/front.png"), RED_PNG);
  await writeFile(join(root, "REFERENCE.json"), JSON.stringify({
    schema: "lazydesigner-reference-v1",
    asset: { name: "Bench", kind: "MODEL", profile: "PROP_FURNITURE" },
    readiness: { overall: "READY", geometry: "READY" },
    images,
  }));
  return root;
}
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});
const workspace: ControlWorkspaceProjection = {
  available: true, source_path: null, fingerprint: "workspace-1",
  asset: "Bench", current_stage: "Geometry",
  gates: { geometry: "IN_PROGRESS", uv_layout: null, texturing: null, animation: null },
  next_step: null, blockers: [],
};

describe("actual reference image evidence — Control owner", () => {

  test("on-demand PNG alpha evidence remains diagnostic for opaque and changed image bytes", async () => {
    const root = await packageRoot();
    const current = await readReferencePackageProjection(root);
    const [image] = await readReferenceImageEvidence(current, ["IMG_FRONT"]);
    expect(summarizeReferenceAlphaSilhouette(image)).toMatchObject({
      state: "UNVERIFIED", reason: "OPAQUE_OR_EMPTY_ALPHA_MASK",
      source_image_sha256: image.sha256,
      visual_verdict: "NOT_EVALUATED", model_comparison_performed: false,
    });
    expect(summarizeReferenceAlphaSilhouette({
      ...image, data: BLUE_PNG.toString("base64"),
    }).reason).toBe("PNG_IMAGE_IDENTITY_MISMATCH");
    expect(summarizeReferenceAlphaSilhouette({
      ...image, status: "DRAFT",
    }).reason).toBe("APPROVED_SINGLE_VIEW_PNG_REQUIRED");
    expect(summarizeReferenceAlphaSilhouette({
      ...image, view: null,
    }).reason).toBe("APPROVED_SINGLE_VIEW_PNG_REQUIRED");
  });

  test("delivers real image bytes by stage image identity without putting pixels in JSON", async () => {
    const root = await packageRoot();
    const reference = await readReferencePackageProjection(root);
    expect(reference.available).toBe(true);
    expect(reference.images[0]).toMatchObject({
      id: "IMG_FRONT", view: "front", integrity: "VERIFIED",
      sha256: createHash("sha256").update(RED_PNG).digest("hex"),
      media_type: "image/png", bytes: RED_PNG.length,
    });
    const evidence = await readReferenceImageEvidence(reference, ["IMG_FRONT"]);
    expect(evidence).toHaveLength(1);
    expect(evidence[0].id).toBe("IMG_FRONT");
    expect(Buffer.from(evidence[0].data, "base64")).toEqual(RED_PNG);
    const serialized = JSON.stringify({
      source_hash: reference.fingerprint,
      image_id: evidence[0].id, image_sha256: evidence[0].sha256,
    });
    expect(serialized).not.toContain(evidence[0].data);
  });

  test("source landmark coordinates follow the current delivered image identity", async () => {
    const root = await packageRoot([{
      id: "IMG_FRONT", file: "images/front.png",
      view: "front", used_by: ["GEOMETRY"], status: "APPROVED",
      landmarks: [{ id: "torso_center", uv: [0.5, 0.55], part_id: "torso" }],
    }]);
    const reference = await readReferencePackageProjection(root);
    const evidence = await readReferenceImageEvidence(reference, ["IMG_FRONT"]);
    expect(evidence[0]).toMatchObject({
      id: "IMG_FRONT", view: "front",
      sha256: reference.images[0].sha256,
      landmarks: [{ id: "torso_center", uv: [0.5, 0.55], part_id: "torso" }],
    });
    expect(evidence[0].landmarks).toHaveLength(1);
    const stage = buildControlStageContext({
      domain: "GEOMETRY", reference, workspace,
    });
    expect(stage.reference_image_ids).toEqual(["IMG_FRONT"]);
  });

  test("delivers region annotations with the exact original image and part correspondence", async () => {
    const root = await packageRoot();
    await writeFile(join(root, "REFERENCE.json"), JSON.stringify({
      schema: "lazydesigner-reference-v1",
      asset: { name: "Bench", kind: "MODEL", profile: "PROP_FURNITURE" },
      parts: [
        { id: "seat", role: "GEOMETRY" },
        { id: "seat_decal", role: "TEXTURE" },
      ],
      readiness: { overall: "READY", geometry: "READY", texture: "READY" },
      images: [{
        id: "IMG_FRONT", file: "images/front.png", role: "PRIMARY_GEOMETRY",
        view: "front", used_by: ["GEOMETRY", "TEXTURE"], status: "APPROVED",
        regions: [
          { id: "seat_volume", part_id: "seat", evidence_role: "PRIMARY_VOLUME",
            visibility: "DIRECT", box_uv: [0.15, 0.2, 0.85, 0.7] },
          { id: "logo", part_id: "seat_decal", evidence_role: "SURFACE_DETAIL",
            visibility: "DIRECT", box_uv: [0.4, 0.4, 0.6, 0.5] },
        ],
      }],
    }));
    const reference = await readReferencePackageProjection(root);
    const evidence = await readReferenceImageEvidence(reference, ["IMG_FRONT"]);
    expect(evidence[0]).toMatchObject({
      id: "IMG_FRONT", view: "front",
      sha256: createHash("sha256").update(RED_PNG).digest("hex"),
      regions: [
        { id: "seat_volume", part_id: "seat", evidence_role: "PRIMARY_VOLUME" },
        { id: "logo", part_id: "seat_decal", evidence_role: "SURFACE_DETAIL" },
      ],
    });
    expect(Buffer.from(evidence[0].data, "base64")).toEqual(RED_PNG);
    expect(buildControlStageContext({
      domain: "GEOMETRY", reference, workspace,
    }).reference_image_ids).toEqual(["IMG_FRONT"]);
    const statusSource = await Bun.file("gateway/handlers/registerCoreTools.ts").text();
    expect(statusSource).toContain("semantic_part_grounding: summarizeReferencePartRegions(");
    expect(statusSource).toContain("regions: image.regions,");
  });

  test("fresh image content invalidates stage fingerprint when REFERENCE.json is unchanged", async () => {
    const root = await packageRoot();
    const initial = await readReferencePackageProjection(root);
    const firstContext = buildControlStageContext({
      domain: "GEOMETRY", reference: initial, workspace,
    });
    const file = join(root, "images/front.png");
    const original = await stat(file);
    expect(BLUE_PNG.length).toBe(RED_PNG.length);
    await writeFile(file, BLUE_PNG);
    await utimes(file, original.atime, original.mtime);
    const updated = await readReferencePackageProjection(root);
    const secondContext = buildControlStageContext({
      domain: "GEOMETRY", reference: updated, workspace,
    });
    expect(initial.images[0].sha256).not.toBe(updated.images[0].sha256);
    expect(initial.fingerprint).not.toBe(updated.fingerprint);
    expect(firstContext.context_hash).not.toBe(secondContext.context_hash);
    expect(Buffer.from((await readReferenceImageEvidence(updated, ["IMG_FRONT"]))[0].data, "base64"))
      .toEqual(BLUE_PNG);
  });

  test("missing images block the affected authoring stage, not merely emit an empty success", async () => {
    const root = await packageRoot([{
      id: "IMG_MISSING", file: "images/missing.png", role: "PRIMARY_GEOMETRY",
      used_by: ["GEOMETRY"], status: "APPROVED",
    }]);
    const reference = await readReferencePackageProjection(root);
    expect(reference.images[0].integrity).toBe("MISSING");
    const stage = buildControlStageContext({ domain: "GEOMETRY", reference, workspace });
    expect(stage.stage_readiness).toBe("BLOCKED");
    expect(stage.blocking_unknowns).toContain("REFERENCE_IMAGE_MISSING:IMG_MISSING");
    await expect(readReferenceImageEvidence(reference, ["IMG_MISSING"])).rejects.toThrow(
      "REFERENCE_IMAGE_UNAVAILABLE"
    );
  });

  test("one missing texture reference does not block independent geometry work", async () => {
    const root = await packageRoot([
      { id: "GEO", file: "images/front.png",
        view: "front", used_by: ["GEOMETRY"], status: "APPROVED" },
      { id: "TEX", file: "images/not-ready.png",
        used_by: ["TEXTURE"], status: "APPROVED" },
    ]);
    const reference = await readReferencePackageProjection(root);
    expect(reference.readiness.geometry).toBe("READY");
    expect(reference.readiness.texture).toBe("BLOCKED");
    const geometry = buildControlStageContext({
      domain: "GEOMETRY", reference, workspace,
    });
    const texture = buildControlStageContext({
      domain: "TEXTURING", reference, workspace,
    });
    expect(geometry.stage_readiness).toBe("READY");
    expect(texture.stage_readiness).toBe("BLOCKED");
    expect((await readReferenceImageEvidence(reference, ["GEO"]))[0].view).toBe("front");
  });

  test("rejects path traversal, symlink and non-image payloads", async () => {
    const root = await packageRoot([
      { id: "ESCAPE", file: "../outside.png", used_by: ["GEOMETRY"] },
      { id: "FAKE", file: "images/fake.png", used_by: ["GEOMETRY"] },
      { id: "LINK", file: process.platform === "win32" ? "images/link/front.png" : "images/link.png", used_by: ["GEOMETRY"] },
    ]);
    await writeFile(join(root, "images/fake.png"), Buffer.from("not a PNG"));
    if (process.platform === "win32") {
      // Junctions exercise the ancestor-link guard without file-symlink privileges.
      await symlink(join(root, "images"), join(root, "images/link"), "junction");
    } else {
      await symlink(join(root, "images/front.png"), join(root, "images/link.png"));
    }
    const reference = await readReferencePackageProjection(root);
    expect(reference.images.map((x) => x.integrity)).toEqual([
      "INVALID", "INVALID", "INVALID",
    ]);
    expect(buildControlStageContext({ domain: "GEOMETRY", reference, workspace })
      .stage_readiness).toBe("BLOCKED");
    await expect(readReferenceImageEvidence(reference, ["ESCAPE"])).rejects.toThrow(
      "REFERENCE_IMAGE_UNAVAILABLE"
    );
  });

  test("rejects duplicate image identities and modified source bytes after projection", async () => {
    const root = await packageRoot([
      { id: "A", file: "images/front.png", used_by: ["GEOMETRY"] },
      { id: "A", file: "images/front.png", used_by: ["GEOMETRY"] },
    ]);
    const duplicate = await readReferencePackageProjection(root);
    expect(duplicate.available).toBe(false);
    expect(duplicate.unavailable_reason).toBe("REFERENCE_INVALID");
    await writeFile(join(root, "REFERENCE.json"), JSON.stringify({
      schema: "lazydesigner-reference-v1",
      asset: { name: "Bench", kind: "MODEL" },
      images: [{ id: "A", file: "images/front.png", used_by: ["GEOMETRY"] }],
    }));
    const fresh = await readReferencePackageProjection(root);
    await writeFile(join(root, "images/front.png"), BLUE_PNG);
    await expect(readReferenceImageEvidence(fresh, ["A"])).rejects.toThrow(
      "REFERENCE_IMAGE_CHANGED"
    );
  });

  test("MCP status opts in to real image transport without changing four-tool gateway", async () => {
    const source = await Bun.file("gateway/handlers/registerCoreTools.ts").text();
    expect(source).toContain("include_reference_images");
    expect(source).toContain("reference_image_ids");
    expect(source).toContain("readReferenceImageEvidence(source, ids)");
    expect(source).toContain('type: "image" as const');
    expect(source).toContain("visual_verdict: \"not_evaluated\"");
    expect(source).toContain("model_image_capture_required: true");
  });
});
