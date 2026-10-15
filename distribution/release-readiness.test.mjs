import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { inspectSource, inspectArtifacts } from "./release-readiness.mjs";
const SHA = "a".repeat(40);
async function write(root, path, data) {
  const abs = join(root, path);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, data);
}
async function workspace(t) {
  const root = await mkdtemp(join(tmpdir(), "lazydesigner-readiness-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function source(t) {
  const root = await workspace(t);
  await write(root, "apps/desktop/package.json", JSON.stringify({ version: "0.1.0", scripts: {
    "build:app": "prepare:managed-resource && tauri build --config src-tauri/tauri.bundle.conf.json",
    "build:app:trusted": "prepare:managed-resource && tauri build --config src-tauri/tauri.release.conf.json"
  } }));
  await write(root, "apps/desktop/src-tauri/tauri.conf.json", JSON.stringify({ version: "0.1.0", bundle: { active: true, targets: ["nsis"] } }));
  for (const name of ["tauri.bundle.conf.json", "tauri.release.conf.json"])
    await write(root, "apps/desktop/src-tauri/" + name, JSON.stringify({ bundle: { resources: ["resources/managed/"] } }));
  await write(root, "apps/desktop/src-tauri/Cargo.toml", '[package]\nversion = "0.1.0"\n');
  await write(root, "apps/desktop/scripts/prepare-managed-resource.ps1", 'bun run ../distribution/package.ts\n$manifest.source_sha -ne $sourceSha');
  await write(root, ".gitignore", "node_modules/\ndist/\nmcp/.cache/\napps/desktop/src-tauri/target/\napps/desktop/src-tauri/resources/managed/\n");
  await write(root, "distribution/managed-install.ts", "export const PACKAGE_SOURCE_PATHS = []; export async function verifyPackage() {} // 250_000_000 180_000_000");
  await write(root, "distribution/package.ts", "PACKAGE_SOURCE_PATHS; await verifyPackage(packageDir)");
  return root;
}
async function artifacts(t) {
  const root = await workspace(t), stage = "apps/desktop/src-tauri/resources/managed", files = [];
  for (const path of ["lazydesigner.exe", "lazydesigner_mcp.js", "AGENTS.md", "THIRD_PARTY_NOTICES.txt"]) {
    const data = Buffer.from("synthetic " + path);
    await write(root, stage + "/" + path, data);
    files.push({ path, size: data.length, sha256: createHash("sha256").update(data).digest("hex") });
  }
  await write(root, stage + "/lazydesigner-package.json", JSON.stringify({
    schema: 1, repository: "MIVUBI-STD/M-LazyDesigner", platform: "windows-x64",
    source_sha: SHA, build_identity: "sha256:" + "b".repeat(64), files
  }));
  const installer = "apps/desktop/src-tauri/target/release/bundle/nsis/Setup.exe";
  await write(root, installer, "synthetic, not an installer");
  return { root, stage, installer };
}
test("source policy accepts canonical configuration", async t => {
  assert.equal((await inspectSource(await source(t))).status, "PASS");
});
test("source policy rejects developer cache in resources", async t => {
  const root = await source(t);
  await write(root, "apps/desktop/src-tauri/tauri.bundle.conf.json", JSON.stringify({ bundle: { resources: ["resources/managed/", "../../../mcp/.cache"] } }));
  assert.equal((await inspectSource(root)).status, "FAIL");
});
test("source policy rejects version drift", async t => {
  const root = await source(t);
  await write(root, "apps/desktop/src-tauri/tauri.conf.json", JSON.stringify({ version: "0.2.0", bundle: { active: true, targets: ["nsis"] } }));
  assert.equal((await inspectSource(root)).status, "FAIL");
});
test("existing synthetic staged candidate can be inspected without building", async t => {
  const report = await inspectArtifacts((await artifacts(t)).root, { sourceSha: SHA });
  assert.equal(report.status, "PASS");
  assert.ok(report.managed_bytes > 0 && report.installer.bytes > 0);
});
test("unlisted staged files are rejected", async t => {
  const { root, stage } = await artifacts(t);
  await write(root, stage + "/extra.bin", "unexpected");
  assert.equal((await inspectArtifacts(root, { sourceSha: SHA })).status, "FAIL");
});
test("local acceptance cache is rejected from staged package", async t => {
  const { root, stage } = await artifacts(t);
  await write(root, stage + "/.cache/local-acceptance/blockit.exe", "legacy");
  assert.equal((await inspectArtifacts(root, { sourceSha: SHA })).status, "FAIL");
});
test("tampered file hashes are rejected", async t => {
  const { root, stage } = await artifacts(t);
  await write(root, stage + "/lazydesigner_mcp.js", "modified");
  assert.equal((await inspectArtifacts(root, { sourceSha: SHA })).status, "FAIL");
});
test("stale SHA is rejected", async t => {
  assert.equal((await inspectArtifacts((await artifacts(t)).root, { sourceSha: "c".repeat(40) })).status, "FAIL");
});
test("optional installer size ceiling fails closed", async t => {
  assert.equal((await inspectArtifacts((await artifacts(t)).root, { sourceSha: SHA, maxInstallerMiB: 0.000001 })).status, "FAIL");
});
test("missing installer cannot pass", async t => {
  const { root, installer } = await artifacts(t);
  await rm(join(root, installer));
  assert.equal((await inspectArtifacts(root, { sourceSha: SHA })).status, "FAIL");
});
