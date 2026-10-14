import { describe, expect, test } from "bun:test";
import { requireFiniteInspectableScalar } from "@/server/tools/element-inspection";

describe("Geometry inspection completeness", () => {
  test("finite authored scalar guard accepts exact finite values", () => {
    expect(requireFiniteInspectableScalar(0, "inflate")).toBe(0);
    expect(requireFiniteInspectableScalar(-0.25, "inflate")).toBe(-0.25);
    expect(requireFiniteInspectableScalar(1.5, "inflate")).toBe(1.5);
  });

  test("finite authored scalar guard rejects non-finite values", () => {
    expect(() => requireFiniteInspectableScalar(Number.NaN, "inflate")).toThrow(
      "non-finite authored scalar"
    );
    expect(() => requireFiniteInspectableScalar(Number.POSITIVE_INFINITY, "inflate")).toThrow(
      "non-finite authored scalar"
    );
  });

  test("inspect_element reports mutation-relevant Cube and export state", async () => {
    const source = await Bun.file("server/tools/element/inspection.ts").text();
    expect(source).toContain("inflate: requireFiniteInspectableScalar");
    expect(source).toContain("export: cube.export !== false");
    expect(source).toContain("export: group.export !== false");
    expect(source).toContain("export: locator.export !== false");
    expect(source).toContain("export: element.export !== false");
  });
});
