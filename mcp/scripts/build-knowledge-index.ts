import { readFile } from "node:fs/promises";
import {
  indexMarkdownKnowledge,
  knowledgeIndexFingerprint,
} from "../lib/semantic/knowledge";

const DEFAULT_SOURCES = [
  "prompts/bedrock_entity_workflow.md",
  "../.agents/skills/lazydesigner-modelling/SKILL.md",
  "../.agents/skills/lazydesigner-texturing/SKILL.md",
  "../.agents/skills/lazydesigner-animation/SKILL.md",
] as const;

async function main() {
  const requested = process.argv.slice(2).filter(Boolean);
  const sources = requested.length > 0 ? requested : [...DEFAULT_SOURCES];
  const sections = (
    await Promise.all(
      sources.map(async (source) =>
        indexMarkdownKnowledge(source, await readFile(source, "utf8"))
      )
    )
  ).flat();

  console.log(
    JSON.stringify(
      {
        schema: 1,
        proof_scope: "REPO_OWNED_KNOWLEDGE_INDEX",
        fingerprint: knowledgeIndexFingerprint(sections),
        section_count: sections.length,
        total_bytes: sections.reduce((sum, section) => sum + section.bytes, 0),
        total_token_proxy: sections.reduce(
          (sum, section) => sum + section.token_proxy,
          0
        ),
        sections,
      },
      null,
      2
    )
  );
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
