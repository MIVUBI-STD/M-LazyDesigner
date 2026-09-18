import { describe, expect, test } from "bun:test";
import {
  buildMaterialInstanceMutationSummary,
  isMaterialInstanceNameChange,
  materialInstanceContinuationChanges,
} from "@/server/tools/material-instances";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("material-instance mutation result contract", () => {
  test("mutation summaries keep resolved target identity compact", () => {
    const summary = buildMaterialInstanceMutationSummary(
      "set",
      [
        { uuid: "cube-a", name: "body" },
        { uuid: "cube-b", name: "trim" },
      ],
      4,
      {
        material_name: "metal",
        faces: ["north", "south"],
      }
    );

    expect(JSON.parse(JSON.stringify(summary))).toEqual({
      operation: "set",
      cube_count: 2,
      face_count: 4,
      cubes: [
        { uuid: "cube-a", name: "body" },
        { uuid: "cube-b", name: "trim" },
      ],
      material_name: "metal",
      faces: ["north", "south"],
    });
  });

  test("continuation changes preserve exact final face assignment identity", () => {
    const changes = materialInstanceContinuationChanges([
      {
        cube: {
          uuid: "cube-a",
          name: "body",
        } as Cube,
        face: "north",
        material_name: "metal",
      },
    ]);

    expect(changes).toEqual([
      {
        cube_uuid: "cube-a",
        cube_name: "body",
        face: "north",
        material_name: "metal",
      },
    ]);
  });

  test("material-instance name comparison rejects effective face no-ops", () => {
    expect(isMaterialInstanceNameChange("metal", "metal")).toBe(false);
    expect(isMaterialInstanceNameChange(undefined, "")).toBe(false);
    expect(isMaterialInstanceNameChange("", "")).toBe(false);
    expect(isMaterialInstanceNameChange("metal", "")).toBe(true);
    expect(isMaterialInstanceNameChange("metal", "glass")).toBe(true);
  });

  test("set, bulk-set, and clear mutations return structured continuation receipts", async () => {
    const implementation = await source("server/tools/material-instances.ts");

    expect(
      implementation.match(/buildMaterialInstanceMutationSummary\(/g)?.length ?? 0
    ).toBeGreaterThanOrEqual(4);
    expect(
      implementation.match(/materialInstanceMutationResult\(/g)?.length ?? 0
    ).toBeGreaterThanOrEqual(4);
    expect(implementation).toContain("structuredContent: result");
    expect(implementation).toContain('"set",\n          cubesToEdit,');
    expect(implementation).toContain('"bulk_set",\n          cubesToEdit,');
    expect(implementation).toContain('"clear",\n          cubesToEdit,');
    expect(implementation).toContain("materialInstanceContinuationChanges(plannedChanges)");
    expect(implementation).not.toContain(
      'return `Set material instance "${material_name}"'
    );
    expect(implementation).not.toContain(
      "return `Applied ${assignments.length} material instance assignment(s)"
    );
    expect(implementation).not.toContain(
      "return `Cleared material instances from ${clearedCount}"
    );
  });

  test("destructive material-instance no-ops stop before Undo", async () => {
    const implementation = await source("server/tools/material-instances.ts");
    const branches = [
      {
        start: "materialInstanceToolDocs[1].name",
        end: "materialInstanceToolDocs[2].name",
        guard: "Set material instances would be a no-op",
      },
      {
        start: "materialInstanceToolDocs[3].name",
        end: "materialInstanceToolDocs[4].name",
        guard: "Bulk material-instance update would be a no-op",
      },
      {
        start: "materialInstanceToolDocs[4].name",
        end: "\n}",
        guard: "Clear material instances would be a no-op",
      },
    ];

    for (const branch of branches) {
      const start = implementation.indexOf(branch.start);
      const end = branch.end === "\n}"
        ? implementation.length
        : implementation.indexOf(branch.end, start + branch.start.length);
      const body = implementation.slice(start, end);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(body.indexOf(branch.guard)).toBeGreaterThanOrEqual(0);
      expect(body.indexOf("Undo.initEdit")).toBeGreaterThan(body.indexOf(branch.guard));
    }
  });
});
