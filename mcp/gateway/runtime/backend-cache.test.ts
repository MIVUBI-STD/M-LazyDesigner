import { describe, expect, test } from "bun:test";
import { BlockitRuntimeBackend } from "./backend";
import type { BackendTool } from "../contracts/protocol";

function primeCatalog(backend: BlockitRuntimeBackend, tools: BackendTool[]): void {
  const state = backend as unknown as {
    client: object | null;
    connectedSignature: string | null;
    catalog: Map<string, BackendTool>;
    catalogValidatedAt: number;
  };
  state.client = {};
  state.connectedSignature = "runtime-test";
  state.catalog = new Map(tools.map((tool) => [tool.name, tool]));
  state.catalogValidatedAt = Date.now();
}

describe("BlockitRuntimeBackend catalog fast path", () => {
  test("search uses a fresh local catalog without probing Runtime", async () => {
    const backend = new BlockitRuntimeBackend(undefined, undefined, {
      catalogLeaseMs: 5_000,
    });
    primeCatalog(backend, [
      {
        name: "manage_cubes",
        description: "Create and edit cubes",
        annotations: { readOnlyHint: false },
      },
    ]);

    const result = await backend.searchCapabilities("cube", 4);
    expect(result.map((item) => item.capability_id)).toContain("manage_cubes");
  });

  test("describe uses a fresh local catalog without probing Runtime", async () => {
    const backend = new BlockitRuntimeBackend(undefined, undefined, {
      catalogLeaseMs: 5_000,
    });
    primeCatalog(backend, [
      {
        name: "inspect_elements",
        description: "Inspect model elements",
        annotations: { readOnlyHint: true },
      },
    ]);

    const tool = await backend.describeCapability("inspect_elements");
    expect(tool.name).toBe("inspect_elements");
  });
});
