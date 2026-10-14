import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { startRuntimeSessionLease, stopRuntimeSessionLease, type RuntimeSessionFs } from "@/plugin/runtimeSessionLease";

test.skipIf(process.platform !== "win32")("Blockbench scoped FS keeps lease fresh and removes only its own instance synchronously", () => {
  const originalInterval = globalThis.setInterval;
  const originalInfo = (globalThis as any).SystemInfo;
  const originalLocal = process.env.LOCALAPPDATA;
  let tick: (() => void) | undefined;
  let writes = 0;
  const files = new Map<string, string>();
  // Blockbench 5.2's scoped FS lacks utimesSync and has a broken rmSync wrapper.
  const scopedFs = {
    mkdirSync() {},
    writeFileSync(path: string, bytes: string) { files.set(path, bytes); writes++; },
    readFileSync(path: string) { if (!files.has(path)) throw Error("ENOENT"); return files.get(path)!; },
    unlinkSync(path: string) { files.delete(path); },
  } as unknown as RuntimeSessionFs;
  try {
    process.env.LOCALAPPDATA = "C:\\fixture\\Local";
    (globalThis as any).SystemInfo = { user_data_directory: "C:\\fixture\\Blockbench" };
    globalThis.setInterval = ((callback: () => void) => {
      tick = callback;
      return originalInterval(() => {}, 60_000);
    }) as typeof setInterval;
    expect(startRuntimeSessionLease(scopedFs, { createHash }, 3000, "/bb-mcp")).toBe(true);
    const path = [...files.keys()][0]!;
    const first = files.get(path);
    tick!();
    tick!();
    expect(writes).toBe(3);
    expect(files.get(path)).toBe(first);
    stopRuntimeSessionLease();
    expect(files.size).toBe(0);

    expect(startRuntimeSessionLease(scopedFs, { createHash }, 3000, "/bb-mcp")).toBe(true);
    files.set(path, JSON.stringify({ schema: 1, instance_id: "replacement" }));
    tick!();
    stopRuntimeSessionLease();
    expect(JSON.parse(files.get(path)!).instance_id).toBe("replacement");
  } finally {
    stopRuntimeSessionLease();
    globalThis.setInterval = originalInterval;
    (globalThis as any).SystemInfo = originalInfo;
    if (originalLocal === undefined) delete process.env.LOCALAPPDATA;
    else process.env.LOCALAPPDATA = originalLocal;
  }
});
