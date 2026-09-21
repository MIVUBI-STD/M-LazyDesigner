import { describe, expect, test } from "bun:test";

const source = await Bun.file(
  new URL("../server/tools/cubes.ts", import.meta.url)
).text();

describe("manage_cubes branch schema registry", () => {
  test("branch schemas are addressable and build the public union", () => {
    expect(source).toContain("export const cubeToolBranches");
    for (const branch of ["create", "update", "batch_update", "simplify"]) {
      expect(source).toContain(`cubeToolBranches.${branch}`);
    }
    expect(source).toContain('discriminator: "operation"');
    expect(source).toContain("schemas: cubeToolBranches");
  });
});
