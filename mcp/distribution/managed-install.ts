import { createHash, randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

export const REPOSITORY = "MIVUBI-STD/M-LazyDesigner";
// MSIX can expose one installation through logical and physical Windows paths.
export const sameInstalledPath = (a: string, b: string): boolean =>
  realpathSync.native(a).toLowerCase() === realpathSync.native(b).toLowerCase();
export const SKILLS = ["blockit-bedrock-entity-mcp", "blockbench-bedrock-modelling", "blockit-bedrock-texturing", "blockit-bedrock-animation"];
export const sha256 = (bytes: Uint8Array | string): string => createHash("sha256").update(bytes).digest("hex");
export type Manifest = { schema: 1; repository: string; source_sha: string; build_identity: string; platform: "windows-x64"; files: Array<{ path: string; size: number; sha256: string }> };
export type InstallOptions = { root: string; workspace: string; plugin: string; config: string };
type Installed = { schema: 1; source_sha: string; options: InstallOptions; owned: Record<string, string> };
export type Edit = { path: string; bytes: Uint8Array; expected: string | null };
type Entry = { path: string; before: string | null; after: string; index: number };
type Journal = { schema: 1; status: "prepared" | "committed" | "rolled_back"; entries: Entry[] };
const BEGIN = "# BEGIN BLOCKIT MANAGED";
const END = "# END BLOCKIT MANAGED";

export function allowedPackagePath(path: string): boolean {
  return ["blockit.exe", "blockit_mcp.js", "AGENTS.md", "workspace/README.md", "LICENSE", "THIRD_PARTY_NOTICES.txt"].includes(path)
    || SKILLS.some((skill) => path === `.agents/skills/${skill}/SKILL.md`)
    || /^docs\/foundation\/[a-zA-Z0-9_-]+\.md$/.test(path);
}

export function parseManifest(value: unknown): Manifest {
  const m = value as Manifest;
  if (!m || m.schema !== 1 || m.repository !== REPOSITORY || m.platform !== "windows-x64"
      || !/^[a-f0-9]{40}$/.test(m.source_sha) || !/^sha256:[a-f0-9]{64}$/.test(m.build_identity)
      || !Array.isArray(m.files) || m.files.length > 80) throw new Error("Invalid BlockIT package manifest.");
  const paths = new Set<string>();
  let total = 0;
  for (const f of m.files) {
    if (!f || !allowedPackagePath(f.path) || paths.has(f.path.toLowerCase())
        || !Number.isSafeInteger(f.size) || f.size < 1 || f.size > 180_000_000
        || !/^[a-f0-9]{64}$/.test(f.sha256)) throw new Error("Invalid, duplicate or unowned package file.");
    paths.add(f.path.toLowerCase()); total += f.size;
  }
  if (total > 250_000_000) throw new Error("Package exceeds the installation size limit.");
  for (const required of ["blockit.exe", "blockit_mcp.js", "AGENTS.md", "workspace/README.md", "LICENSE", "THIRD_PARTY_NOTICES.txt", "docs/03-authoring/finalization/standard.md", ...SKILLS.map(s => `.agents/skills/${s}/SKILL.md`)]) {
    if (!paths.has(required.toLowerCase())) throw new Error(`Incomplete package: ${required}`);
  }
  return m;
}

export async function readOptional(path: string): Promise<Buffer | null> {
  try { return await readFile(path); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return null; throw e; }
}
const digestAt = async (path: string) => { const bytes = await readOptional(path); return bytes === null ? null : sha256(bytes); };

// Never follow a junction/symlink into a different workspace, executable or config.
export async function requirePlainPath(path: string): Promise<void> {
  if (!isAbsolute(path)) throw new Error(`An absolute path is required: ${path}`);
  for (let cursor = resolve(path);;) {
    try {
      const info = await lstat(cursor);
      if (info.isSymbolicLink() || (!info.isFile() && !info.isDirectory())) throw new Error(`Refusing linked or special path: ${cursor}`);
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
    const parent = dirname(cursor); if (parent === cursor) break; cursor = parent;
  }
}

export async function atomicWrite(path: string, bytes: Uint8Array): Promise<void> {
  await requirePlainPath(path); await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.blockit-${randomUUID()}`;
  try { await writeFile(temp, bytes, { flag: "wx" }); await rename(temp, path); }
  finally { await rm(temp, { force: true }); }
}
const jsonBytes = (value: unknown) => Buffer.from(JSON.stringify(value, null, 2) + "\n");

export async function withInstallLock<T>(root: string, action: () => Promise<T>, recoverDeadOwner = false): Promise<T> {
  await requirePlainPath(root); await mkdir(root, { recursive: true });
  const lock = join(root, ".install-lock"); await requirePlainPath(lock);
  try { await mkdir(lock); }
  catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    if (!recoverDeadOwner) throw new Error("Another installation may be active. Use recover only after it has exited.");
    await requirePlainPath(join(lock, "owner.json"));
    const owner = JSON.parse((await readFile(join(lock, "owner.json"))).toString());
    if (!Number.isInteger(owner.pid) || owner.pid < 1 || processAlive(owner.pid)) throw new Error("Installation lock owner is still alive or unknown.");
    await rm(lock, { recursive: true }); await mkdir(lock);
  }
  try { await writeFile(join(lock, "owner.json"), jsonBytes({ pid: process.pid }), { flag: "wx" }); return await action(); }
  finally { await rm(lock, { recursive: true, force: true }); }
}

export function processAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code !== "ESRCH"; }
}

export async function verifyPackage(directory: string): Promise<Manifest> {
  await requirePlainPath(join(directory, "blockit-package.json"));
  const m = parseManifest(JSON.parse((await readFile(join(directory, "blockit-package.json"))).toString()));
  for (const file of m.files) {
    const path = join(directory, file.path); await requirePlainPath(path);
    const info = await lstat(path);
    if (!info.isFile() || info.size !== file.size || await digestAt(path) !== file.sha256) throw new Error(`Package integrity failed: ${file.path}`);
  }
  const plugin = (await readFile(join(directory, "blockit_mcp.js"))).toString();
  if (plugin.match(/globalThis\.__BLOCKIT_BUILD_ID__\s*=\s*["'](sha256:[a-f0-9]{64})["']/)?.[1] !== m.build_identity) throw new Error("Plugin build identity does not match the package.");
  return m;
}

function managedBlock(original: string, replacement: string): string {
  const start = original.indexOf(BEGIN), end = original.indexOf(END);
  if ((start === -1) !== (end === -1) || (start >= 0 && (end < start || original.indexOf(BEGIN, start + 1) >= 0 || original.indexOf(END, end + 1) >= 0))) throw new Error("Malformed BlockIT managed section; refusing to rewrite user content.");
  const block = `${BEGIN}\n${replacement.trim()}\n${END}`;
  return start < 0 ? `${original}${original.endsWith("\n") || !original ? "" : "\n"}\n${block}\n` : original.slice(0, start) + block + original.slice(end + END.length);
}

// Bun's TOML parser may recover from a bare, invalid statement without throwing.
// This bounded lexical preflight rejects skipped statements/unbalanced delimiters;
// value semantics remain the injected TOML parser's responsibility.
function requireTomlStatements(text: string): void {
  if (text.length > 2_000_000) throw new Error("Codex configuration is too large.");
  let statement = "", quote = "", triple = false;
  const stack: string[] = [];
  const key = String.raw`(?:[A-Za-z0-9_-]+|@)(?:\s*\.\s*(?:[A-Za-z0-9_-]+|@))*`;
  const assignment = new RegExp(`^${key}\\s*=\\s*\\S[\\s\\S]*$`);
  const table = new RegExp(`^\\[\\s*${key}\\s*\\]$|^\\[\\[\\s*${key}\\s*\\]\\]$`);
  const complete = () => {
    const value = statement.trim(); statement = "";
    if (value && !assignment.test(value) && !table.test(value)) throw new Error("Invalid or unsupported TOML statement; no configuration changed.");
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quote) {
      if (quote === '"' && c === "\\") { i++; continue; }
      if (triple ? text.slice(i, i + 3) === quote.repeat(3) : c === quote) {
        if (triple) i += 2;
        quote = ""; triple = false;
      } else if (!triple && (c === "\n" || c === "\r")) throw new Error("Unclosed TOML string.");
      continue;
    }
    if (c === "#") { while (i < text.length && text[i] !== "\n") i++; if (!stack.length) complete(); continue; }
    if (c === '"' || c === "'") { quote = c; triple = text.slice(i, i + 3) === c.repeat(3); if (triple) i += 2; statement += "@"; continue; }
    if (c === "[" || c === "{") stack.push(c);
    if (c === "]" || c === "}") { if (stack.pop() !== (c === "]" ? "[" : "{")) throw new Error("Unbalanced TOML delimiters."); }
    if ((c === "\n" || c === "\r") && !stack.length) complete(); else statement += c;
  }
  if (quote || stack.length) throw new Error("Incomplete TOML configuration.");
  complete();
}

// Parse both versions with Bun's TOML parser; never regex-edit unvalidated config.
// Existing unowned BlockIT configuration needs explicit adoption, other servers do not.
export function configureCodex(original: string, executable: string, parse: (text: string) => any, adopt = false): string {
  requireTomlStatements(original);
  const before = parse(original);
  const hasManaged = original.includes(BEGIN);
  let base = original;
  if (!hasManaged && before.mcp_servers?.blockit) {
    if (!adopt) throw new Error("An existing blockit MCP configuration needs --adopt; it will be backed up.");
    // Only the ordinary, explicit BlockIT table form can be adopted without guessing TOML structure.
    const lines = original.split(/(?<=\n)/); let inside = false; let found = false; const kept: string[] = [];
    for (const line of lines) {
      if (/^\s*\[/.test(line)) {
        inside = /^\s*\[mcp_servers\.blockit(?:\.[A-Za-z0-9_-]+)?\]\s*(?:#.*)?(?:\r?\n)?$/.test(line);
        if (inside) found = true;
      }
      if (!inside) kept.push(line);
    }
    if (!found) throw new Error("Cannot safely adopt this nonstandard TOML table form.");
    base = kept.join("");
  }
  const prior = before.mcp_servers?.blockit ?? {};
  // Preserve options/security decisions rather than silently re-enabling a disabled server.
  if (prior.enabled === false) throw new Error("BlockIT is disabled in Codex; enable it explicitly before installation.");
  const options = { ...prior, command: executable, args: ["mcp"] };
  if (Object.hasOwn(options, "url")) throw new Error("Existing blockit points to a remote server; refusing to replace it.");
  const scalar = (v: unknown): string => {
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "boolean" || typeof v === "number" && Number.isFinite(v)) return String(v);
    if (Array.isArray(v)) return `[${v.map(scalar).join(", ")}]`;
    if (v && typeof v === "object") return `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)} = ${scalar(x)}`).join(", ")} }`;
    throw new Error("Unsupported existing BlockIT TOML value; no configuration changed.");
  };
  const after = managedBlock(base, `[mcp_servers.blockit]\n${Object.entries(options).map(([k, v]) => `${JSON.stringify(k)} = ${scalar(v)}`).join("\n")}`);
  requireTomlStatements(after);
  const parsed = parse(after);
  const strip = (o: any) => { const copy = structuredClone(o); if (copy.mcp_servers) { delete copy.mcp_servers.blockit; if (!Object.keys(copy.mcp_servers).length) delete copy.mcp_servers; } return copy; };
  const canonical = (v: any): any => Array.isArray(v) ? v.map(canonical) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
  if (JSON.stringify(canonical(strip(before))) !== JSON.stringify(canonical(strip(parsed))) || JSON.stringify(canonical(parsed.mcp_servers?.blockit)) !== JSON.stringify(canonical(options))) throw new Error("Codex configuration preservation check failed.");
  return after;
}

