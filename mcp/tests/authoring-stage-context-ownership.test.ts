import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

async function source(path: string): Promise<string> {
  return readFile(new URL(path, import.meta.url), "utf8");
}

describe("shared authoring stage context ownership", () => {
  test("shared stage policy remains a document contract rather than a new Skill/router", async () => {
    const taxonomy = await source("../../docs/04-system/skill-taxonomy.md");
    const loading = await source("../../docs/04-system/ai-context-loading.md");
    const contract = await source("../../docs/04-system/authoring-stage-context.md");

    expect(taxonomy).toContain("shared semantic contract, not a Skill or router");
    expect(taxonomy).toContain("Do not create a `stage`, `authoring-core`, `manager`, or equivalent Skill");
    expect(loading).toContain("active specialist carries the minimum operational triggers");
    expect(contract).toContain("Domain-specific reasoning remains in the relevant specialist Skill");
  });

  test("context loading keeps one specialist and one modelling profile", async () => {
    const loading = await source("../../docs/04-system/ai-context-loading.md");

    expect(loading).toContain("one primary specialist is active");
    expect(loading).toContain("one primary modelling profile is loaded when Geometry needs one");
    expect(loading).toContain("no task uses `read all docs` as a normal boot step");
  });
});
