import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

async function repoFile(path: string): Promise<string> {
  return readFile(new URL("../../" + path, import.meta.url), "utf8");
}

function occurrences(source: string, needle: string): number {
  return source.split(needle).length - 1;
}

describe("zero-waste consolidation contract", () => {
  test("correction lifecycle has one continuation transport owner", async () => {
    const loop = await repoFile("mcp/lib/orchestration/correctionLoop.ts");
    const transport = await repoFile(
      "mcp/lib/orchestration/correctionContinuation.ts"
    );

    expect(loop).toContain(
      'from "@/lib/orchestration/correctionContinuation"'
    );
    expect(loop).not.toContain("function correctionContinuationDelta");
    expect(loop).not.toContain("function correctionContinuationId");
    expect(loop).not.toContain("canonicalJson(");

    expect(transport).toContain("function canonicalEqual");
    expect(transport).toContain("export function correctionContinuationDelta");
    expect(transport).toContain("export function correctionContinuationId");
  });

  test("continuation delivery and solver result each have one authority", async () => {
    const loop = await repoFile("mcp/lib/orchestration/correctionLoop.ts");
    const transport = await repoFile(
      "mcp/lib/orchestration/correctionContinuation.ts"
    );

    expect(loop).not.toContain("cached:");
    expect(transport).not.toContain("cached:");
    expect(loop).not.toMatch(/\n\s*selected_candidate_id\?:/);
    expect(loop).toContain("decision_summary?:");
    expect(loop).toContain("selected_candidate_id: string;");
  });

  test("continuation benchmark keeps one transport workflow plus grouping", async () => {
    const benchmark = await repoFile(
      "mcp/scripts/benchmark-zero-waste-workflow.ts"
    );

    expect(benchmark).toContain('"correction_continuation_transport"');
    expect(benchmark).toContain('"correction_semantic_delta_grouping"');
    for (const retired of [
      "correction_continuation_pruning",
      "correction_continuation_mode_selection",
      "correction_continuation_identity_dedup",
      "correction_continuation_delta_delivery",
    ]) {
      expect(benchmark).not.toContain(retired);
    }
  });

  test("hot-path continuation instructions are consolidated once per owner", async () => {
    const prompt = await repoFile("mcp/prompts/bedrock_entity_workflow.md");
    const skill = await repoFile(
      ".agents/skills/lazydesigner-modelling/SKILL.md"
    );
    const heading = "Correction continuation is runtime-owned and incremental";

    expect(occurrences(prompt, heading)).toBe(1);
    expect(occurrences(skill, heading)).toBe(1);
  });
});
