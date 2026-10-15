import { describe, expect, test } from "bun:test";
import { contextForAuthoringDomain, PROFILE_PATHS } from "./contexts";
import { MODELLING_PATH, TEXTURING_PATH } from "../context/authoring";
import type { ControlContextHandle } from "./types";

function handle(path: string): ControlContextHandle {
  return {
    id: "ctx:test@one.two",
    path,
    sha256: "a".repeat(64),
    semantic_dependencies: ["routing"],
    semantic_revision: "b".repeat(64),
  };
}
function systemError(code: string): Error {
  return Object.assign(new Error("fixture only"), { code });
}

describe("required authoring context resolution", () => {
  test("missing specialist is reported without returning a fabricated handle", async () => {
    const result = await contextForAuthoringDomain("TEXTURING", null, async () => {
      throw systemError("ENOENT");
    });
    expect(result.required).toEqual([]);
    expect(result.unavailable).toEqual([
      { path: TEXTURING_PATH, code: "CONTEXT_FILE_MISSING" },
    ]);
  });

  test("missing selected profile does not discard a valid modelling specialist", async () => {
    const result = await contextForAuthoringDomain("GEOMETRY", "HUMANOID", async (path) => {
      if (path === PROFILE_PATHS.HUMANOID) throw systemError("ENOTDIR");
      return handle(path);
    });
    expect(result.required.map((item) => item.path)).toEqual([MODELLING_PATH]);
    expect(result.unavailable).toEqual([
      { path: PROFILE_PATHS.HUMANOID, code: "CONTEXT_FILE_MISSING" },
    ]);
  });

  test("permission refusal is distinct from a missing file", async () => {
    const result = await contextForAuthoringDomain("ANIMATION", null, async () => {
      throw systemError("EACCES");
    });
    expect(result.unavailable[0]?.code).toBe("CONTEXT_FILE_UNREADABLE");
  });

  test("unexpected resolver failures propagate instead of being labelled missing", async () => {
    await expect(contextForAuthoringDomain("GEOMETRY", null, async () => {
      throw new Error("broken resolver");
    })).rejects.toThrow("broken resolver");
  });

  test("healthy context and non-authoring domain retain normal resolution", async () => {
    const healthy = await contextForAuthoringDomain("TEXTURING", null, async (path) => handle(path));
    expect(healthy.required).toHaveLength(1);
    expect(healthy.unavailable).toEqual([]);
    const core = await contextForAuthoringDomain("CORE", null, async () => {
      throw new Error("should not read");
    });
    expect(core).toEqual({ required: [], optional: [], unavailable: [] });
  });
});
