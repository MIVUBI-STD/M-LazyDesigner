/** Read-only release preparation. Never build, clean, sign, install or publish. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { lstat, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
const maxManaged = 250_000_000, maxFile = 180_000_000;
const required = ["lazydesigner.exe", "lazydesigner_mcp.js", "AGENTS.md", "THIRD_PARTY_NOTICES.txt"];
const banned = new Set([".cache", "node_modules", "target", "tests", "fixtures", "debug", ".git"]);
function ensure(ok, why) { if (!ok) throw Error(why); }
async function json(path) { return JSON.parse(await readFile(path, "utf8")); }
async function check(rows, name, action) {
  try { await action(); rows.push({ name, status: "PASS" }); }
  catch (error) { rows.push({ name, status: "FAIL", detail: String(error.message || error) }); }
}
function report(mode, rows, extra = {}) {
  return { schema: 1, mode, status: rows.every(r => r.status === "PASS") ? "PASS" : "FAIL", ...extra, checks: rows,
    unverified: mode === "source" ? "No installer, signature or native acceptance tested." :
      "NSIS internal contents, installed application, trust signature and native Blockbench unverified." };
}
function safePath(name) {
  ensure(typeof name === "string" && name.length > 0 && name.length < 500, "Invalid managed path");
  ensure(!name.startsWith("/") && !name.includes("\\") && !name.includes(":") && !name.includes("\0"), "Unsafe path: " + name);
  ensure(name.split("/").every(s => s && s !== "." && s !== ".." && !banned.has(s.toLowerCase())), "Developer path: " + name);
  ensure(!/(\.map|\.pdb|\.log|\.tmp|\.ts|\.tsx|\.test\.js)$/i.test(name), "Developer file: " + name);
  ensure(!/(^|\/)blockit(_mcp)?\.(exe|js)$/i.test(name), "Retired component: " + name);
  return name;
}
async function inventory(dir, sub = "", tally = { n: 0 }) {
  const info = await lstat(join(dir, sub));
  ensure(info.isDirectory() && !info.isSymbolicLink(), "Unsafe managed directory: " + sub);
  const files = [];
  for (const item of await readdir(join(dir, sub), { withFileTypes: true })) {
    const name = sub ? sub + "/" + item.name : item.name;
    ensure(++tally.n <= 3000, "Excessive stage file count");
    safePath(name);
    ensure(!item.isSymbolicLink(), "Symlink found: " + name);
    if (item.isDirectory()) files.push(...await inventory(dir, name, tally));
    else { ensure(item.isFile(), "Unsupported staged entry: " + name); files.push(name); }
  }
  return files;
}
async function sha256(path) {
  const hash = createHash("sha256");
  for await (const bytes of createReadStream(path)) hash.update(bytes);
  return hash.digest("hex");
}
export async function inspectSource(root = ROOT) {
  const rows = [];
  const tauri = join(root, "apps/desktop/src-tauri");
  const [pkg, base, bundle, trusted, cargo, prepare, ignore, manager, packager] = await Promise.all([
    json(join(root, "apps/desktop/package.json")),
    json(join(tauri, "tauri.conf.json")),
    json(join(tauri, "tauri.bundle.conf.json")),
    json(join(tauri, "tauri.release.conf.json")),
    readFile(join(tauri, "Cargo.toml"), "utf8"),
    readFile(join(root, "apps/desktop/scripts/prepare-managed-resource.ps1"), "utf8"),
    readFile(join(root, ".gitignore"), "utf8"),
    readFile(join(root, "distribution/managed-install.ts"), "utf8"),
    readFile(join(root, "distribution/package.ts"), "utf8"),
  ]);
  await check(rows, "Desktop versions match", () => {
    ensure(/^\d+\.\d+\.\d+$/.test(pkg.version), "Malformed version");
    ensure(pkg.version === base.version && cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1] === pkg.version, "Version drift");
  });
  await check(rows, "Tauri NSIS target and resource allowlist", () => {
    ensure(base.bundle?.active === true && JSON.stringify(base.bundle?.targets) === '["nsis"]', "Unexpected bundle target");
    ensure(base.bundle.resources === undefined, "Unexpected base resources");
    for (const config of [bundle, trusted])
      ensure(JSON.stringify(config.bundle?.resources) === '["resources/managed/"]', "Extra or missing managed resources");
  });
  await check(rows, "Canonical exact-SHA managed package owners", () => {
    for (const [key, conf] of [["build:app", "tauri.bundle.conf.json"], ["build:app:trusted", "tauri.release.conf.json"]])
      ensure(pkg.scripts?.[key]?.includes("prepare:managed-resource") && pkg.scripts[key].includes(conf), "Packaging command bypass: " + key);
    ensure(prepare.includes("bun run ../distribution/package.ts") && prepare.includes("$manifest.source_sha -ne $sourceSha"), "Managed resource not exact source");
    ensure(manager.includes("export const PACKAGE_SOURCE_PATHS") && manager.includes("export async function verifyPackage") && manager.includes("250_000_000") && manager.includes("180_000_000"), "Canonical managed verification missing/changed");
    ensure(packager.includes("PACKAGE_SOURCE_PATHS") && packager.includes("await verifyPackage(packageDir)"), "Packager bypasses canonical verifier");
  });
  await check(rows, "Developer artifacts excluded from Git", () => {
    const rules = new Set(ignore.split(/\r?\n/).map(s => s.trim()));
    for (const rule of ["node_modules/", "dist/", "mcp/.cache/", "apps/desktop/src-tauri/target/", "apps/desktop/src-tauri/resources/managed/"])
      ensure(rules.has(rule), "Missing ignore rule: " + rule);
  });
  return report("source", rows, { desktop_version: pkg.version });
}
export async function inspectArtifacts(root = ROOT, options = {}) {
  const rows = [];
  const stage = join(root, "apps/desktop/src-tauri/resources/managed");
  const bundle = join(root, "apps/desktop/src-tauri/target/release/bundle/nsis");
  const sourceSha = options.sourceSha ?? execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  let managedBytes = 0, installer = null;
  await check(rows, "Expected exact source SHA", () => ensure(/^[a-f0-9]{40}$/.test(sourceSha), "Malformed source SHA"));
  await check(rows, "Managed stage manifest and full content inventory", async () => {
    const m = await json(join(stage, "lazydesigner-package.json"));
    ensure(m.schema === 1 && m.repository === "MIVUBI-STD/M-LazyDesigner" && m.platform === "windows-x64", "Wrong manifest identity");
    ensure(m.source_sha === sourceSha && /^sha256:[a-f0-9]{64}$/.test(m.build_identity), "Source/build identity mismatch");
    ensure(Array.isArray(m.files) && m.files.length > 0 && m.files.length <= 80, "Invalid manifest file list");
    const physical = await inventory(stage);
    const found = new Set(physical.map(n => n.toLowerCase()));
    ensure(found.size === physical.length, "Case-colliding files");
    const expected = new Set(["lazydesigner-package.json"]);
    for (const item of m.files) {
      const path = safePath(item.path);
      ensure(!expected.has(path.toLowerCase()), "Duplicate package path: " + path);
      ensure(Number.isSafeInteger(item.size) && item.size > 0 && item.size <= maxFile && /^[a-f0-9]{64}$/.test(item.sha256), "Invalid file metadata: " + path);
      expected.add(path.toLowerCase());
      managedBytes += item.size;
      const real = join(stage, ...path.split("/"));
      const stat = await lstat(real);
      ensure(stat.isFile() && !stat.isSymbolicLink() && stat.size === item.size, "Missing or resized: " + path);
      ensure(await sha256(real) === item.sha256, "Hash mismatch: " + path);
    }
    ensure(managedBytes <= maxManaged, "Managed package exceeds 250,000,000 bytes");
    for (const item of required) ensure(expected.has(item.toLowerCase()), "Missing required component: " + item);
    ensure(found.size === expected.size && [...expected].every(item => found.has(item)), "Unexpected or missing staged file");
  });
  await check(rows, "One existing NSIS installer and optional byte budget", async () => {
    const names = (await readdir(bundle)).filter(n => /\.exe$/i.test(n));
    ensure(names.length === 1, "Expected exactly one installer, found " + names.length);
    const path = join(bundle, names[0]), stat = await lstat(path);
    ensure(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0, "Invalid installer");
    if (options.maxInstallerMiB !== undefined)
      ensure(Number.isFinite(options.maxInstallerMiB) && options.maxInstallerMiB > 0 && stat.size <= options.maxInstallerMiB * 1048576, "Installer exceeds explicit budget");
    installer = { file: names[0], bytes: stat.size, sha256: await sha256(path) };
  });
  return report("artifacts", rows, { source_sha: sourceSha, managed_bytes: managedBytes, installer });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const argv = process.argv.slice(2);
    let mode = "source", sourceSha, maxInstallerMiB, jsonOutput = false;
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (a === "--mode") mode = argv[++i];
      else if (a === "--json") jsonOutput = true;
      else if (a === "--source-sha") sourceSha = argv[++i];
      else if (a === "--max-installer-mib") maxInstallerMiB = Number(argv[++i]);
      else throw Error("Unknown option: " + a);
    }
    ensure(["source", "artifacts"].includes(mode), "Invalid mode");
    ensure(mode === "artifacts" || (sourceSha === undefined && maxInstallerMiB === undefined), "Artifact-only option on source preflight");
    const outcome = mode === "source" ? await inspectSource() : await inspectArtifacts(ROOT, { sourceSha, maxInstallerMiB });
    if (jsonOutput) console.log(JSON.stringify(outcome, null, 2));
    else {
      console.log("Release readiness " + mode + ": " + outcome.status);
      for (const c of outcome.checks) console.log("  " + c.status + " " + c.name + (c.detail ? ": " + c.detail : ""));
      if (outcome.installer) console.log("Installer bytes: " + outcome.installer.bytes);
      if (outcome.managed_bytes !== undefined) console.log("Managed bytes: " + outcome.managed_bytes);
      console.log("NOT PROVEN: " + outcome.unverified);
    }
    if (outcome.status !== "PASS") process.exitCode = 1;
  } catch (error) {
    console.error("Release readiness failed: " + String(error.message || error));
    process.exitCode = 1;
  }
}
