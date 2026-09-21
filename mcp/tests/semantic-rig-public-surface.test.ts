import { describe, expect, test } from "bun:test";
import { tools } from "@/lib/factories";
import "@/server/tools";

describe("semantic rig preserves existing public surface", () => {
  test("does not add a second rig tool family", () => {
    expect(tools).not.toHaveProperty("semantic_rig");
    expect(tools).not.toHaveProperty("generate_rig");
    expect(tools).toHaveProperty("add_group");
    expect(tools).toHaveProperty("bone_rigging");
  });
});
