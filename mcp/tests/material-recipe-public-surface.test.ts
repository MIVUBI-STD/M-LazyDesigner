import { describe, expect, test } from "bun:test";
import { tools } from "@/lib/factories";
import "@/server/tools";

describe("material recipe preserves texture public surface",()=>{
  test("does not register a second procedural material tool family",()=>{
    expect(tools).not.toHaveProperty("material_recipe");
    expect(tools).not.toHaveProperty("generate_texture");
    expect(tools).toHaveProperty("create_pbr_material");
    expect(tools).toHaveProperty("configure_material");
  });
});
