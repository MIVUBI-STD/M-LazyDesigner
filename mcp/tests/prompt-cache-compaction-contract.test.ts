import { describe, expect, test } from "bun:test";

async function text(path: string) {
  return Bun.file(path).text();
}

describe("prompt cache and compaction ownership", () => {
  test("canonical contract separates stable prefix, dynamic tail, checkpoint, and actual telemetry", async () => {
    const contract = await text("../docs/04-system/prompt-cache-and-compaction.md");
    for (const invariant of [
      "CROSS-STAGE COMMON PREFIX CANDIDATE",
      "STAGE-STABLE EXTENSION",
      "DYNAMIC TAIL",
      "measure:model-context",
      "whole Gateway Control-envelope boundary",
      "reference_image_ids",
      "continuationCheckpoint.ts",
      "measure:continuation",
      "response | compaction",
      "cache_missed_tokens",
      "comparison_reusable_tokens",
      "map:development",
      "benchmark:zero-waste-total",
      "Never sum static-prefix bytes and dynamic bytes",
    ]) {
      expect(contract).toContain(invariant);
    }
    expect(contract).toContain("does not own arbitrary Codex/chat history");
    expect(contract).toContain("Quality PASS");
  });

  test("static-prefix measurement excludes volatile task/history values", async () => {
    const source = await text("scripts/measure/measure-model-context-footprint.ts");
    for (const dynamic of [
      "user/task messages",
      "Control stage_context",
      "current_user_delta",
      "tool results/history",
      "reference images",
    ]) {
      expect(source).toContain(dynamic);
    }
    expect(source).toContain("stable_prefix_candidate_sha256");
    expect(source).toContain("not actual Codex prompt assembly");
  });

  test("Gateway instructions remain a static literal rather than a dynamic template", async () => {
    const gateway = await text("gateway/index.ts");
    const match = gateway.match(/const GATEWAY_INSTRUCTIONS\s*=\s*("(?:[^"\\]|\\.)*");/);
    expect(match).not.toBeNull();
    const block = JSON.parse(match![1]) as string;
    expect(block).toContain("LazyDesigner Gateway.");
    expect(block).not.toContain("\${");
    expect(block).not.toContain("Date.now");
  });
});
