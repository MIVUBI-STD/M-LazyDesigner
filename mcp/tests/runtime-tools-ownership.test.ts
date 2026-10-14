import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("Runtime tool ownership boundaries", () => {
  test("server/tools.ts remains a thin compatibility facade", async () => {
    const text = await source("server/tools.ts");

    expect(text).toContain('from "./runtime/registration"');
    expect(text).toContain('from "./runtime/consolidatedTools"');
    expect(text).toContain('from "./runtime/phaseControl"');
    expect(text).not.toContain("function registerConsolidatedInspectionTool");
    expect(text).not.toContain("const registrationFunctions");
    expect(text).not.toContain("const stageSurfaceCache");
    expect(text).not.toContain("z.object(");
  });

  test("registration state has one runtime owner", async () => {
    const text = await source("server/runtime/registration.ts");

    expect(text).toContain("const registeredFamilies");
    expect(text).toContain("const toolRegistrationFamily");
    expect(text).toContain("const catalogToolEnabled");
    expect(text).toContain("const stageSurfaceCache");
    expect(text).toContain("registerConsolidatedTools(updateCatalogTool)");
  });

  test("phase control owns its handler and tool contract", async () => {
    const text = await source("server/runtime/phaseControl.ts");

    expect(text).toContain("let stageSwitchHandler");
    expect(text).toContain("export const phaseControlToolDocs");
    expect(text).toContain("export function registerPhaseControlTool");
  });
});
