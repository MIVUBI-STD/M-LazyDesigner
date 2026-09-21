import { describe, expect, test } from "bun:test";
import { tools } from "@/lib/factories";
import "@/server/tools";

describe("motion recipe preserves public animation surface",()=>{
  test("does not register a second animation generation family",()=>{
    expect(tools).not.toHaveProperty("generate_animation");
    expect(tools).not.toHaveProperty("motion_recipe");
    expect(tools).toHaveProperty("create_animation");
    expect(tools).toHaveProperty("manage_keyframes");
  });
});
