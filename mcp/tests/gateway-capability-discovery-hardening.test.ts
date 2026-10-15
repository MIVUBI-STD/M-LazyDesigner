import { describe, expect, test } from "bun:test";
import {
  classifyCapabilityTier,
  searchCapabilityCatalog,
  type BackendTool,
} from "@/gateway/contract";

describe("BlockIT Gateway capability discovery hardening", () => {
  const tools: BackendTool[] = [
    {
      name: "manage_cubes",
      description: "Create and update Bedrock geometry cubes.",
    },
    {
      name: "create_brush_preset",
      description: "Create a reusable texture brush preset.",
    },
    {
      name: "emulate_clicks",
      description: "Emulate Blockbench UI clicks for maintenance.",
    },
  ];

  test("unrelated developer-console intent is not promoted by generic action metadata", () => {
    const accidentalMatch: BackendTool[] = [
      { name: "manage_cubes", description: "Create and update Bedrock geometry cubes; return action receipts." },
      { name: "create_brush_preset", description: "Apply a texture brush action." },
    ];
    expect(searchCapabilityCatalog(accidentalMatch, "developer tools console action", 4))
      .toEqual([]);
    expect(searchCapabilityCatalog(accidentalMatch, "tools and actions", 4))
      .toEqual([]);
  });

  test("short Bedrock and Blockbench terms remain searchable without inventing capabilities", () => {
    const cases: readonly [string, BackendTool][] = [
      ["UV", { name: "uv_fixture", description: "Inspect UV mapping." }],
      ["IK", { name: "ik_fixture", description: "Inspect IK targets." }],
      ["3D", { name: "three_dimensional_fixture", description: "Inspect 3D model views." }],
      ["UI", { name: "interface_fixture", description: "Inspect UI state." }],
      ["FX", { name: "effects_fixture", description: "Inspect FX channel." }],
    ];
    for (const [query, tool] of cases) {
      expect(searchCapabilityCatalog([tool], query, 4).map((item) => item.capability_id), query)
        .toContain(tool.name);
      expect(searchCapabilityCatalog([tool], `tolong cari tools untuk ${query}`, 4)
        .map((item) => item.capability_id), query)
        .toContain(tool.name);
    }
    // An unsupported query must still return no candidate, not a fabricated tool.
    expect(searchCapabilityCatalog([
      { name: "manage_cubes", description: "Create a Bedrock cube." },
    ], "FX", 4)).toEqual([]);
  });

  test("semantic authoring examples survive generic-word filtering", () => {
    // The semantic example 'make four table legs' is not in the tool's
    // description or name. A keyword-only filter incorrectly loses this route.
    const result = searchCapabilityCatalog(tools, "make four table legs", 4);
    expect(result.map((entry) => entry.capability_id)).toContain("manage_cubes");
    expect(searchCapabilityCatalog(tools, "tool to create geometry cubes", 4)
      .map((entry) => entry.capability_id)).toContain("manage_cubes");
  });

  test("no-result discovery is not presented as Runtime failure or a suggested UI fallback", async () => {
    const source = await Bun.file("gateway/handlers/registerCoreTools.ts").text();
    expect(source).toContain("No relevant capability found.");
    expect(source).toContain("structuredContent: { capabilities }");
  });

  test("specific alias, exact name and real authoring intent remain discoverable", () => {
    expect(searchCapabilityCatalog(tools, "manage_cubes", 5))
      .toHaveLength(1);
    expect(searchCapabilityCatalog(tools, "buat kubus baru untuk badan model", 5)
      .map((entry) => entry.capability_id)).toContain("manage_cubes");
    expect(searchCapabilityCatalog(tools, "create geometry cubes", 5)
      .map((entry) => entry.capability_id)).toContain("manage_cubes");
  });

  test("exact capability name short-circuits to exactly one result", () => {
    const exact = searchCapabilityCatalog(tools, "manage_cubes", 50);
    expect(exact).toHaveLength(1);
    expect(exact[0]).toMatchObject({
      capability_id: "manage_cubes",
      tier: "primary",
    });
  });

  test("exact matching is case-insensitive and near names fall back to ranked discovery", () => {
    expect(searchCapabilityCatalog(tools, "MANAGE_CUBES", 50)).toHaveLength(1);
    expect(searchCapabilityCatalog(tools, "manage_cube", 50)[0]?.capability_id)
      .toBe("manage_cubes");
  });

  test("primary capability outranks comparable lower-tier semantic matches", () => {
    const ranked = searchCapabilityCatalog(tools, "geometry create", 4);
    expect(ranked[0]).toMatchObject({
      capability_id: "manage_cubes",
      tier: "primary",
    });
  });

  test("empty discovery excludes maintenance fallback", () => {
    const ids = searchCapabilityCatalog(tools, "", 10)
      .map((entry) => entry.capability_id);
    expect(ids).not.toContain("emulate_clicks");
  });

  test("maintenance remains available only when explicitly targeted", () => {
    const exact = searchCapabilityCatalog(tools, "emulate_clicks", 10);
    expect(exact).toEqual([
      expect.objectContaining({
        capability_id: "emulate_clicks",
        tier: "maintenance",
      }),
    ]);
  });

  test("retired 3D-assisted names receive no active experimental priority", () => {
    expect(classifyCapabilityTier({
      name: "manage_geometry_reference",
      description: "Retired compatibility name only.",
    })).toBe("support");
  });
});
