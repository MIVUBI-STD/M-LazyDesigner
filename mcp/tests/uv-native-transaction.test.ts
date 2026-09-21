import { describe, expect, test } from "bun:test";
import { validateNativeUvTransactionPlan } from "@/lib/uv/nativeTransaction";

describe("native semantic UV transaction contract", () => {
  test("rejects duplicate face mutation and non-finite coordinates", () => {
    expect(() => validateNativeUvTransactionPlan({
      expected_fingerprint: "state",
      operations: [
        { island_id: "a", cube_uuid: "cube", face: "north", uv: [0,0,4,4], rotation: 0 },
        { island_id: "b", cube_uuid: "cube", face: "north", uv: [4,0,8,4], rotation: 0 },
      ],
    })).toThrow("same Cube face twice");

    expect(() => validateNativeUvTransactionPlan({
      expected_fingerprint: "state",
      operations: [
        { island_id: "a", cube_uuid: "cube", face: "north", uv: [0,0,Number.NaN,4], rotation: 0 },
      ],
    })).toThrow("non-finite");
  });
});
