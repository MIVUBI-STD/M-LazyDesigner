import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LiveMcpClient,
  expect,
  requireDisposableConsent,
  structuredObject,
  type JsonObject,
} from "./live-e2e-common";

export const PARTICLE_LIVE_REQUIRED_TOOLS = [
  "inspect_particle",
  "manage_particle",
] as const;
export const PARTICLE_LIVE_PROOF_KIND = "live_particle_native_preview";
export const PARTICLE_LIVE_VISUAL_CLAIM = "not_evaluated";

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function diagnosticCodes(summary: JsonObject): string[] {
  const values = Array.isArray(summary.diagnostics) ? summary.diagnostics : [];
  return values
    .map((entry) => object(entry).code)
    .filter((value): value is string => typeof value === "string");
}

async function main(): Promise<void> {
  requireDisposableConsent();
  const client = new LiveMcpClient({
    expectedPhase: "animation",
    requiredTools: PARTICLE_LIVE_REQUIRED_TOOLS,
  });
  const environment = await client.preflight();

  const evidenceDir = mkdtempSync(join(tmpdir(), "blockit-particle-live-"));
  const particlePath = join(evidenceDir, "math_orbit.particle.json");

  const managed = structuredObject(
    await client.callTool(
      "manage_particle",
      {
        create: {
          identifier: "blockit:math_orbit",
          preset: "trail",
          texture: "textures/particle/particles",
        },
        operations: [
          {
            op: "set_component",
            component: "minecraft:particle_motion_parametric",
            value: {
              relative_position: [
                "math.sin(variable.particle_age * 180) * 0.5",
                "variable.particle_age * 0.25",
                "math.cos(variable.particle_age * 180) * 0.5",
              ],
              direction: [0, 1, 0],
              rotation: "variable.particle_age * 90",
            },
          },
          {
            op: "patch",
            path: [
              "components",
              "minecraft:particle_appearance_billboard",
              "size",
            ],
            value: [
              "0.08 + math.sin(variable.particle_age * 360) * 0.02",
              "0.08 + math.sin(variable.particle_age * 360) * 0.02",
            ],
          },
        ],
        output: { path: particlePath },
        preview: true,
        max_content_length: 0,
      },
      "mutation"
    ),
    "manage_particle"
  );

  expect(
    managed.valid === true,
    `manage_particle was not valid: ${JSON.stringify(managed)}.`
  );
  expect(
    managed.wrote_to_path === particlePath,
    "Particle write path was not verified."
  );
  expect(
    managed.preview_path === particlePath,
    "Native preview did not target the written particle path."
  );
  expect(
    managed.preview_error === null,
    `Native particle preview failed: ${String(managed.preview_error)}.`
  );
  const managedSummary = object(managed.summary);
  expect(
    managedSummary.identifier === "blockit:math_orbit",
    "Particle identifier changed unexpectedly."
  );
  expect(
    diagnosticCodes(managedSummary).includes("parametric_motion_molang"),
    "Math-driven parametric motion was not recognized by particle diagnostics."
  );

  const inspected = structuredObject(
    await client.callTool(
      "inspect_particle",
      {
        source: { path: particlePath },
        mode: "summary",
        max_content_length: 0,
      },
      "inspection"
    ),
    "inspect_particle"
  );
  const inspectedSummary = object(inspected.summary);
  expect(
    inspectedSummary.identifier === "blockit:math_orbit",
    "inspect_particle did not read back the authored identifier."
  );
  const components = Array.isArray(inspectedSummary.components)
    ? inspectedSummary.components
    : [];
  expect(
    components.includes("minecraft:particle_motion_parametric"),
    "inspect_particle did not read back parametric motion."
  );
  expect(
    diagnosticCodes(inspectedSummary).includes("parametric_motion_molang"),
    "inspect_particle lost advanced Molang diagnostics."
  );

  const particleFile = readFileSync(particlePath, "utf8");
  expect(
    particleFile.includes("math.sin(variable.particle_age") &&
      particleFile.includes("minecraft:particle_motion_parametric"),
    "Verified particle file does not preserve the authored Molang motion."
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        proof: PARTICLE_LIVE_PROOF_KIND,
        phase: "animation",
        build_identity: environment.buildIdentity,
        particle_path: particlePath,
        one_call_create_patch_save_preview: true,
        parametric_molang_readback: true,
        native_preview_loaded: true,
        cost: client.snapshotMetrics(),
        visual_quality: PARTICLE_LIVE_VISUAL_CLAIM,
        next:
          "Inspect the Blockbench viewport to approve the intended orbit/size motion; native preview loading proves visual-runtime integration, not visual quality or downstream gameplay integration.",
      },
      null,
      2
    )
  );
}

if (import.meta.main) {
  await main();
}