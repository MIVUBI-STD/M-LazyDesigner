import { describe, expect, test } from "bun:test";
import { tools } from "@/lib/factories";
import "@/server/tools";

describe("procedural material automation reuses native owners",()=>{
  test("retains existing creation/compute/material owners",()=>{
    expect(tools).toHaveProperty("create_texture");
    expect(tools).toHaveProperty("paint_texture_transaction");
    expect(tools).toHaveProperty("create_pbr_material");
    expect(tools).toHaveProperty("configure_material");
    expect(tools).not.toHaveProperty("procedural_material");
  });
});