async function rollbackJournal(root: string, id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Invalid transaction identity.");
  const dir = join(root, "transactions", id), path = join(dir, "journal.json");
  await requirePlainPath(path); const journal: Journal = JSON.parse((await readFile(path)).toString());
  if (journal.schema !== 1 || !Array.isArray(journal.entries) || journal.entries.length > 100) throw new Error("Invalid installation journal.");
  // Validate every target/backup first, so a local edit blocks the entire rollback.
  for (const e of journal.entries) {
    if (!Number.isInteger(e.index) || e.index < 0 || e.index >= journal.entries.length || !/^[a-f0-9]{64}$/.test(e.after) || e.before !== null && !/^[a-f0-9]{64}$/.test(e.before)) throw new Error("Invalid rollback entry.");
    await requirePlainPath(e.path);
    await requirePlainPath(join(dir, `${e.index}.before`));
    const current = await digestAt(e.path);
    if (current !== e.before && current !== e.after) throw new Error(`Local modification blocks rollback: ${e.path}`);
    if (e.before !== null && await digestAt(join(dir, `${e.index}.before`)) !== e.before) throw new Error("Rollback backup is missing or corrupted.");
  }
  for (const e of [...journal.entries].reverse()) {
    if (await digestAt(e.path) === e.before) continue;
    if (e.before === null) await rm(e.path, { force: true });
    else await atomicWrite(e.path, await readFile(join(dir, `${e.index}.before`)));
  }
  journal.status = "rolled_back"; await atomicWrite(path, jsonBytes(journal));
}

