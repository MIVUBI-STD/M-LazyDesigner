import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("Gateway and Control recovery ownership", () => {
  test("Gateway backend owns Runtime, catalog, project-affinity and interrupted-call recovery", async () => {
    const [backend, contract, queue] = await Promise.all([
      source("gateway/backend.ts"),
      source("gateway/runtime/backendContract.ts"),
      source("gateway/runtime/operationQueue.ts"),
    ]);

    for (const marker of [
      "BACKEND_UNAVAILABLE",
      "CAPABILITY_NOT_FOUND",
      "PROJECT_CONTEXT_LOST",
      "OUTCOME_UNKNOWN",
      "classifyInterruptedCall",
    ]) expect(backend).toContain(marker);
    expect(contract).toContain('"GATEWAY_BUSY"');
    expect(queue).toContain('"GATEWAY_BUSY"');

    expect(backend).toContain("inspect current model state before retrying");
    expect(backend).not.toMatch(/invokeCapability\([\s\S]*?retry\s*\(/i);
  });

  test("Gateway presentation delegates explicit retry safety to canonical recovery projection", async () => {
    const gateway = await source("gateway/index.ts");

    expect(gateway).toContain("safeToRetry: error.safeToRetry");
    expect(gateway).toContain("recoveryForGatewayError(");
    expect(gateway).toContain("known.safeToRetry");
    expect(gateway).toMatch(/never auto-retry an interrupted mutation/i);
    expect(gateway).not.toContain("autoRetry");
    expect(gateway).not.toContain("automaticRetry");
  });

  test("Control owns workspace/reference orientation without becoming a second Runtime recovery engine", async () => {
    const [packet, readiness, workspace, reference] = await Promise.all([
      source("gateway/control/packet.ts"),
      source("gateway/control/readiness.ts"),
      source("gateway/control/workspace.ts"),
      source("gateway/control/referencePackage.ts"),
    ]);

    expect(readiness).toContain("WORKSPACE_LIFECYCLE_UNAVAILABLE");
    expect(readiness).toContain("REFERENCE_PACKAGE_UNAVAILABLE");
    expect(readiness).toContain("REFERENCE_STAGE_BLOCKED");
    expect(workspace).toContain("unavailable_reason");
    expect(reference).toContain("REFERENCE_PATH_UNAVAILABLE");
    expect(reference).toContain("REFERENCE_NOT_FOUND");
    expect(reference).toContain("REFERENCE_UNREADABLE");
    expect(reference).toContain("REFERENCE_INVALID");

    for (const controlSource of [packet, readiness, workspace, reference]) {
      expect(controlSource).not.toContain("callTool(");
      expect(controlSource).not.toContain("StreamableHTTPClientTransport");
    }
  });
});
