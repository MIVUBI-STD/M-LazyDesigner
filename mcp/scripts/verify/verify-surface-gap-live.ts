import {
  LiveMcpClient,
  expect,
  requireDisposableConsent,
  structuredObject,
  type JsonObject,
} from "./live-e2e-common";

const REQUIRED_TOOLS = [
  "create_project",
  "add_group",
  "manage_cubes",
  "inspect_model_bounds",
] as const;

const PROJECT_NAME = "blockit_surface_gap_disposable";
const GROUP_NAME = "surface_gap_root";

function warningStrings(result: JsonObject): string[] {
  const warnings = result.warnings;
  expect(
    Array.isArray(warnings),
    "inspect_model_bounds returned no warnings array."
  );
  expect(
    warnings.every((warning) => typeof warning === "string"),
    "inspect_model_bounds returned a non-string warning entry."
  );
  return warnings as string[];
}

function pairEdgeGapWarning(
  warnings: readonly string[],
  firstUuid: string,
  secondUuid: string
): string | undefined {
  return warnings.find(
    (warning) =>
      warning.includes("Possible coplanar edge-gap:") &&
      warning.includes(firstUuid) &&
      warning.includes(secondUuid)
  );
}

async function main(): Promise<void> {
  requireDisposableConsent();
  const client = new LiveMcpClient({
    expectedPhase: "geometry",
    requiredTools: REQUIRED_TOOLS,
  });
  const environment = await client.preflight();

  await client.callTool(
    "create_project",
    {
      name: PROJECT_NAME,
      discard_unsaved: true,
      resolution: 128,
    },
    "mutation"
  );

  const groupResult = structuredObject(
    await client.callTool(
      "add_group",
      {
        name: GROUP_NAME,
        origin: [0, 2, 0],
      },
      "mutation"
    ),
    "add_group"
  );
  const group = (groupResult.group ?? {}) as JsonObject;
  expect(typeof group.uuid === "string", "add_group returned no Group UUID.");

  const placement = structuredObject(
    await client.callTool(
      "manage_cubes",
      {
        operation: "create",
        group: group.uuid,
        elements: [
          {
            name: "surface_lower",
            from: [-2, 0, -1],
            to: [2, 2, 1],
          },
          {
            name: "surface_upper",
            from: [-2, 2.5, -1],
            to: [2, 4.5, 1],
          },
        ],
      },
      "mutation"
    ),
    "manage_cubes"
  );
  const cubes = placement.cubes as Array<JsonObject> | undefined;
  const lowerUuid = cubes?.[0]?.uuid;
  const upperUuid = cubes?.[1]?.uuid;
  expect(
    typeof lowerUuid === "string",
    "manage_cubes returned no lower Cube UUID."
  );
  expect(
    typeof upperUuid === "string",
    "manage_cubes returned no upper Cube UUID."
  );

  const withGap = structuredObject(
    await client.callTool("inspect_model_bounds", {}, "inspection"),
    "inspect_model_bounds"
  );
  const gapWarnings = warningStrings(withGap);
  const detected = pairEdgeGapWarning(gapWarnings, lowerUuid, upperUuid);
  expect(
    detected,
    `Expected a coplanar edge-gap warning for the 0.5-unit fixture. warnings=${JSON.stringify(gapWarnings)}`
  );
  expect(
    detected.includes("0.5000 Blockbench units"),
    `Edge-gap warning did not report the expected 0.5000-unit distance: ${detected}`
  );

  await client.callTool(
    "manage_cubes",
    {
      operation: "update",
      id: upperUuid,
      from: [-2, 2, -1],
      to: [2, 4, 1],
    },
    "mutation"
  );

  const closed = structuredObject(
    await client.callTool("inspect_model_bounds", {}, "inspection"),
    "inspect_model_bounds"
  );
  const closedWarnings = warningStrings(closed);
  expect(
    pairEdgeGapWarning(closedWarnings, lowerUuid, upperUuid) === undefined,
    `Coplanar edge-gap warning remained after closing the seam. warnings=${JSON.stringify(closedWarnings)}`
  );

  // A non-adjacent Cube pair must not report a hole already filled by a third
  // rendered Cube. Hide the cover to prove that a real opening is not masked.
  await client.callTool("manage_cubes", {
    operation: "update",
    id: upperUuid,
    from: [-2, 2.5, -1],
    to: [2, 4.5, 1],
  }, "mutation");
  const covering = structuredObject(await client.callTool("manage_cubes", {
    operation: "create",
    group: group.uuid,
    elements: [{ name: "surface_bridge", from: [-2, 2, -1], to: [2, 2.5, 1] }],
  }, "mutation"), "manage_cubes");
  const bridgeUuid = (covering.cubes as JsonObject[] | undefined)?.[0]?.uuid;
  expect(typeof bridgeUuid === "string", "manage_cubes returned no bridge Cube UUID.");

  const covered = warningStrings(structuredObject(
    await client.callTool("inspect_model_bounds", {}, "inspection"),
    "inspect_model_bounds"
  ));
  expect(
    pairEdgeGapWarning(covered, lowerUuid, upperUuid) === undefined,
    `Fully covered seam still reports an edge-gap: ${JSON.stringify(covered)}`
  );

  await client.callTool("manage_cubes", {
    operation: "update", id: bridgeUuid, visibility: false,
  }, "mutation");
  const uncovered = warningStrings(structuredObject(
    await client.callTool("inspect_model_bounds", {}, "inspection"),
    "inspect_model_bounds"
  ));
  expect(
    pairEdgeGapWarning(uncovered, lowerUuid, upperUuid),
    "Hiding the bridge must restore the original pair's edge-gap warning."
  );
  await client.callTool("manage_cubes", {
    operation: "update", id: bridgeUuid, visibility: true,
  }, "mutation");
  const restored = warningStrings(structuredObject(
    await client.callTool("inspect_model_bounds", {}, "inspection"),
    "inspect_model_bounds"
  ));
  expect(
    pairEdgeGapWarning(restored, lowerUuid, upperUuid) === undefined,
    "Restoring the rendered bridge must clear the covered edge-gap warning."
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        proof: "live_surface_gap_regression",
        build_identity: environment.buildIdentity,
        fixture: {
          project: PROJECT_NAME,
          group_uuid: group.uuid,
          lower_cube_uuid: lowerUuid,
          upper_cube_uuid: upperUuid,
          bridge_cube_uuid: bridgeUuid,
          initial_gap_blockbench_units: 0.5,
        },
        detected_warning: detected,
        warning_cleared_after_contact: true,
        warning_cleared_after_cover: true,
        warning_restored_when_cover_hidden: true,
        cost: client.snapshotMetrics(),
        visual_quality: "not_evaluated",
        note: "Targeted diagnostic regression only. It does not replace reference-fidelity or whole-model visual review.",
      },
      null,
      2
    )
  );
}

if (import.meta.main) {
  await main();
}