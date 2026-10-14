import { expect, test } from "bun:test";
import { observeStatus } from "../../../apps/desktop/src/statusObservation";

test("a stalled status read times out and a fresh read can recover", async () => {
  let finishOldRead!: (value: string) => void;
  const stalled = new Promise<string>(resolve => { finishOldRead = resolve; });
  await expect(observeStatus(stalled, 10)).rejects.toThrow("Status request timed out");
  expect(await observeStatus(Promise.resolve("current"), 100)).toBe("current");
  finishOldRead("obsolete");
});

test("status reads preserve successful results and native rejection", async () => {
  const value = { running: true };
  expect(await observeStatus(Promise.resolve(value), 100)).toBe(value);
  const failure = new Error("native IPC rejected");
  await expect(observeStatus(Promise.reject(failure), 100)).rejects.toBe(failure);
});

test("only read-only status commands use the observation deadline", async () => {
  const ui = await Bun.file("../apps/desktop/src/App.svelte").text();
  expect(ui).toContain("observeStatus(invoke<SystemStatus>('system_status'), 30_000)");
  expect(ui).toContain("observeStatus(invoke<ConnectionStatus>('connection_status'), 10_000)");
  expect(ui.match(/observeStatus\(invoke</g)).toHaveLength(2);
});
