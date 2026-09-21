import { describe, expect, test } from "bun:test";
import { tools } from "@/lib/factories";
import "@/server/tools";

describe("semantic UV automation preserves public capability surface", () => {
  test("does not register a second UV capability family", () => {
    expect(tools).not.toHaveProperty("semantic_uv");
    expect(tools).not.toHaveProperty("manage_semantic_uv");
    expect(tools).not.toHaveProperty("auto_pack_uv");
    expect(tools).toHaveProperty("manage_cubes");
    expect(tools).toHaveProperty("inspect_elements");
  });
});
