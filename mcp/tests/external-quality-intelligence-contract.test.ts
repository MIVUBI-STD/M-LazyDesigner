import { expect, test } from "bun:test";

async function source(path: string) {
  return Bun.file(path).text();
}

test("external quality intelligence stays advisory and provenance-bound", async () => {
  const doc = await source("../docs/04-system/external-quality-intelligence.md");
  expect(doc).toContain("https://github.com/Mojang/bedrock-samples");
  expect(doc).toContain("https://learn.microsoft.com/en-us/minecraft/creator/reference/content/schemasreference/");
  expect(doc).toContain("https://blockbench.net/wiki/guides/minecraft-style-guide/");
  expect(doc).toContain("https://github.com/JannisX11/blockbench");
  expect(doc).toContain("never an aggregate style score");
  expect(doc).toContain("auto-mutation from external examples");
});

test("quality integrations reuse existing ownership instead of creating a second workflow", async () => {
  const doc = await source("../docs/04-system/external-quality-intelligence.md");
  expect(doc).toContain("mcp/lib/referenceCrossViewEvidence.ts");
  expect(doc).toContain("mcp/lib/minecraftStyleEvidence.ts");
  expect(doc).toContain("mcp/lib/animationContactEvidence.ts");
  expect(doc).toContain("Control → Gateway → Runtime → Plugin");
  expect(doc).toContain("a second Director/workflow engine");
});

test("native quirks remain source contracts until native behavior actually runs", async () => {
  const doc = await source("../docs/04-system/external-quality-intelligence.md");
  expect(doc).toContain("source contract / not live proof");
  expect(doc).toContain("serialize/save/export");
  expect(doc).toContain("parse/reopen");
});