export async function recoverInstallation(root: string, rollbackCommitted = false): Promise<void> {
  await requirePlainPath(join(root, "transaction.json"));
  const pointer = await readOptional(join(root, "transaction.json"));
  if (!pointer) return;
  const { id } = JSON.parse(pointer.toString());
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Invalid transaction pointer.");
  await requirePlainPath(join(root, "transactions", id, "journal.json"));
  const journal: Journal = JSON.parse((await readFile(join(root, "transactions", id, "journal.json"))).toString());
  if (journal.status === "prepared" || journal.status === "committed" && rollbackCommitted) await rollbackJournal(root, id);
}

export async function applyTransaction(root: string, edits: Edit[], afterWrite?: (count: number) => void): Promise<string> {
  await recoverInstallation(root);
  const unique = new Set(edits.map(e => resolve(e.path).toLowerCase()));
  if (unique.size !== edits.length) throw new Error("Duplicate installation target.");
  for (const edit of edits) {
    await requirePlainPath(edit.path);
    if (await digestAt(edit.path) !== edit.expected) throw new Error(`Concurrent change: ${edit.path}`);
  }
  const id = randomUUID(), dir = join(root, "transactions", id);
  await requirePlainPath(dir); await mkdir(dir, { recursive: true });
  const journal: Journal = { schema: 1, status: "prepared", entries: [] };
  for (const [index, edit] of edits.entries()) {
    const before = await readOptional(edit.path);
    if ((before === null ? null : sha256(before)) !== edit.expected) throw new Error(`Concurrent change during backup: ${edit.path}`);
    if (before !== null) await writeFile(join(dir, `${index}.before`), before, { flag: "wx" });
    journal.entries.push({ path: edit.path, before: edit.expected, after: sha256(edit.bytes), index });
  }
  await writeFile(join(dir, "journal.json"), jsonBytes(journal), { flag: "wx" });
  await atomicWrite(join(root, "transaction.json"), jsonBytes({ id }));
  try {
    for (const [index, edit] of edits.entries()) {
      if (await digestAt(edit.path) !== edit.expected) throw new Error(`Concurrent change: ${edit.path}`);
      await atomicWrite(edit.path, edit.bytes);
      if (await digestAt(edit.path) !== sha256(edit.bytes)) throw new Error(`Write verification failed: ${edit.path}`);
      afterWrite?.(index + 1);
    }
    journal.status = "committed"; await atomicWrite(join(dir, "journal.json"), jsonBytes(journal));
    return id;
  } catch (e) {
    try { await rollbackJournal(root, id); } catch (recovery) { throw new Error(`Installation interrupted; recover is required. ${String(e)}; ${String(recovery)}`); }
    throw e;
  }
}

