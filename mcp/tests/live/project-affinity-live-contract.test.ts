import { describe, expect, test } from "bun:test";

const scriptUrl = new URL("../scripts/verify/verify-project-affinity-live.ts", import.meta.url);

describe("project-affinity live acceptance contract", () => {
  test("live verifier exercises two Gateway instances without inventing a new Runtime surface", async () => {
    const [script, packageJson] = await Promise.all([
      Bun.file(scriptUrl).text(),
      Bun.file("package.json").json(),
    ]);

    expect(script).toContain("requireDisposableConsent()");
    expect(script.match(/new BlockitRuntimeBackend\(\)/g)?.length).toBe(2);
    expect(script).toContain('"create_project"');
    expect(script).toContain('"manage_cubes"');
    expect(script).toContain('"get_project_info"');
    expect(script).toContain("Promise.all([");
    expect(script).toContain("active_after_cross_gateway_calls");
    expect(packageJson.scripts["verify:project-affinity-live"]).toBe(
      "bun run ./scripts/verify/verify-project-affinity-live.ts"
    );
  });
});