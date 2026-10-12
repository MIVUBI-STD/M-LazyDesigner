import { describe, expect, test } from "bun:test";

describe("Desktop managed-progress listener lifecycle contract", () => {
  test("unmount releases registered and late-arriving Tauri listeners", async () => {
    // This guard protects the Svelte event boundary, whose Tauri IPC cannot be
    // simulated as live Windows/Blockbench evidence in source-only tests.
    const source = await Bun.file("../apps/desktop/src/App.svelte").text();
    expect(source).toContain("let progressListenerDisposed = false");
    expect(source).toContain("if (!progressListenerDisposed && busyAction");
    expect(source).toContain("if (progressListenerDisposed) unlisten()");
    expect(source).toContain("progressListenerDisposed = true;");
    expect(source).toContain("stopProgressListener?.();");
    expect(source).toContain("stopProgressListener = null;");
  });
});
