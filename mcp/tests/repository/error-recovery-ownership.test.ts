import { describe, expect, test } from "bun:test";
import { GatewayBackendError } from "../../gateway/runtime/backendContract";
import { gatewayErrorResult } from "../../gateway/execution/gatewayErrors";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("Gateway and Control recovery ownership", () => {
  test("Gateway backend owns Runtime, catalog, project-affinity and interrupted-call recovery", async () => {
    const [backend, contract, queue] = await Promise.all([
      source("gateway/runtime/backend.ts"),
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

    expect(backend).toContain('from "./interruptionPolicy"');
  });

  test("Gateway error envelope preserves uncertain mutations and retryable reads", () => {
    const uncertain = gatewayErrorResult(
      new GatewayBackendError("OUTCOME_UNKNOWN", "Runtime interrupted", false, {
        operation: "manage_cubes",
      })
    );
    expect(uncertain).toMatchObject({
      isError: true,
      structuredContent: {
        code: "OUTCOME_UNKNOWN",
        operation: "manage_cubes",
        recovery: {
          category: "TRANSPORT",
          safe_to_retry: false,
          state_uncertain: true,
          requires_status_refresh: true,
        },
      },
    });

    const readOnly = gatewayErrorResult(
      new GatewayBackendError("BACKEND_CALL_INTERRUPTED", "Read interrupted", true)
    );
    expect(readOnly).toMatchObject({
      isError: true,
      structuredContent: {
        code: "BACKEND_CALL_INTERRUPTED",
        recovery: {
          category: "TRANSPORT",
          safe_to_retry: true,
          state_uncertain: false,
        },
      },
    });
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
