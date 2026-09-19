import { expect, test } from "bun:test";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getAllToolDefinitions } from "../lib/factories";
import "../server/tools";
import { exportModelParameters } from "../server/tools/export";

test("native restricted fs can overwrite regular projects but rejects symlinks and non-files", async () => {
  const directory = fs.mkdtempSync(join(tmpdir(), "lazydesigner-export-native-"));
  const project = { name: "fixture", uuid: "fixture", save_path: "", saved: false };
  let writes = 0;
  const nativeFs = {
    // Match Blockbench's permitted API, deliberately excluding lstatSync.
    existsSync: fs.existsSync, readdirSync: fs.readdirSync, statSync: fs.statSync,
    writeFileSync: (...args: Parameters<typeof fs.writeFileSync>) => { writes++; fs.writeFileSync(...args); },
  };
  const globals = {
    Project: project, Format: { id: "bedrock" },
    Codecs: { project: { extension: "bbmodel", compile: () => '{"new":true}',
      afterSave: (path: string) => { project.save_path = path; project.saved = true; } },
      bedrock: { extension: "json", compile: () => "{}", afterSave() {} } },
    requireNativeModule: (name: string) => name === "fs" ? nativeFs : null,
  };
  const saved = Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  const run = (path: string, overwrite = true, codec_id = "project") =>
    getAllToolDefinitions().export_model.execute(exportModelParameters.parse({path, overwrite, codec_id}));
  try {
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, {value, configurable:true, writable:true});
    const regular = join(directory, "fixture.bbmodel");
    fs.writeFileSync(regular, "old");
    await expect(run(regular, false)).rejects.toThrow("explicit consent");
    expect(writes).toBe(0);
    await run(regular);
    expect(fs.readFileSync(regular, "utf8")).toBe('{"new":true}');
    expect(project.saved).toBe(true);
    const folder = join(directory, "folder.bbmodel");
    fs.mkdirSync(folder);
    await expect(run(folder)).rejects.toThrow("non-file");
    // Directory symlinks use junctions on Windows (no developer-mode requirement).
    const link = join(directory, "link.bbmodel");
    fs.symlinkSync(folder, link, process.platform === "win32" ? "junction" : "dir");
    await expect(run(link)).rejects.toThrow("symbolic link");
    const geometry = join(directory, "existing.geo.json");
    fs.writeFileSync(geometry, "keep");
    await expect(run(geometry, true, "bedrock")).rejects.toThrow("existing Bedrock geometry");
    expect(fs.readFileSync(geometry, "utf8")).toBe("keep");
    expect(writes).toBe(1);
  } finally {
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    fs.rmSync(directory, {recursive:true, force:true});
  }
});
