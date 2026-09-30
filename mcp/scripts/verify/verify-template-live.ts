import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { LiveMcpClient, expect, firstImage, imageDigest, requireDisposableConsent, structuredObject, type JsonObject } from "./live-e2e-common";

// Development fixture only: synthetic geometry/pixels are not user-approved assets.
async function main() {
  requireDisposableConsent();
  const client = new LiveMcpClient({ expectedPhase: "geometry", requiredTools: ["create_project", "manage_cubes", "create_texture", "paint_with_brush", "undo", "redo"] });
  const environment = await client.preflight();
  const cache = resolve(".cache/template-live");
  await mkdir(cache, { recursive: true });
  const call = async (name: string, args: JsonObject = {}) => structuredObject(await client.callTool(name, args), name);
  await call("create_project", { name: "blockit_template_disposable", resolution: 128 });
  const root = await call("add_group", { name: "template_root" });
  await call("manage_cubes", { operation: "create", group: (root.group as JsonObject).uuid, elements: [
    { name: "body", from: [-4, 0, -4], to: [4, 8, 4] },
    { name: "top", from: [-2, 8, -2], to: [2, 12, 2] },
  ] });
  const initial = await call("create_texture", { name: "template_atlas", type: "template", pixel_density: 32 });
  const texture = initial.texture as JsonObject;
  const uuid = texture.uuid;
  expect(typeof uuid === "string", "Missing atlas UUID");
  expect((texture.physical_pixels_per_uv_unit as JsonObject).x === 2 && (texture.physical_pixels_per_uv_unit as JsonObject).y === 2, "Native density 32 must produce two bitmap pixels per UV unit");
  const audit = initial.uv_audit as JsonObject;
  expect((audit.production_gate as JsonObject).state === "ready", "Native UV hygiene failed");
  const atlas = async () => firstImage(await client.callTool("get_texture", { texture: uuid }), "get_texture");
  const before = await atlas();
  await Bun.write(resolve(cache, "before.png"), Buffer.from(before.data, "base64"));
  const brushPixels: number[] = [];
  for (const size of [1, 2]) {
    await client.callTool("paint_with_brush", { texture_id: uuid, coordinates: [{ x: 4, y: 4 }], connect_strokes: false, brush_settings: { size, opacity: 255, softness: 0, shape: "square", color: "#FF00FE", blend_mode: "default" } });
    const painted = await atlas();
    const path = resolve(cache, `brush-${size}.png`);
    await Bun.write(path, Buffer.from(painted.data, "base64"));
    // Use the installed Pillow runtime to compare decoded pixels, not PNG bytes.
    const comparison = Bun.spawn([process.env.PYTHON ?? "python", "-c", "from PIL import Image; import sys; a=Image.open(sys.argv[1]).convert('RGBA'); b=Image.open(sys.argv[2]).convert('RGBA'); assert a.size==b.size; print(sum(x!=y for x,y in zip(a.getdata(),b.getdata())))", resolve(cache, "before.png"), path], { stdout: "pipe", stderr: "pipe" });
    const count = Number((await new Response(comparison.stdout).text()).trim());
    expect(await comparison.exited === 0, "Pillow pixel comparison failed");
    expect(count === size * size, `Size ${size} painted ${count} pixels instead of ${size * size}`);
    brushPixels.push(count);
    await call("undo", { steps: 1 });
    expect(imageDigest(await atlas()) === imageDigest(before), `Brush ${size} Undo did not restore atlas`);
    await call("redo", { steps: 1 });
    expect(imageDigest(await atlas()) === imageDigest(painted), `Brush ${size} Redo did not restore atlas`);
    await call("undo", { steps: 1 });
  }
  const rebuilt = await call("create_texture", { name: "template_atlas", type: "template", texture_id: uuid, pixel_density: 16 });
  expect((rebuilt.texture as JsonObject).uuid === uuid && rebuilt.rebuilt === true, "Rebuild changed atlas identity");
  const rebuiltDensity = (rebuilt.texture as JsonObject).physical_pixels_per_uv_unit as JsonObject;
  expect(rebuiltDensity.x === 1 && rebuiltDensity.y === 1, "Native rebuild density 16 must produce one bitmap pixel per UV unit");
  const inventory = await call("list_textures");
  expect((inventory.textures as unknown[]).length === 1, "Rebuild duplicated the atlas");
  const rebuiltImage = await atlas();
  expect(imageDigest(rebuiltImage) !== imageDigest(before), "Density rebuild did not change bitmap");
  await call("undo", { steps: 1 });
  expect(imageDigest(await atlas()) === imageDigest(before), "Rebuild Undo did not restore original bitmap");
  await call("redo", { steps: 1 });
  expect(imageDigest(await atlas()) === imageDigest(rebuiltImage), "Rebuild Redo did not restore bitmap");
  const checkpoint = resolve(cache, "template-disposable.bbmodel");
  await call("export_model", { codec_id: "project", path: checkpoint, overwrite: true });
  console.log(JSON.stringify({ ok: true, proof: "native_template_brush_undo", build_identity: environment.buildIdentity, brush_pixels: brushPixels, single_atlas_rebuild: true, native_undo_redo: true, checkpoint, visual_quality: "not_evaluated" }, null, 2));
}

if (import.meta.main) await main();