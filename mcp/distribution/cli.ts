import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { unlinkSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { normalizeRuntimeUrl } from "../gateway/contract";
import { probeLoopbackPort } from "./runtime-probe";
import { buildManagedStatus } from "./status";
import { atomicWrite, activeGateways, installedState, installPackage, readOptional, recoverInstallation, REPOSITORY, requirePlainPath, sameInstalledPath, sha256, verifyPackage, withInstallLock, type InstallOptions } from "./managed-install";

const RELEASE_ASSET = "blockit-windows-x64.zip";
const raw = process.argv.slice(2).filter(a => a !== "--");
const command = raw.shift() ?? "help";
const flags = new Map<string, string>();
for (let i = 0; i < raw.length; i++) {
  const flag = raw[i]!;
  if (!["--root", "--workspace", "--plugin-path", "--config", "--package", "--tag", "--adopt", "--preview"].includes(flag) || flags.has(flag)) throw new Error(`Unknown or repeated option: ${flag}`);
  if (["--adopt", "--preview"].includes(flag)) flags.set(flag, "true");
  else { const value = raw[++i]; if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`); flags.set(flag, value); }
}
const executableDir = dirname(process.execPath);
const inferredRoot = /[\\/]versions[\\/][a-f0-9]{40}$/.test(executableDir) ? dirname(dirname(executableDir)) : null;
const root = resolve(flags.get("--root") ?? process.env.BLOCKIT_HOME ?? inferredRoot ?? join(process.env.LOCALAPPDATA ?? homedir(), "BlockIT"));
const pendingPath = join(root, "pending.json");
const parseToml = (text: string) => Bun.TOML.parse(text);
const receipt = (value: unknown) => console.log(JSON.stringify(value, null, 2));

async function runtimeOnline(config?: string): Promise<boolean> {
  const parsed = config ? parseToml((await readOptional(config))?.toString() ?? "") as any : {};
  const endpoint = normalizeRuntimeUrl(parsed.mcp_servers?.blockit?.env?.BLOCKIT_RUNTIME_URL ?? process.env.BLOCKIT_RUNTIME_URL ?? "http://127.0.0.1:3000/bb-mcp");
  const url = new URL(endpoint);
  return probeLoopbackPort(url.hostname.replace(/^\[|\]$/g, ""), Number(url.port || (url.protocol === "https:" ? 443 : 80)));
}

async function activatePending(): Promise<unknown> {
  const rawPending = await readOptional(pendingPath);
  if (!rawPending) return { status: "NO_PENDING_UPDATE" };
  const pending = JSON.parse(rawPending.toString()) as { directory: string; options: InstallOptions; adopt: boolean };
  if (!sameInstalledPath(pending.options.root, root) || !sameInstalledPath(dirname(dirname(resolve(pending.directory))), join(root, "downloads")) || !/^[0-9a-f-]{36}$/.test(basename(dirname(pending.directory))) || basename(pending.directory) !== "package") throw new Error("Pending update is outside its installation.");
  if (await activeGateways(root) || await runtimeOnline(pending.options.config)) return { status: "STAGED", reason: "Close Blockbench and finish existing Codex MCP sessions; then run update again. Files are replaced automatically, not manually." };
  const result = await installPackage(pending.directory, pending.options, parseToml, pending.adopt);
  await rm(pendingPath);
  await rm(dirname(pending.directory), { recursive: true, force: true }).catch(e => console.error(`BlockIT staging cleanup deferred: ${String(e)}`));
  return { status: "INSTALLED", ...result, plugin: pending.options.plugin, workspace: pending.options.workspace, note: "First installation still requires native Blockbench plugin trust/load permission. Later updates replace the same file automatically; start Blockbench and a fresh Codex session." };
}

async function child(executable: string, args: string[], env = process.env): Promise<number> {
  return new Promise((accept, reject) => {
    const p = spawn(executable, args, { stdio: "inherit", env, windowsHide: true });
    p.once("error", reject); p.once("exit", code => accept(code ?? 1));
  });
}

async function download(url: string, max: number): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000), headers: { "User-Agent": "BlockIT-Managed-Install", "Accept": "application/octet-stream" } });
  const final = new URL(response.url);
  if (final.protocol !== "https:" || !["github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com"].includes(final.hostname)) throw new Error("Unexpected release download origin.");
  if (!response.ok || !response.body) throw new Error(`Release download failed: ${response.status}`);
  const chunks: Uint8Array[] = []; let size = 0;
  for await (const bytes of response.body as any as AsyncIterable<Uint8Array>) {
    size += bytes.length; if (size > max) { await response.body.cancel().catch(() => {}); throw new Error("Release archive is too large."); }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

// Fixed script, no interpolated user commands; verify all ZIP entries before extraction.
// Native ZipArchive is used instead of adding an archive library to the authoring runtime.
const EXTRACT = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($env:BLOCKIT_ARCHIVE)
try {
  $base = [IO.Path]::GetFullPath($env:BLOCKIT_EXTRACT) + [IO.Path]::DirectorySeparatorChar
  $seen = @{}; $total = 0
  if ($zip.Entries.Count -gt 160) { throw 'Too many archive entries' }
  foreach ($e in $zip.Entries) {
    $name = $e.FullName
    if (!$name -or $name -match '(^/|\\|:|(^|/)\.\.?(/|$)|[\x00-\x1f])' -or $seen.ContainsKey($name.ToLowerInvariant())) { throw 'Unsafe archive path' }
    $seen[$name.ToLowerInvariant()] = $true
    $kind = ($e.ExternalAttributes -shr 16) -band 61440
    if ($kind -ne 0 -and $kind -ne 32768 -and $kind -ne 16384) { throw 'Linked/special archive entry' }
    $total += $e.Length
    if ($total -gt 250000000 -or $e.Length -gt 180000000) { throw 'Archive size limit' }
    $target = [IO.Path]::GetFullPath([IO.Path]::Combine($base, $name))
    if (!$target.StartsWith($base, [StringComparison]::OrdinalIgnoreCase)) { throw 'Archive escape' }
  }
  foreach ($e in $zip.Entries) {
    $target = [IO.Path]::Combine($base, $e.FullName)
    if ($e.FullName.EndsWith('/')) { [IO.Directory]::CreateDirectory($target) | Out-Null; continue }
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
    $inputStream = $e.Open(); $outputStream = [IO.File]::Open($target, [IO.FileMode]::CreateNew)
    try {
      $buffer = New-Object byte[] 65536; $written = 0
      while (($count = $inputStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
        $written += $count
        if ($written -gt $e.Length) { throw 'Expanded entry exceeds declared length' }
        $outputStream.Write($buffer, 0, $count)
      }
      if ($written -ne $e.Length) { throw 'Truncated archive entry' }
    } finally { $inputStream.Dispose(); $outputStream.Dispose() }
  }
} finally { $zip.Dispose() }
`;

async function fetchRelease(): Promise<string> {
  const tag = flags.get("--tag");
  if (tag && !/^blockit-v\d+\.\d+\.\d+(?:-preview\.\d+)?$/.test(tag)) throw new Error("Use a versioned blockit-vX.Y.Z release tag.");
  const preview = flags.has("--preview");
  const endpoint = tag ? `tags/${tag}` : preview ? "?per_page=30" : "latest";
  const api = `https://api.github.com/repos/${REPOSITORY}/releases${endpoint.startsWith("?") ? endpoint : "/" + endpoint}`;
  const response = await fetch(api, { redirect: "error", signal: AbortSignal.timeout(15_000), headers: { Accept: "application/vnd.github+json", "User-Agent": "BlockIT-Managed-Install" } });
  if (!response.ok) throw new Error(`No installable release (${response.status}); the current installation is unchanged.`);
  let release: any = await response.json();
  if (Array.isArray(release)) release = release.filter(r => !r.draft && r.prerelease && /^blockit-v/.test(r.tag_name)).sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))[0];
  if (!release || release.draft || release.prerelease && !preview || !/^blockit-v\d+\.\d+\.\d+(?:-preview\.\d+)?$/.test(release.tag_name)) throw new Error("Release is not published on the selected channel.");
  const asset = release.assets?.find((a: any) => a.name === RELEASE_ASSET);
  if (!asset || !/^sha256:[a-f0-9]{64}$/.test(asset.digest) || asset.size > 250_000_000) throw new Error("Release has no digest-verified Windows package.");
  const url = new URL(asset.browser_download_url);
  if (url.origin !== "https://github.com" || url.pathname !== `/${REPOSITORY}/releases/download/${release.tag_name}/${RELEASE_ASSET}` || url.search || url.hash) throw new Error("Release asset URL does not match the trusted repository/tag.");
  const bytes = await download(url.href, 250_000_000);
  if (bytes.length !== asset.size || `sha256:${sha256(bytes)}` !== asset.digest) throw new Error("Release archive digest mismatch.");
  const staging = join(root, "downloads", randomUUID()), directory = join(staging, "package"), archive = join(staging, "release.zip");
  await requirePlainPath(staging); await mkdir(directory, { recursive: true }); await writeFile(archive, bytes, { flag: "wx" });
  const code = await child("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", EXTRACT], { ...process.env, BLOCKIT_ARCHIVE: archive, BLOCKIT_EXTRACT: directory });
  if (code !== 0) throw new Error("Safe release extraction failed; the current installation is unchanged.");
  await verifyPackage(directory); await rm(archive);
  return directory;
}

