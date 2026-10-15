import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { isOwnedRuntimeSessionLease, startRuntimeSessionLease, stopRuntimeSessionLease, type RuntimeSessionFs } from "@/plugin/runtimeSessionLease";
import { setupProjectNavigationSnapshot, teardownProjectNavigationSnapshot } from "@/plugin/projectNavigationSnapshot";

test("Runtime lease owner must match schema 2, product and instance ID", () => {
  const identity = {
    schema: 2,
    product_id: "lazydesigner-bedrock-entity-mcp",
    instance_id: "owner-1",
  };
  expect(isOwnedRuntimeSessionLease(identity, "owner-1")).toBe(true);
  expect(isOwnedRuntimeSessionLease({ ...identity, schema: 1 }, "owner-1")).toBe(false);
  expect(isOwnedRuntimeSessionLease({ ...identity, product_id: "foreign" }, "owner-1")).toBe(false);
  expect(isOwnedRuntimeSessionLease({ ...identity, instance_id: "new-owner" }, "owner-1")).toBe(false);
  expect(isOwnedRuntimeSessionLease(null, "owner-1")).toBe(false);
  expect(isOwnedRuntimeSessionLease(identity, "")).toBe(false);
});

test.skipIf(process.platform !== "win32")("Blockbench scoped FS keeps lease fresh and removes only its own instance synchronously", () => {
  const originalInterval = globalThis.setInterval;
  const originalRequire = (globalThis as any).requireNativeModule;
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
    globalThis.setInterval = (() => { throw Error("Renderer timers are suspended"); }) as typeof setInterval;
    (globalThis as any).requireNativeModule = (name: string) => {
      expect(name).toBe("timers");
      return { setInterval: (callback: () => void) => {
      tick = callback;
      return originalInterval(() => {}, 60_000);
      }, clearInterval };
    };
    const build = `sha256:${"a".repeat(64)}`;
    expect(startRuntimeSessionLease(scopedFs, { createHash }, 3000, "/bb-mcp", null)).toBe(false);
    expect(startRuntimeSessionLease(scopedFs, { createHash }, 3000, "/bb-mcp", build)).toBe(true);
    const lease = JSON.parse([...files.values()][0]!);
    expect(lease.schema).toBe(2);
    expect(lease.product_id).toBe("lazydesigner-bedrock-entity-mcp");
    expect(lease.build_identity).toBe(build);
    const path = [...files.keys()][0]!;
    const first = files.get(path);
    tick!();
    tick!();
    expect(writes).toBe(3);
    expect(files.get(path)).toBe(first);
    stopRuntimeSessionLease();
    expect(files.size).toBe(0);

    expect(startRuntimeSessionLease(scopedFs, { createHash }, 3000, "/bb-mcp", build)).toBe(true);
    files.set(path, JSON.stringify({ schema: 2, product_id: "lazydesigner-bedrock-entity-mcp", instance_id: "replacement" }));
    tick!();
    stopRuntimeSessionLease();
    expect(JSON.parse(files.get(path)!).instance_id).toBe("replacement");
  } finally {
    stopRuntimeSessionLease();
    globalThis.setInterval = originalInterval;
    (globalThis as any).requireNativeModule = originalRequire;
    (globalThis as any).SystemInfo = originalInfo;
    if (originalLocal === undefined) delete process.env.LOCALAPPDATA;
    else process.env.LOCALAPPDATA = originalLocal;
  }
});

test("navigation heartbeat and change debounce use native timers and clean them up", () => {
  const keys = ["requireNativeModule", "SystemInfo", "Blockbench", "Project", "setInterval", "setTimeout"];
  const original = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const originalLocal = process.env.LOCALAPPDATA;
  const files = new Map<string, string>();
  let writes = 0, deleted = 0;
  const events: Record<string, () => void> = {};
  let heartbeat!: () => void, debounce!: () => void;
  const cleared: number[] = [];
  const nativeTimers = {
    setInterval(callback: () => void) { heartbeat = callback; return 1; },
    setTimeout(callback: () => void) { debounce = callback; return 2; },
    clearInterval(id: number) { cleared.push(id); },
    clearTimeout(id: number) { cleared.push(id); },
  };
  const fs = {
    mkdirSync() {},
    readFileSync(path: string) { if (!files.has(path)) throw Error("ENOENT"); return files.get(path)!; },
    writeFileSync(path: string, bytes: string) { files.set(path, bytes); writes++; },
    renameSync(from: string, to: string) { files.set(to, files.get(from)!); files.delete(from); },
    utimesSync() { throw Error("Scoped FS does not provide utimesSync"); },
  };
  try {
    process.env.LOCALAPPDATA = "C:\\fixture\\Local";
    Object.assign(globalThis, {
      SystemInfo: { user_data_directory: "C:\\fixture\\Blockbench" },
      Project: null,
      Blockbench: { on(event: string, callback: () => void) { events[event] = callback; return { delete() { deleted++; } }; } },
      requireNativeModule(name: string) {
        if (name === "fs") return fs;
        if (name === "crypto") return { createHash };
        if (name === "timers") return nativeTimers;
        throw Error(`Unexpected native module: ${name}`);
      },
      setInterval() { throw Error("Renderer timers are suspended"); },
      setTimeout() { throw Error("Renderer timers are suspended"); },
    });
    setupProjectNavigationSnapshot();
    expect(writes).toBe(1);
    const initialNavigation = JSON.parse([...files.values()][0]!);
    expect(initialNavigation.schema).toBe(4);
    expect(initialNavigation.producer_pid).toBe(process.pid);
    // Desktop may verify the native writer PID only after an explicit model
    // open; no new background requester or asset mutation is involved.
    heartbeat();
    expect(writes).toBe(2);
    events.select_project!();
    debounce();
    expect(writes).toBe(3);
    events.saved_state_changed!();
    teardownProjectNavigationSnapshot();
    expect(cleared).toContain(1);
    expect(cleared).toContain(2);
    expect(deleted).toBe(8);
  } finally {
    teardownProjectNavigationSnapshot();
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    if (originalLocal === undefined) delete process.env.LOCALAPPDATA;
    else process.env.LOCALAPPDATA = originalLocal;
  }
});
