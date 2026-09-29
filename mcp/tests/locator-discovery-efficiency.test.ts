import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("Locator discovery efficiency", () => {
  test("list_locator_elements stays identity-first while inspect_element owns detail", async () => {
    const locators = await source("server/tools/locators.ts");
    expect(locators).toContain("const locators = Locator.all.map(locatorSummary)");
    expect(locators).toContain("const nullObjects = NullObject.all.map(nullObjectSummary)");
    expect(locators).not.toContain("const locators = Locator.all.map(locatorState)");
    expect(locators).not.toContain("const nullObjects = NullObject.all.map(nullObjectState)");

    const listStart = locators.indexOf("createTool(\n    locatorToolDocs[0].name");
    const listEnd = locators.indexOf("createTool(\n    locatorToolDocs[1].name", listStart);
    const listBlock = locators.slice(listStart, listEnd);
    for (const detailedField of ["position:", "rotation:", "ignore_inherited_scale:", "ik_target:", "ik_source:", "visibility:"]) {
      expect(listBlock).not.toContain(detailedField);
    }

    const modelling = await source("../.agents/skills/lazydesigner-modelling/SKILL.md");
    expect(modelling).toContain("## Minimum Necessary Evidence");
    expect(modelling).toContain(
      "inspect once only when current exact authored state is stale/unknown"
    );
    expect(modelling).toContain("Do not inspect each newly created Cube after a successful deterministic batch.");
  });
});
