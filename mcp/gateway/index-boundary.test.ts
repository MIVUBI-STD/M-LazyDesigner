import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./index.ts", import.meta.url), "utf8");

describe("Gateway index boundary", () => {
  test("does not hardcode transition capability names", () => {
    expect(source).not.toContain('capability === "create_project"');
    expect(source).not.toContain('capability === "switch_authoring_phase"');
  });

  test("does not route vanilla support by capability name", () => {
    expect(source).not.toContain("VANILLA_ENTITY_REFERENCE_CAPABILITY");
    expect(source).not.toContain("VanillaEntityReferenceProvider");
    expect(source).toContain("LocalCapabilityRegistry");
  });

  test("keeps capability discovery progressive and bounded", () => {
    expect(source).toContain('.max(8)');
    expect(source).toContain('z.enum(["input", "full"]).default("input")');
    expect(source).toContain('detail === "full"');
    expect(source).toContain('inputSchema: projection.inputSchema');
  });

  test("projects status instead of spreading raw backend status", () => {
    expect(source).toContain("projectGatewayStatus(status)");
    expect(source).not.toContain("...status,\n          control");
  });

  test("wires runtime generation changes into the shared orchestration recovery owner", () => {
    expect(source).toContain("gatewayOrchestrationRecoveryState");
    expect(source).toContain("onRuntimeGenerationChange");
    expect(source).toContain(
      "gatewayOrchestrationRecoveryState.invalidateRuntimeGeneration()"
    );
    expect(source).toContain("executionState = null");
    expect(source).toContain("capabilityFacts = seedCapabilityFacts({");
    expect(source).not.toContain("new VerificationEvidenceRegistry()");
    expect(source).not.toContain("new CorrectionLoopRegistry()");
  });

  test("project affinity changes hard-reset orchestration state through the same synchronization boundary", () => {
    const syncStart = source.indexOf("function synchronizeCapabilityFacts");
    const syncEnd = source.indexOf(
      "// Runtime resources and prompts are not proxied.",
      syncStart
    );
    const syncSource = source.slice(syncStart, syncEnd);

    expect(syncSource).toContain(
      "gatewayOrchestrationRecoveryState.synchronizeProjectAffinity(projectUuid)"
    );
    expect(syncSource).toContain("executionState = null");
    expect(syncSource).toContain(
      "gatewayOrchestrationRecoveryState.synchronizeProjectAffinity(projectUuid)"
    );
    expect(source).toContain(
      "synchronizeCapabilityFacts(status.affinity.project_uuid)"
    );
    expect(source).toContain("synchronizeCapabilityFacts(receipt.projectUuid)");
  });
});
