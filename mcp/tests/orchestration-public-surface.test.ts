import { describe, expect, test } from "bun:test";
import { tools } from "@/lib/factories";
import "@/server/tools";

describe("cross-domain orchestration preserves public surface",()=>{
  test("does not register an orchestrator capability",()=>{
    expect(tools).not.toHaveProperty("authoring_orchestrator");
    expect(tools).not.toHaveProperty("execute_pipeline");
    expect(tools).toHaveProperty("manage_cubes");
    expect(tools).toHaveProperty("paint_texture_transaction");
    expect(tools).toHaveProperty("create_animation");
    test("correction loop exposes only its intended compatibility surface", async () => {
    const source = await import("@/lib/orchestration/correctionLoop");
    expect(source).toHaveProperty("CorrectionLoopRegistry");
    expect(source).not.toHaveProperty("CorrectionLoopRecord");
    expect(source).not.toHaveProperty("correctionContinuationDelta");
    expect(source).not.toHaveProperty("correctionContinuationId");
  });
});
});
