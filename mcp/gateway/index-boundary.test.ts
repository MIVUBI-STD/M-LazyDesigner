import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./index.ts", import.meta.url), "utf8");
const sessionSource = await readFile(
  new URL("./session/state.ts", import.meta.url),
  "utf8"
);
const coreToolsSource = await readFile(
  new URL("./handlers/registerCoreTools.ts", import.meta.url),
  "utf8"
);
const executorSource = await readFile(
  new URL("./runtime/capabilityExecutor.ts", import.meta.url),
  "utf8"
);

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
    expect(coreToolsSource).toContain('.max(8)');
    expect(coreToolsSource).toContain('z.enum(["input", "full"]).default("input")');
    expect(coreToolsSource).toContain('detail === "full"');
    expect(coreToolsSource).toContain('inputSchema: projection.inputSchema');
  });

  test("projects status instead of spreading raw backend status", () => {
    expect(coreToolsSource).toContain("projectGatewayStatus(status, known_semantic_revisions)");
    expect(coreToolsSource).not.toContain("...status,\n          control");
  });

  test("wires runtime generation changes through the session owner", () => {
    expect(source).toContain("onRuntimeGenerationChange: () => session.onRuntimeGenerationChange()");
    expect(sessionSource).toContain("gatewayOrchestrationRecoveryState.invalidateRuntimeGeneration()");
    expect(sessionSource).toContain("this.executionState = null");
    expect(sessionSource).toContain("this.capabilityFacts = seedCapabilityFacts({");
    expect(source).not.toContain("new VerificationEvidenceRegistry()");
    expect(source).not.toContain("new CorrectionLoopRegistry()");
    expect(sessionSource).not.toContain("new VerificationEvidenceRegistry()");
    expect(sessionSource).not.toContain("new CorrectionLoopRegistry()");
  });

  test("project affinity changes hard-reset orchestration state through the session boundary", () => {
    expect(sessionSource).toContain(
      "gatewayOrchestrationRecoveryState.synchronizeProjectAffinity(projectUuid)"
    );
    expect(sessionSource).toContain("this.executionState = null");
    expect(coreToolsSource).toContain("session.synchronizeProject(status.affinity.project_uuid)");
    expect(executorSource).toContain(
      "this.session.synchronizeProject(receipt.projectUuid)"
    );
    expect(source).toContain(
      "executor.invoke(capability, args, context)"
    );
  });
});
