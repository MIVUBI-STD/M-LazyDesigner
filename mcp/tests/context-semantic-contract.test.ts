import { describe, expect, test } from "bun:test";
import type { ControlContextHandle } from "../gateway/control/types";

describe("control context semantic contract", () => {
  test("requires explicit semantic dependency ownership", () => {
    const handle: ControlContextHandle = {
      id: "ctx:skill/test@aaaaaaaaaaaa.bbbbbbbbbbbb",
      path: ".agents/skills/test.md",
      sha256: "a".repeat(64),
      semantic_dependencies: ["routing", "graph"],
      semantic_revision: "b".repeat(64),
    };

    expect(handle.semantic_dependencies).toEqual(["routing", "graph"]);
    expect(handle.semantic_revision).toHaveLength(64);
  });
});
