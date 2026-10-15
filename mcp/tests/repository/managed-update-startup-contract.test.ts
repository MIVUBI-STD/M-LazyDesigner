import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("managed startup update contract", () => {
  test("managed releases publish a lightweight digest-verifiable manifest beside the full package", async () => {
    const [packager, workflow] = await Promise.all([
      source("../distribution/package.ts"),
      source("../.github/workflows/managed-distribution.yml"),
    ]);

    expect(packager).toContain('join(output, "blockit-package.json")');
    expect(workflow).toContain("mcp/dist/managed/blockit-package.json");
    expect(workflow).toContain('gh release create "$TAG" blockit-windows-x64.zip blockit-package.json');
  });

  test("check-update is read-only and separated from full package download", async () => {
    const cli = await source("../distribution/cli.ts");
    const checkStart = cli.indexOf("async function checkUpdate()");
    const fetchStart = cli.indexOf("async function fetchRelease()", checkStart);
    expect(checkStart).toBeGreaterThanOrEqual(0);
    expect(fetchStart).toBeGreaterThan(checkStart);

    const check = cli.slice(checkStart, fetchStart);
    expect(check).toContain("fetchPublishedRelease()");
    expect(check).toContain("fetchUpdateManifest(release)");
    expect(check).toContain('"UP_TO_DATE"');
    expect(check).toContain('"UPDATE_AVAILABLE"');
    expect(check).toContain('"UPDATE_STAGED"');
    expect(check).not.toContain("RELEASE_ASSET");
    expect(check).not.toContain("installPackage(");
    expect(check).not.toContain("atomicWrite(");
    expect(check).not.toContain("activatePending(");
    expect(cli).toContain('if (command === "check-update") { receipt(await checkUpdate()); return; }');
  });

  test("Desktop invokes update discovery once after local status and never from heartbeat/focus handlers", async () => {
    const app = await source("../apps/desktop/src/App.svelte");
    expect(app).toContain("async function checkManagedUpdateOnce()");
    expect(app).toContain("updateCheckStarted");
    expect(app).toContain("await invoke<ManagedUpdateCheck>('check_managed_update')");
    expect(app).toContain("void checkManagedUpdateOnce();");

    const watcherStart = app.indexOf("async function watchSystemStatus()");
    const watcherEnd = app.indexOf("async function connectBlockbench()", watcherStart);
    expect(app.slice(watcherStart, watcherEnd)).not.toContain("checkManagedUpdateOnce");

    const mountStart = app.indexOf("onMount(() =>");
    const destroyStart = app.indexOf("onDestroy(() =>", mountStart);
    const mount = app.slice(mountStart, destroyStart);
    expect(mount.match(/checkManagedUpdateOnce\(\)/g)?.length).toBe(1);
    expect(mount).not.toMatch(/setInterval\([^\n]*checkManagedUpdateOnce/);
  });

  test("a staged update revalidates in place and never offers activation without proof", async () => {
    const app = await source("../apps/desktop/src/App.svelte");
    const action = app.slice(
      app.indexOf("async function runManagedAction("),
      app.indexOf("onMount(() =>")
    );
    expect(action).toContain("if (feedback.status === 'STAGED')");
    expect(action).toContain("updateCheckStarted = false;");
    expect(action).toContain("await checkManagedUpdateOnce()");
    expect(app).toContain("async function verifyPendingUpdate()");
    expect(app).toContain("onclick={verifyPendingUpdate}");
    expect(app).toContain("updateCheck?.status === 'UPDATE_STAGED_UNVERIFIED'");
    expect(app).toContain("updateCheck?.status !== 'UPDATE_STAGED'");
  });

  test("Desktop backend exposes a bounded dedicated read-only check command", async () => {
    const [main, status] = await Promise.all([
      source("../apps/desktop/src-tauri/src/main.rs"),
      source("../apps/desktop/src-tauri/src/system_status.rs"),
    ]);
    expect(main).toContain("fn check_managed_update()");
    expect(main).toContain("check_managed_update,");
    expect(status).toContain('arg("check-update")');
    expect(status).toContain("Duration::from_secs(12)");
    expect(status).toContain('"UPDATE_AVAILABLE"');
    expect(status).toContain('"UPDATE_STAGED"');
  });
});
