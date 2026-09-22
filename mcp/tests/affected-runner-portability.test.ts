import { describe, expect, test } from "bun:test";

describe("affected verification runner portability", () => {
  test("runner does not depend on bash or platform shell parsing", async () => {
    const source = await Bun.file("scripts/run-affected-execution.ts").text();
    expect(source).not.toContain('"bash"');
    expect(source).not.toContain("-lc");
    expect(source).toContain("process.execPath");
    expect(source).toContain("Bun.spawn");
  });
});
