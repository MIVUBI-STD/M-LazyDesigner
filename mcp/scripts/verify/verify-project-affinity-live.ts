import { BlockitRuntimeBackend } from "@/gateway/runtime/backend";
import { readRuntimeProjectHealth } from "@/lib/runtime/affinity";
import {
  expect,
  requireDisposableConsent,
  type JsonObject,
} from "./live-e2e-common";

const PROJECT_A = "blockit_affinity_a_disposable";
const PROJECT_B = "blockit_affinity_b_disposable";

requireDisposableConsent();

const gatewayA = new BlockitRuntimeBackend();
const gatewayB = new BlockitRuntimeBackend();
let toolCalls = 0;

async function invoke(
  gateway: BlockitRuntimeBackend,
  capability: string,
  args: JsonObject = {}
) {
  toolCalls += 1;
  return await gateway.invokeCapability(capability, args);
}

function structuredResult(
  result: Awaited<ReturnType<BlockitRuntimeBackend["invokeCapability"]>>,
  capability: string
): JsonObject {
  expect(
    result.structuredContent &&
      typeof result.structuredContent === "object" &&
      !Array.isArray(result.structuredContent),
    `${capability} returned no structuredContent.`
  );
  return result.structuredContent as JsonObject;
}

async function createDisposableProject(
  gateway: BlockitRuntimeBackend,
  name: string
): Promise<string> {
  const created = structuredResult(
    await invoke(gateway, "create_project", { name, resolution: 128 }),
    "create_project"
  );
  const project = created.project as JsonObject | undefined;
  const uuid = project?.uuid;
  expect(typeof uuid === "string" && uuid.length > 0, `${name} returned no project UUID.`);
  return uuid;
}

async function projectInfo(gateway: BlockitRuntimeBackend) {
  return structuredResult(
    await invoke(gateway, "get_project_info"),
    "get_project_info"
  );
}

async function main() {
  try {
    const initial = await gatewayA.getStatus();
    expect(initial.runtime.online, "BlockIT Runtime must be online.");
    const initialProject = readRuntimeProjectHealth(initial.runtime.health);
    expect(initialProject, "Installed BlockIT Runtime has no project-affinity health contract.");
    expect(
      initialProject.open_project_count === 0,
      `PROJECT AFFINITY LIVE REFUSED: close all Blockbench project tabs first; found ${initialProject.open_project_count}.`
    );

    const projectA = await createDisposableProject(gatewayA, PROJECT_A);
    const projectB = await createDisposableProject(gatewayB, PROJECT_B);
    expect(projectA !== projectB, "Disposable project UUIDs must be distinct.");

    await invoke(gatewayA, "manage_cubes", {
      operation: "create",
      group: "root",
      faces: true,
      elements: [
        {
          name: "affinity_a_cube",
          from: [0, 0, 0],
          to: [2, 2, 2],
          rotation: [0, 0, 0],
        },
      ],
    });
    await invoke(gatewayB, "manage_cubes", {
      operation: "create",
      group: "root",
      faces: true,
      elements: [
        {
          name: "affinity_b_cube",
          from: [4, 0, 0],
          to: [6, 2, 2],
          rotation: [0, 0, 0],
        },
      ],
    });

    const infoA = await projectInfo(gatewayA);
    const infoB = await projectInfo(gatewayB);
    const stateA = infoA.project as JsonObject | undefined;
    const stateB = infoB.project as JsonObject | undefined;
    expect(stateA?.uuid === projectA, `Gateway A drifted to ${String(stateA?.uuid)}.`);
    expect(stateB?.uuid === projectB, `Gateway B drifted to ${String(stateB?.uuid)}.`);

    const [parallelA, parallelB] = await Promise.all([
      projectInfo(gatewayA),
      projectInfo(gatewayB),
    ]);
    expect(
      (parallelA.project as JsonObject | undefined)?.uuid === projectA,
      "Concurrent Gateway A read escaped its project affinity."
    );
    expect(
      (parallelB.project as JsonObject | undefined)?.uuid === projectB,
      "Concurrent Gateway B read escaped its project affinity."
    );

    const finalB = await gatewayB.getStatus();
    const finalProject = readRuntimeProjectHealth(finalB.runtime.health);
    expect(finalProject, "Final Runtime health lost project-affinity context.");
    expect(
      finalProject.active_project_uuid === projectB,
      `Ordinary Gateway A calls did not restore the user-visible project tab; active=${String(finalProject.active_project_uuid)} expected=${projectB}.`
    );

    console.log(JSON.stringify({
      project_affinity_live: "PASS",
      project_a: projectA,
      project_b: projectB,
      active_after_cross_gateway_calls: finalProject.active_project_uuid,
      tool_calls: toolCalls,
      parallel_read_rounds: 1,
      cleanup: "Two disposable project tabs remain open; discard them manually after review.",
    }, null, 2));
  } finally {
    await Promise.allSettled([gatewayA.close(), gatewayB.close()]);
  }
}

await main();