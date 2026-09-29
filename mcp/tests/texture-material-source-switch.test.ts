import { describe, expect, test } from "bun:test";
import { requireExplicitUniformMaterialSourceSwitch } from "@/server/tools/texture-material-validation";

describe("uniform material source switching", () => {
  test("requires explicit color texture removal before uniform color", () => {
    expect(() =>
      requireExplicitUniformMaterialSourceSwitch(
        "Material A",
        ["color"],
        { color_value: [255, 255, 255, 255] }
      )
    ).toThrow('Send color_texture="none" with color_value');
  });

  test("requires explicit MER texture removal before uniform MER", () => {
    expect(() =>
      requireExplicitUniformMaterialSourceSwitch(
        "Material A",
        ["mer"],
        { mer_value: [0, 0, 255] }
      )
    ).toThrow('Send mer_texture="none" with mer_value');
  });

  test("allows uniform values when the texture source is explicitly cleared", () => {
    expect(() =>
      requireExplicitUniformMaterialSourceSwitch(
        "Material A",
        ["color", "mer"],
        {
          color_texture: "none",
          mer_texture: "none",
          color_value: [255, 255, 255, 255],
          mer_value: [0, 0, 255],
        }
      )
    ).not.toThrow();
  });
});