export async function installedState(root: string): Promise<Installed | null> {
  const raw = await readOptional(join(root, "installed.json"));
  if (!raw) return null;
  const state: Installed = JSON.parse(raw.toString());
  if (state.schema !== 1 || !/^[a-f0-9]{40}$/.test(state.source_sha) || !state.owned || !state.options || !sameInstalledPath(state.options.root, root)) throw new Error("Invalid installation state.");
  return state;
}

export async function installPackage(directory: string, options: InstallOptions, parseToml: (s: string) => any, adopt = false): Promise<{ source_sha: string; changed_files: number; transaction: string | null }> {
  const m = await verifyPackage(directory);
  for (const p of Object.values(options)) await requirePlainPath(p);
  if (basename(options.plugin) !== "blockit_mcp.js") throw new Error("The plugin destination must be blockit_mcp.js.");
  const previous = await installedState(options.root);
  if (previous && JSON.stringify(previous.options) !== JSON.stringify(options)) throw new Error("Installation locations are already pinned; do not silently rebind them.");
  const version = join(options.root, "versions", m.source_sha);
  await requirePlainPath(version);
  // Immutable version directory: interrupted copies can resume, conflicting bytes cannot.
  for (const f of [...m.files, { path: "blockit-package.json", sha256: await digestAt(join(directory, "blockit-package.json")), size: 0 }]) {
    const source = join(directory, f.path), dest = join(version, f.path);
    await requirePlainPath(dest); const old = await digestAt(dest);
    if (old !== null && old !== f.sha256) throw new Error(`Immutable package conflict: ${dest}`);
    if (old === null) await atomicWrite(dest, await readFile(source));
  }
  if (JSON.stringify(await verifyPackage(version)) !== JSON.stringify(m)) throw new Error("Package manifest changed while staging.");
  const edits: Edit[] = [], owned: Record<string, string> = {};
  const plan = async (path: string, bytes: Uint8Array, merge = false) => {
    await requirePlainPath(path); const current = await digestAt(path), desired = sha256(bytes);
    if (!merge && current !== null && current !== desired && current !== previous?.owned[path] && !adopt) throw new Error(`Local file is not owned or was edited: ${path}. Use --adopt only to back up and replace these managed files.`);
    owned[path] = desired;
    if (current !== desired) edits.push({ path, bytes, expected: current });
  };
  for (const f of m.files) {
    if (f.path === "blockit.exe" || f.path === "LICENSE" || f.path === "THIRD_PARTY_NOTICES.txt") continue;
    const path = f.path === "blockit_mcp.js" ? options.plugin : join(options.workspace, f.path);
    const bytes = await readFile(join(version, f.path));
    if (f.path === "AGENTS.md") await plan(path, Buffer.from(managedBlock((await readOptional(path))?.toString() ?? "", bytes.toString())), true);
    else await plan(path, bytes);
  }
  const configuration = (await readOptional(options.config))?.toString() ?? "";
  await plan(options.config, Buffer.from(configureCodex(configuration, join(version, "blockit.exe"), parseToml, adopt)), true);
  // A cmd entrypoint is for explicit maintenance only; MCP starts the executable directly.
  const escaped = join(version, "blockit.exe");
  if (/[\r\n"%!]/.test(escaped)) throw new Error("Install path contains unsupported Windows command characters.");
  await plan(join(options.root, "blockit.cmd"), Buffer.from(`@echo off\r\n"${escaped}" %*\r\n`));
  const state: Installed = { schema: 1, source_sha: m.source_sha, options, owned };
  const statePath = join(options.root, "installed.json"), stateBytes = jsonBytes(state);
  if (await digestAt(statePath) !== sha256(stateBytes)) edits.push({ path: statePath, bytes: stateBytes, expected: await digestAt(statePath) });
  const transaction = edits.length ? await applyTransaction(options.root, edits) : null;
  return { source_sha: m.source_sha, changed_files: edits.length, transaction };
}

// Local process leases are consulted only at startup/update, never polled during authoring.
export async function activeGateways(root: string): Promise<boolean> {
  const dir = join(root, "leases"); await requirePlainPath(dir);
  const files = await readdir(dir).catch((e) => { if (e.code === "ENOENT") return []; throw e; });
  for (const file of files) {
    if (!/^[0-9]+\.json$/.test(file)) throw new Error("Unknown Gateway lease.");
    const pid = Number(file.slice(0, -5));
    if (processAlive(pid)) return true;
    await rm(join(dir, file));
  }
  return false;
}
