import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const MIGRATED_TOOL_WRAPPERS: Readonly<Record<string, string>> = {
  "animation-shared.ts": 'export * from "./animation/shared";\n',
  "animation-controller-state.ts":
    'export * from "./animation/controllerState";\n',
  "animation-effect-state.ts":
    'export * from "./animation/effectState";\n',
  "paint-shared.ts": 'export * from "./paint/shared";\n',
  "paint-layer-state.ts": 'export * from "./paint/layerState";\n',
};

const MIGRATED_TOOL_IMPORTS = new Set(
  Object.keys(MIGRATED_TOOL_WRAPPERS).map(
    (name) => `@/server/tools/${name.replace(/\.ts$/, "")}`
  )
);

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(path)));
    } else if (entry.isFile() && path.endsWith(".ts")) {
      files.push(path);
    }
  }
  return files;
}

function importsOf(source: string): string[] {
  return [...source.matchAll(
    /(?:import[\s\S]*?from\s*|export\s+(?:\*|\{[\s\S]*?\})\s+from\s*)["']([^"']+)["']/g
  )].map((match) => match[1]!);
}

describe("server tool domain ownership", () => {
  test("migrated root tool paths remain compatibility-only wrappers", async () => {
    for (const [name, expected] of Object.entries(MIGRATED_TOOL_WRAPPERS)) {
      expect(await Bun.file(`server/tools/${name}`).text()).toBe(expected);
    }
  });

  test("animation production modules do not depend on migrated root wrappers", async () => {
    const files = await sourceFiles("server/tools");
    const violations: string[] = [];

    for (const file of files) {
      if (file.endsWith("animation-shared.ts")) continue;
      const source = await Bun.file(file).text();
      for (const request of importsOf(source)) {
        const relativeLegacy =
          request === "./animation-shared" ||
          request === "./animation-controller-state" ||
          request === "./animation-effect-state" ||
          request === "./paint-shared" ||
          request === "./paint-layer-state";
        if (
          relativeLegacy ||
          MIGRATED_TOOL_IMPORTS.has(request)
        ) {
          violations.push(
            `${relative("server/tools", file).replace(/\\/g, "/")} -> ${request}`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  test("animation controller schema stays separate from executor/runtime wiring", async () => {
    const schema = await Bun.file(
      "server/tools/animation/controllerSchema.ts"
    ).text();
    const executor = await Bun.file("server/tools/animation-controller.ts").text();
    const runtimeExtension = await Bun.file(
      "server/runtime/extensions/animation/controllerNativeIntelligence.ts"
    ).text();

    expect(schema).toContain("manageAnimationControllerParameters");
    expect(schema).toContain("ControllerMutationOperation");
    expect(schema).not.toContain("createTool(");
    expect(schema).not.toContain("Undo.");
    expect(schema).not.toContain("/server/runtime");
    expect(schema).not.toContain("/gateway/");

    expect(executor).toContain(
      'from "@/server/tools/animation/controllerSchema"'
    );
    expect(runtimeExtension).toContain(
      'from "../../../tools/animation/controllerSchema"'
    );
    expect(runtimeExtension).not.toContain(
      'from "../../../tools/animation-controller"'
    );
  });

  test("animation controller planner stays runtime-independent", async () => {
    const planner = await Bun.file(
      "server/tools/animation/controllerPlanner.ts"
    ).text();
    const executor = await Bun.file(
      "server/tools/animation-controller.ts"
    ).text();

    expect(planner).toContain("ControllerPlanningEnvironment");
    expect(planner).toContain("applyOperationToPlan");
    expect(planner).not.toContain("AnimationItem");
    expect(planner).not.toContain("Undo.");
    expect(planner).not.toContain("createTool(");
    expect(planner).not.toContain("guid()");
    expect(planner).not.toContain("/server/runtime");
    expect(planner).not.toContain("/gateway/");

    expect(executor).toContain(
      'from "@/server/tools/animation/controllerPlanner"'
    );
    expect(executor).toContain("resolveAnimation: resolveAuthoredAnimation");
    expect(executor).toContain("createId: () => guid()");
    expect(executor.length).toBeLessThan(12000);
  });

  test("animation inspection schema stays separate from executor/runtime wiring", async () => {
    const schema = await Bun.file(
      "server/tools/animation/inspectionSchema.ts"
    ).text();
    const executor = await Bun.file("server/tools/animation-inspection.ts").text();
    const runtimeContract = await Bun.file(
      "server/runtime/animationRuntimeContracts.ts"
    ).text();

    expect(schema).toContain("inspectAnimationParameters");
    expect(schema).not.toContain("createTool(");
    expect(schema).not.toContain("Undo.");
    expect(schema).not.toContain("/server/runtime");
    expect(schema).not.toContain("/gateway/");

    expect(executor).toContain(
      'from "@/server/tools/animation/inspectionSchema"'
    );
    expect(runtimeContract).toContain(
      'from "../tools/animation/inspectionSchema"'
    );
    expect(runtimeContract).not.toContain(
      'from "../tools/animation-inspection"'
    );
  });

  test("paint selection/layer schema stays separate from executor", async () => {
    const schema = await Bun.file(
      "server/tools/paint/selectionLayerSchema.ts"
    ).text();
    const executor = await Bun.file(
      "server/tools/paint-selection-layers.ts"
    ).text();

    expect(schema).toContain("textureSelectionParameters");
    expect(schema).toContain("textureLayerManagementParameters");
    expect(schema).not.toContain("createTool(");
    expect(schema).not.toContain("Undo.");
    expect(schema).not.toContain("/server/runtime");
    expect(schema).not.toContain("/gateway/");

    expect(executor).toContain(
      'from "@/server/tools/paint/selectionLayerSchema"'
    );
    expect(executor.length).toBeLessThan(28000);
  });

  test("create texture schema stays separate from executor/runtime wiring", async () => {
    const schema = await Bun.file(
      "server/tools/texture/createSchema.ts"
    ).text();
    const executor = await Bun.file("server/tools/texture-create.ts").text();
    const runtimeContract = await Bun.file(
      "server/runtime/textureRuntimeContracts.ts"
    ).text();

    expect(schema).toContain("createTextureParameters");
    expect(schema).toContain("isDeterministicTextureSource");
    expect(schema).not.toContain("createTool(");
    expect(schema).not.toContain("Undo.");
    expect(schema).not.toContain("/server/runtime");
    expect(schema).not.toContain("/gateway/");

    expect(executor).toContain(
      'from "@/server/tools/texture/createSchema"'
    );
    expect(runtimeContract).toContain(
      'from "../tools/texture/createSchema"'
    );
    expect(runtimeContract).not.toContain(
      'from "../tools/texture"'
    );
  });

  test("tool domain owners do not depend on higher Runtime composition", async () => {
    for (const domain of ["animation", "paint", "texture"] as const) {
      for (const file of await sourceFiles(`server/tools/${domain}`)) {
        const source = await Bun.file(file).text();
        for (const request of importsOf(source)) {
          expect(request).not.toContain("/server/runtime");
          expect(request).not.toContain("/gateway/");
        }
      }
    }
  });
});
