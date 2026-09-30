// Bounded native reproduction; never opens or changes the rejected production asset.
// Run from mcp after matching managed activation and AUTHORING handoff:
// bun run scripts/verify-uv-density-live.ts --confirm-disposable
// Reopen the saved fixture in Blockbench, then repeat with --verify-reopen.
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { LiveMcpClient, expect, requireDisposableConsent, structuredObject, type JsonObject } from "./live-e2e-common";

const root = resolve(".cache/uv-density-live");
const modelPath = resolve(root, "uv-density.bbmodel");
const receiptPath = resolve(root, "receipt.json");
const client = new LiveMcpClient({ expectedPhase: "geometry", requiredTools: [
  "create_project", "add_group", "manage_cubes", "create_texture", "list_textures",
  "inspect_elements", "get_project_info", "export_model", "undo", "redo",
] });
async function inventory() {
  return structuredObject(await client.callTool("list_textures", {}, "inspection"), "list_textures");
}
async function fingerprint() {
  const atlas = await inventory();
  const geometry = structuredObject(await client.callTool("inspect_elements", {
    mode: "detail", id: "uv_density_thin", detail: "uv",
  }, "inspection"), "inspect_elements");
  return { uv_audit: atlas.uv_audit, thin: { from: geometry.from, to: geometry.to, uv: geometry.uv } };
}
function ready(result: JsonObject) {
  const audit = result.uv_audit as JsonObject;
  expect((audit?.production_gate as JsonObject)?.state === "ready", `UV gate failed: ${JSON.stringify(audit)}`);
  return audit;
}
async function main() {
  requireDisposableConsent();
  const environment = await client.preflight();
  await mkdir(root, { recursive: true });
  if (process.argv.includes("--verify-reopen")) {
    const prior = await Bun.file(receiptPath).json();
    expect(prior.environment.buildIdentity === environment.buildIdentity, "Reopen must use the prepared build.");
    expect(JSON.stringify(await fingerprint()) === JSON.stringify(prior.fingerprint), "Reopen changed mapping or geometry.");
    await Bun.write(receiptPath, JSON.stringify({ ...prior, reopen: "PASS", reopen_metrics: client.snapshotMetrics() }, null, 2));
    console.log("UV fixture reopen PASS; visual quality is UNVERIFIED.");
    return;
  }
  // No discard flag: fail closed if the selected user project has unsaved work.
  await client.callTool("create_project", { name: "uv_density_disposable", resolution: 128 }, "mutation");
  await client.callTool("add_group", { name: "uv_density_root", origin: [0, 0, 0] }, "mutation");
  await client.callTool("manage_cubes", { operation: "create", group: "uv_density_root",
    elements: [{ name: "uv_density_body", from: [0, 0, 0], to: [32, 16, 16] }] }, "mutation");
  await client.callTool("manage_cubes", { operation: "create", group: "uv_density_root",
    elements: [{ name: "uv_density_thin", from: [40, 0, 0], to: [41, 4, 0.5] }],
    faces: [
      { face: "north", uv: [0, 0, 1, 4] }, { face: "south", uv: [2, 0, 3, 4] },
      { face: "east", uv: [4, 0, 4.5, 4] }, { face: "west", uv: [5, 0, 5.5, 4] },
      { face: "up", uv: [6, 0, 7, 0.5] }, { face: "down", uv: [8, 0, 9, 0.5] },
    ] }, "mutation");
  const blank = await fingerprint();
  const created = structuredObject(await client.callTool("create_texture", {
    name: "uv_density_atlas", type: "template", width: 256, height: 256,
    pixel_density: 32, rearrange_uv: true, power_of_two: true, padding: true,
    keep_multi_texture_occupancy: false,
  }, "mutation"), "create_texture");
  const audit = ready(created);
  expect((audit.fractional_uv as JsonObject).count as number > 0, "Fixture did not exercise fractional logical UV.");
  const after = await fingerprint();
  await client.callTool("undo", { steps: 1 }, "history");
  expect(JSON.stringify(await fingerprint()) === JSON.stringify(blank), "Undo did not restore pre-template state.");
  await client.callTool("redo", { steps: 1 }, "history");
  expect(JSON.stringify(await fingerprint()) === JSON.stringify(after), "Redo did not restore native UV mapping.");
  await client.callTool("export_model", { codec_id: "project", path: modelPath }, "mutation");
  await Bun.write(receiptPath, JSON.stringify({ environment, native_template: "PASS", history: "PASS",
    fingerprint: after, texture: created.texture, reopen: "BELUM DIUJI", visual_quality: "UNVERIFIED",
    metrics: client.snapshotMetrics(), tokens: "UNKNOWN", modelPath }, null, 2));
  console.log(`Native 32x UV/history PASS. Reopen ${modelPath} then run --verify-reopen; no visual acceptance claimed.`);
}
main().catch(error => { console.error(String(error)); process.exitCode = 1; });