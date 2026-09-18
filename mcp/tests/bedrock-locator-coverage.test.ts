import { describe, expect, test } from "bun:test";
import { manageLocatorParameters, manageNullObjectParameters } from "@/server/tools/locators";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("Bedrock Locator / Null Object direct coverage", () => {
  test("Locator create defaults only native authored fields", () => {
    expect(manageLocatorParameters.parse({ action: "create", name: "muzzle", parent: "bone-uuid" })).toEqual({
      action: "create", name: "muzzle", parent: "bone-uuid", position: [0, 0, 0], rotation: [0, 0, 0], ignore_inherited_scale: false,
    });
    expect(manageLocatorParameters.safeParse({ action: "update", id: "locator-uuid" }).success).toBe(false);
  });

  test("Locator and Null Object transforms reject non-finite authored coordinates", async () => {
    expect(manageLocatorParameters.safeParse({ action: "create", name: "muzzle", parent: "bone", position: [Infinity, 0, 0] }).success).toBe(false);
    expect(manageLocatorParameters.safeParse({ action: "update", id: "loc", rotation: [0, -Infinity, 0] }).success).toBe(false);
    expect(manageNullObjectParameters.safeParse({ action: "update", id: "null", position: [0, 0, Infinity] }).success).toBe(false);
    const locatorSource = await source("server/tools/locators.ts");
    expect(locatorSource).toContain("finiteAuthoredVector3(");
    expect(locatorSource).toContain("locator.position,");
    expect(locatorSource).toContain("locator.rotation,");
    expect(locatorSource).toContain("element.position,");
    expect(locatorSource).not.toContain("vector3Schema");
  });

  test("Null Object base mutation does not invent rotation or IK mutation", () => {
    expect(manageNullObjectParameters.parse({ action: "create", name: "ik_helper", parent: "bone-uuid" })).toEqual({
      action: "create", name: "ik_helper", parent: "bone-uuid", position: [0, 0, 0],
    });
    expect(manageNullObjectParameters.safeParse({ action: "update", id: "null-uuid", rotation: [0, 45, 0] }).success).toBe(false);
    expect(manageNullObjectParameters.safeParse({ action: "update", id: "null-uuid", ik_target: "locator-uuid" }).success).toBe(false);
  });


  test("Locator motion stays parent-driven rather than a second animation target system", async () => {
    const [locatorSource, animationSource] = await Promise.all([
      source("server/tools/locators.ts"),
      source("server/tools/animation-keyframes.ts"),
    ]);

    expect(locatorSource).toContain("parent the Locator to the animated Group/Bone");
    expect(locatorSource).toContain("not Locator elements directly");
    expect(animationSource).toContain("Bone keyframes keyed by Group UUID");
    expect(animationSource).toContain("Group.all.find");
    expect(animationSource).toContain("createdAnimation.animators[group.uuid]");
  });
  test("Locator tools stay inside the existing elements family", async () => {
    const registration = await source("server/runtime/registration.ts");
    expect(registration).toContain('import { registerLocatorTools } from "../tools/locators"');
    expect(registration).toContain("registerElementTools();\n  registerLocatorTools();");
    expect(registration).toContain("elements: registerElementFamilyTools");
  });

  test("explicit parent targets are resolved before Undo and failures can roll back", async () => {
    const locatorSource = await source("server/tools/locators.ts");
    const parent = locatorSource.indexOf("const parent = resolveParent(args.parent);");
    const undo = locatorSource.indexOf("Undo.initEdit({ elements: edited, outliner: true });");
    expect(parent).toBeGreaterThan(-1);
    expect(undo).toBeGreaterThan(parent);
    expect(locatorSource).toContain("Undo.cancelEdit(true)");
    expect(locatorSource).toContain('formatId !== "bedrock"');
  });

  test("generic remove_element snapshots recursive deletion state and returns a compact receipt", async () => {
    const elementSource = await source("server/tools/element-mutation.ts");
    const start = elementSource.indexOf("createTool(elementMutationToolDocs[0].name");
    const end = elementSource.indexOf("createTool(elementMutationToolDocs[1].name", start);
    const block = elementSource.slice(start, end);
    for (const marker of [
      "const removedRoot = elementContinuationState(element);",
      "const deleteElements: OutlinerElement[] = [];",
      "const deleteGroups: Group[] = [];",
      "element.forEachChild",
      "animations: deleteAnimations",
      "removed_root: removedRoot",
      "removed_counts: deletionCounts",
      "affected_animations: affectedAnimationCount",
      "structuredContent: result",
    ]) expect(block).toContain(marker);
  });

  test("inspect_element exposes authored Locator and Null Object state", async () => {
    const inspection = await source("server/tools/element-inspection.ts");
    expect(inspection).toContain("...Locator.all");
    expect(inspection).toContain("...NullObject.all");
    expect(inspection).toContain('type: "locator" as const');
    expect(inspection).toContain('type: "null_object" as const');
    expect(inspection).toContain("ik_source: element.ik_source || null");
  });

  test("Null Object creation rejects duplicate exported keys before Undo", async () => {
    const locatorSource = await source("server/tools/locators.ts");
    expect(locatorSource).toContain(
      'assertLocatorExportKeyAvailable(parent, "null_object", args.name)'
    );
    expect(locatorSource).toContain(
      "Locator keys must be unique within each parent bone."
    );
  });

  test("Null Object geometry round-trip distinction is documented", async () => {
    const locatorSource = await source("server/tools/locators.ts");
    expect(locatorSource).toContain("`_null_` locator entry");
    expect(locatorSource).toContain("IK fields remain Blockbench editor/animation state");
  });

  test("current owners keep Locator coverage mapped without inventing another system", async () => {
    const [registration, implementation] = await Promise.all([
      source("server/runtime/registration.ts"),
      source("../docs/04-system/implementation-map.md"),
    ]);
    expect(registration).toContain("registerLocatorTools();");
    expect(registration).toContain("elements: registerElementFamilyTools");
    expect(implementation).toContain("There is one authoring system.");
    expect(implementation).toContain("mcp/server/tools/**");
    expect(implementation).toContain("authored Geometry / Texture / Animation / Particle / inspection / export implementations");
    expect(implementation).toContain("manage_animation_controller");
    expect(implementation).toContain("These extensions do not create additional controller tools/profiles.");
  });
});
