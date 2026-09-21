import { describe, expect, test } from "bun:test";
import { GATEWAY_TOOL_NAMES } from "@/gateway/contract";
import { tools } from "@/lib/factories";
import "@/server/tools";

describe("Parametric automation preserves MCP capability power", () => {
  test("Gateway remains exactly the four stable meta-tools", () => {
    expect(GATEWAY_TOOL_NAMES).toEqual([
      "status",
      "search_capabilities",
      "describe_capability",
      "invoke_capability",
    ]);
  });

  test("existing geometry primitives remain available", () => {
    expect(tools).toHaveProperty("manage_cubes");
    expect(tools.manage_cubes.enabled).toBe(true);
    expect(tools).toHaveProperty("add_group");
    expect(tools).toHaveProperty("modify_group");
    expect(tools).toHaveProperty("reparent_element");
    expect(tools).toHaveProperty("remove_element");
  });

  test("parametric source foundation does not silently add another public tool before generator-backed registration", () => {
    expect(tools).not.toHaveProperty("manage_parametric_authoring");
    expect(tools).not.toHaveProperty("manage_authoring_recipe");
    expect(tools).not.toHaveProperty("authoring_recipe");
  });

  test("parametric implementation stays below the public primitive layer", async () => {
    const [runtime, service, compiler] = await Promise.all([
      Bun.file("server/runtime/authoringRecipeRuntime.ts").text(),
      Bun.file("lib/authoringRecipe/service.ts").text(),
      Bun.file("lib/authoringRecipe/compiler.ts").text(),
    ]);
    for (const source of [runtime, service, compiler]) {
      expect(source).not.toContain("createTool(");
    }
    expect(runtime).not.toContain("search_capabilities");
    expect(runtime).not.toContain("describe_capability");
    expect(runtime).not.toContain("invoke_capability");
  });
});