async function main(): Promise<void> {
  if (command === "help") { console.log("BlockIT: install [--workspace PATH] [--plugin-path EXISTING_FILE] [--adopt] | update [--tag blockit-vX.Y.Z] [--preview] | rollback | recover | status | mcp. No app, user build, or manual file replacement."); return; }
  if (command === "self-test") { receipt({ status: "PASS", platform: process.platform, arch: process.arch, repository: REPOSITORY }); return; }
  if (process.platform !== "win32" || process.arch !== "x64") throw new Error("Managed installation v1 supports Windows x64; other platforms retain the existing developer workflow.");
  if (command === "status") { receipt(await buildManagedStatus(root, pendingPath, runtimeOnline)); return; }
  if (command === "mcp") {
    let executable = process.execPath;
    await withInstallLock(root, async () => {
      await recoverInstallation(root);
      if (await readOptional(pendingPath)) await activatePending(); // Failure-path only, never startup network polling without a pending update.
      const state = await installedState(root);
      if (!state) throw new Error("Run BlockIT install once before connecting Codex.");
      executable = join(root, "versions", state.source_sha, "blockit.exe");
      if (!sameInstalledPath(executable, process.execPath)) return;
      await mkdir(join(root, "leases"), { recursive: true });
      const lease = join(root, "leases", `${process.pid}.json`);
      await writeFile(lease, JSON.stringify({ source_sha: state.source_sha }), { flag: "wx" });
      process.once("exit", () => { try { unlinkSync(lease); } catch {} });
    });
    if (!sameInstalledPath(executable, process.execPath)) process.exit(await child(executable, ["mcp", "--root", root]));
    await import("../gateway/index"); // The existing four-tool Gateway, not a second server.
    return;
  }
  if (!["install", "update", "rollback", "recover"].includes(command)) throw new Error(`Unknown command: ${command}`);
  await withInstallLock(root, async () => {
    const previous = await installedState(root);
    if (command === "recover" || command === "rollback") {
      if (await activeGateways(root) || await runtimeOnline(previous?.options.config)) throw new Error("Close Blockbench and active Codex MCP sessions before recovery/rollback.");
      await recoverInstallation(root, command === "rollback");
      if (command === "rollback") await rm(pendingPath, { force: true });
      receipt({ status: command.toUpperCase() + "_COMPLETE" }); return;
    }
    await recoverInstallation(root);
    // Retrying a staged update uses its already-verified local package: no repeated download.
    if (command === "update" && await readOptional(pendingPath) && !flags.has("--tag") && !flags.has("--preview")) { receipt(await activatePending()); return; }
    const source = command === "install" ? resolve(flags.get("--package") ?? executableDir) : await fetchRelease();
    const manifest = await verifyPackage(source);
    const options: InstallOptions = previous?.options ?? {
      root, workspace: resolve(flags.get("--workspace") ?? join(homedir(), "BlockIT-Workspace")),
      plugin: resolve(flags.get("--plugin-path") ?? join(root, "plugin", "blockit_mcp.js")),
      config: resolve(flags.get("--config") ?? join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "config.toml")),
    };
    // Retain the candidate under installation ownership even when a downloaded ZIP is later removed.
    const staging = command === "update" ? source : join(root, "downloads", randomUUID(), "package");
    await requirePlainPath(staging); await mkdir(staging, { recursive: true });
    for (const f of staging === source ? [] : ["blockit-package.json", ...manifest.files.map(f => f.path)]) {
      await mkdir(dirname(join(staging, f)), { recursive: true });
      await writeFile(join(staging, f), await readFile(join(source, f)), { flag: "wx" });
    }
    await verifyPackage(staging);
    await atomicWrite(pendingPath, Buffer.from(JSON.stringify({ directory: staging, options, adopt: flags.has("--adopt") })));
    receipt(await activatePending());
  }, command === "recover");
}

main().catch(error => { console.error(`BlockIT: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
