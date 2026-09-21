import { describe, expect, test } from "bun:test";
import {
  indexMarkdownKnowledge,
  knowledgeIndexFingerprint,
  selectKnowledgeSections,
} from "../lib/semantic/knowledge";

describe("knowledge section compiler", () => {
  test("creates stable hierarchical ids and ignores fenced headings", () => {
    const text = [
      "# Workflow",
      "intro",
      "## UV Layout",
      "packing guidance",
      "```text",
      "## not a heading",
      "```",
      "### Stable Packing",
      "keep islands stable",
      "## Texture",
      "paint guidance",
    ].join("\n");

    const sections = indexMarkdownKnowledge(
      "prompts/bedrock_entity_workflow.md",
      text
    );

    expect(sections.map((section) => section.id)).toEqual([
      "knowledge:prompts/bedrock-entity-workflow#workflow",
      "knowledge:prompts/bedrock-entity-workflow#workflow/uv-layout",
      "knowledge:prompts/bedrock-entity-workflow#workflow/uv-layout/stable-packing",
      "knowledge:prompts/bedrock-entity-workflow#workflow/texture",
    ]);
    expect(sections.some((section) => section.heading === "not a heading")).toBe(
      false
    );
  });

  test("content changes alter only the affected section hash", () => {
    const before = indexMarkdownKnowledge(
      "doc.md",
      "# A\none\n# B\ntwo"
    );
    const after = indexMarkdownKnowledge(
      "doc.md",
      "# A\nONE\n# B\ntwo"
    );

    expect(before[0]?.sha256).not.toBe(after[0]?.sha256);
    expect(before[1]?.sha256).toBe(after[1]?.sha256);
    expect(knowledgeIndexFingerprint(before)).not.toBe(
      knowledgeIndexFingerprint(after)
    );
  });

  test("selects relevant sections under a token budget", () => {
    const sections = indexMarkdownKnowledge(
      "workflow.md",
      [
        "# Workflow",
        "general orientation",
        "## UV Layout",
        "stable packing texel density island padding",
        "## Texture Styling",
        "palette shading material paint pixels",
      ].join("\n")
    );

    const selected = selectKnowledgeSections({
      sections,
      query: "fix uv stable packing islands",
      maxTokenProxy: 200,
    });

    expect(selected[0]?.heading).toBe("UV Layout");
    expect(selected.some((section) => section.heading === "Texture Styling")).toBe(
      false
    );
  });

  test("duplicate semantic heading paths fail closed", () => {
    expect(() =>
      indexMarkdownKnowledge("doc.md", "# A\none\n# A\ntwo")
    ).toThrow(/Duplicate knowledge section id/);
  });
});
