import { describe, expect, test } from "bun:test";
import {
  indexMarkdownKnowledge,
  indexExplicitDocumentationEdges,
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

  test("never exceeds the knowledge token budget, including the first ranked section", () => {
    const large = indexMarkdownKnowledge(
      "long.md", "# Geometry UV Rig\n" + "geometry ".repeat(300)
    )[0]!;
    const small = indexMarkdownKnowledge(
      "short.md", "# Geometry\nsmall focused correction"
    )[0]!;
    expect(large.token_proxy).toBeGreaterThan(50);
    const selected = selectKnowledgeSections({
      sections: [large, small],
      query: "geometry uv rig",
      maxTokenProxy: 50,
    });
    expect(selected.map((section) => section.id)).toEqual([small.id]);
    expect(selected.reduce((sum, section) => sum + section.token_proxy, 0))
      .toBeLessThanOrEqual(50);
    expect(selectKnowledgeSections({
      sections: [large],
      query: "geometry uv rig",
      maxTokenProxy: 50,
    })).toEqual([]);
  });

  test("invalid non-finite retrieval limits and corrupt section sizes fail closed", () => {
    const section = indexMarkdownKnowledge("budget.md",
      "# Geometry\nsmall geometry guidance")[0]!;
    for (const requested of [
      { maxTokenProxy: Number.NaN },
      { maxTokenProxy: Number.POSITIVE_INFINITY },
      { limit: Number.NaN },
      { limit: Number.NEGATIVE_INFINITY },
    ]) {
      expect(selectKnowledgeSections({
        sections: [section],
        query: "geometry",
        ...requested,
      })).toEqual([]);
    }
    for (const corruptSize of [Number.NaN, -1]) {
      expect(selectKnowledgeSections({
        sections: [{ ...section, token_proxy: corruptSize }],
        query: "geometry",
        maxTokenProxy: 50,
      })).toEqual([]);
    }
  });

  test("retains duplicate authored role links so the canonical router can reject collisions", () => {
    const links = indexExplicitDocumentationEdges("docs/README.md", [
      "[Implementation Map](04-system/README.md)",
      "[Implementation Map](04-system/README.md)",
    ].join("\n"));
    expect(links).toHaveLength(2);
    expect(links.map((edge) => edge.label)).toEqual([
      "Implementation Map", "Implementation Map",
    ]);
    expect(links[0]?.to).toBe(links[1]?.to);
    expect(links[0]?.line).not.toBe(links[1]?.line);
  });

  test("explicit documentation links form a source-grounded, revision-stable graph", () => {
    const first = indexExplicitDocumentationEdges("docs/README.md", [
      "# Router",
      "Follow [System](04-system/README.md) for source ownership.",
      "[System again](04-system/README.md)",
      "[External](https://example.org/other.md)",
      "[Escape](../secret.md)",
      "```md",
      "[Fake](04-system/phantom.md)",
      "```",
      "![Image](04-system/decor.md)",
    ].join("\n"));
    const second = indexExplicitDocumentationEdges("docs/README.md",
      "# Changed prose\nFollow [System](04-system/README.md) for canonical ownership."
    );
    // Each authored link is evidence; target-level de-duplication would
    // conceal a duplicate canonical role before it reaches routing checks.
    expect(first).toHaveLength(2);
    expect(first[0]).toMatchObject({
      from: "docs/README.md",
      to: "docs/04-system/README.md",
      label: "System",
      from_id: "document:docs/README",
      to_id: "document:docs/04-system/README",
      relation: "EXPLICIT_MARKDOWN_LINK",
    });
    expect(second[0]?.to_id).toBe(first[0]?.to_id);
    const relocated = indexExplicitDocumentationEdges("docs/README.md",
      "Follow [System documentation router](05-operations/README.md) for an explicitly moved route."
    );
    expect(relocated[0]).toMatchObject({
      label: "System documentation router",
      to: "docs/05-operations/README.md",
    });
    expect(() => indexExplicitDocumentationEdges("../README.md", "# Invalid")).toThrow();
  });

  test("duplicate semantic heading paths fail closed", () => {
    expect(() =>
      indexMarkdownKnowledge("doc.md", "# A\none\n# A\ntwo")
    ).toThrow(/Duplicate knowledge section id/);
  });
});
