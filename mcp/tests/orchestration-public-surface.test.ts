import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { tools } from "@/lib/factories";
import "@/server/tools";

async function repoFile(path: string): Promise<string> {
  return readFile(new URL("../../" + path, import.meta.url), "utf8");
}

describe("cross-domain orchestration preserves public surface", () => {
  test("does not register an orchestrator capability", () => {
    expect(tools).not.toHaveProperty("authoring_orchestrator");
    expect(tools).not.toHaveProperty("execute_pipeline");
    expect(tools).toHaveProperty("manage_cubes");
    expect(tools).toHaveProperty("paint_texture_transaction");
    expect(tools).toHaveProperty("create_animation");
  });

  test("correction loop keeps implementation contracts internal", async () => {
    const source = await repoFile("mcp/lib/orchestration/correctionLoop.ts");

    expect(source).toContain("export class CorrectionLoopRegistry");
    expect(source).toContain("export type { CorrectionLoopHandle }");
    expect(source).not.toContain("export type CorrectionLoopRecord");
    expect(source).not.toContain("export type CorrectionLoopDecision");
    expect(source).not.toContain("export type GeometryCorrectionPatch");
    expect(source).not.toContain(
      "export type ExecutableGeometryCorrectionFamily"
    );
    expect(source).not.toContain("export type CorrectionLoopContinuation");
    expect(source).not.toContain("export type CorrectionContinuationDelivery");
    expect(source).not.toContain("  get(handle: CorrectionLoopHandle)");
  });
});
