import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  AUTHORING_E2E_ANIMATION_A_NAME,
  AUTHORING_E2E_ANIMATION_B_NAME,
  AUTHORING_E2E_BONE_NAME,
  AUTHORING_E2E_CUBE_NAME,
  AUTHORING_E2E_PROJECT_NAME,
  LiveMcpClient,
  expect,
  requireDisposableConsent,
  structuredObject,
  type JsonObject,
} from "./live-e2e-common";

const REQUIRED_TOOLS = [
  "get_project_info",
  "inspect_elements",
  "list_textures",
  "inspect_animation",
  "export_model",
] as const;
const THIN_CUBE_NAME = "e2e_thin_per_face";

const CACHE_DIR = resolve(".cache/live-authoring-e2e");
const DEFAULT_PROJECT_PATH = resolve(
  CACHE_DIR,
  `${AUTHORING_E2E_PROJECT_NAME}.bbmodel`
);
const DEFAULT_MANIFEST_PATH = resolve(
  CACHE_DIR,
  `${AUTHORING_E2E_PROJECT_NAME}.reopen.json`
);

function stableProjectState(info: JsonObject) {
  const project = (info.project ?? {}) as JsonObject;
  return {
    name: project.name ?? null,
    format: info.format ?? null,
    resolution: info.resolution ?? null,
    counts: info.counts ?? null,
  };
}

function stableElementState(detail: JsonObject) {
  const parent = (detail.parent ?? null) as JsonObject | null;
  return {
    uuid: detail.uuid ?? null,
    name: detail.name ?? null,
    type: detail.type ?? null,
    parent: parent
      ? { uuid: parent.uuid ?? null, name: parent.name ?? null }
      : null,
    from: detail.from ?? null,
    to: detail.to ?? null,
    size: detail.size ?? null,
    origin: detail.origin ?? null,
    rotation: detail.rotation ?? null,
    inflate: detail.inflate ?? null,
    uv: detail.uv ?? null,
    export: detail.export ?? null,
    visibility: detail.visibility ?? null,
  };
}

function stableTextureState(inventory: JsonObject) {
  const atlas = (inventory.atlas_state ?? {}) as JsonObject;
  const textures = ((inventory.textures ?? []) as JsonObject[])
    .map((texture) => ({
      uuid: texture.uuid ?? null,
      name: texture.name ?? null,
      id: texture.id ?? null,
      role: texture.role ?? null,
      group: texture.group ?? null,
      pbr_channel: texture.pbr_channel ?? null,
      bitmap: texture.bitmap ?? null,
      logical_uv: texture.logical_uv ?? null,
      animated: texture.animated ?? null,
      render_mode: texture.render_mode ?? null,
      render_sides: texture.render_sides ?? null,
    }))
    .sort((a, b) => String(a.uuid).localeCompare(String(b.uuid)));
  const uvAudit = (inventory.uv_audit ?? {}) as JsonObject;
  return {
    logical_uv: inventory.logical_uv ?? null,
    default_texture_uuid: atlas.default_texture_uuid ?? null,
    textures,
    uv_production_gate:
      uvAudit.state === "available"
        ? (uvAudit.production_gate ?? null)
        : { state: uvAudit.state ?? "unavailable" },
  };
}

function stableAnimationState(inspection: JsonObject) {
  return {
    authored_space: inspection.authored_space ?? null,
    animation: inspection.animation ?? null,
    focused_bone: inspection.focused_bone ?? null,
  };
}

async function inspectElement(
  client: LiveMcpClient,
  id: string,
  detail: "geometry" | "uv"
): Promise<JsonObject> {
  return structuredObject(
    await client.callTool(
      "inspect_elements",
      {
        mode: "detail",
        id,
        detail,
      },
      "inspection"
    ),
    "inspect_elements"
  );
}

async function inspectAnimation(
  client: LiveMcpClient,
  animation: string
): Promise<JsonObject> {
  return structuredObject(
    await client.callTool(
      "inspect_animation",
      {
        animation_id: animation,
        bone: AUTHORING_E2E_BONE_NAME,
      },
      "inspection"
    ),
    "inspect_animation"
  );
}

async function snapshot(client: LiveMcpClient) {
  const project = structuredObject(
    await client.callTool("get_project_info", {}, "inspection"),
    "get_project_info"
  );
  const projectRoot = (project.project ?? {}) as JsonObject;
  expect(
    projectRoot.name === AUTHORING_E2E_PROJECT_NAME,
    `Expected disposable project ${AUTHORING_E2E_PROJECT_NAME}; current=${String(projectRoot.name)}.`
  );
  const textures = structuredObject(
    await client.callTool("list_textures", {}, "inspection"),
    "list_textures"
  );
  return {
    project: stableProjectState(project),
    body: stableElementState(
      await inspectElement(client, AUTHORING_E2E_CUBE_NAME, "geometry")
    ),
    thin_per_face: stableElementState(
      await inspectElement(client, THIN_CUBE_NAME, "uv")
    ),
    textures: stableTextureState(textures),
    animations: {
      a: stableAnimationState(
        await inspectAnimation(client, AUTHORING_E2E_ANIMATION_A_NAME)
      ),
      b: stableAnimationState(
        await inspectAnimation(client, AUTHORING_E2E_ANIMATION_B_NAME)
      ),
    },
  };
}

async function fileSha256(path: string): Promise<string> {
  const file = Bun.file(path);
  expect(await file.exists(), `Expected persistence artifact ${path}.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  return new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
}

function exactEqual(actual: unknown, expected: unknown, label: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  expect(
    actualJson === expectedJson,
    `${label} changed across native reopen.\nexpected=${expectedJson}\nactual=${actualJson}`
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  requireDisposableConsent(args);
  const prepare = args.includes("--prepare");
  const verify = args.includes("--verify");
  expect(
    prepare !== verify,
    "Persistence verifier requires exactly one mode: --prepare or --verify."
  );

  const projectPath = resolve(
    process.env.BLOCKIT_PERSISTENCE_PROJECT ?? DEFAULT_PROJECT_PATH
  );
  const manifestPath = resolve(
    process.env.BLOCKIT_PERSISTENCE_MANIFEST ?? DEFAULT_MANIFEST_PATH
  );
  const client = new LiveMcpClient({
    expectedPhase: "animation",
    requiredTools: REQUIRED_TOOLS,
  });
  const environment = await client.preflight();

  if (prepare) {
    const before = await snapshot(client);
    await mkdir(dirname(projectPath), { recursive: true });
    await mkdir(dirname(manifestPath), { recursive: true });
    const exported = structuredObject(
      await client.callTool(
        "export_model",
        {
          codec_id: "project",
          path: projectPath,
          overwrite: true,
        },
        "mutation"
      ),
      "export_model"
    );
    expect(
      exported.wrote_to_path === projectPath,
      `export_model did not verify the intended persistence path: ${String(exported.wrote_to_path)}.`
    );
    const artifactSha256 = await fileSha256(projectPath);
    const manifest = {
      version: 1,
      build_identity: environment.buildIdentity,
      project_path: projectPath,
      artifact_sha256: artifactSha256,
      expected: before,
    };
    await Bun.write(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    console.log(
      JSON.stringify(
        {
          ok: true,
          proof: "live_persistence_prepare",
          build_identity: environment.buildIdentity,
          project_path: projectPath,
          manifest_path: manifestPath,
          artifact_sha256: artifactSha256,
          cost: client.snapshotMetrics(),
          next:
            "In Blockbench, close the disposable project and reopen exactly the exported .bbmodel. Keep/re-enter Animation focus, then run verify:persistence-live -- --verify --confirm-disposable.",
          note:
            "Prepare proves a verified native .bbmodel write and records deterministic body, thin per-face UV, texture and animation state. It does not prove reopen until --verify succeeds after the manual native reopen.",
        },
        null,
        2
      )
    );
    return;
  }

  const manifestFile = Bun.file(manifestPath);
  expect(
    await manifestFile.exists(),
    `Missing persistence manifest ${manifestPath}. Run --prepare first.`
  );
  const manifest = JSON.parse(await manifestFile.text()) as {
    version?: number;
    build_identity?: string;
    project_path?: string;
    artifact_sha256?: string;
    expected?: unknown;
  };
  expect(manifest.version === 1, "Unsupported persistence manifest version.");
  expect(
    manifest.build_identity === environment.buildIdentity,
    `Persistence manifest build differs from live build: manifest=${String(manifest.build_identity)} live=${environment.buildIdentity}.`
  );
  expect(
    manifest.project_path === projectPath,
    `Persistence manifest path differs from requested path: ${String(manifest.project_path)}.`
  );
  expect(
    manifest.artifact_sha256 === (await fileSha256(projectPath)),
    "The prepared .bbmodel artifact changed before reopen verification."
  );

  const projectInfo = structuredObject(
    await client.callTool("get_project_info", {}, "inspection"),
    "get_project_info"
  );
  const lifecycle = (projectInfo.project ?? {}) as JsonObject;
  expect(
    lifecycle.save_path === projectPath,
    `Native reopen is not proven: current save_path=${String(lifecycle.save_path)} expected=${projectPath}.`
  );

  const after = await snapshot(client);
  exactEqual(after, manifest.expected, "Disposable authored state");

  console.log(
    JSON.stringify(
      {
        ok: true,
        proof: "live_persistence_reopen",
        build_identity: environment.buildIdentity,
        project_path: projectPath,
        manifest_path: manifestPath,
        artifact_sha256: manifest.artifact_sha256,
        native_save_path_matches: true,
        authored_state_matches_prepare_snapshot: true,
        thin_per_face_uv_persisted: true,
        cost: client.snapshotMetrics(),
        visual_quality: "not_evaluated",
        note:
          "This proves native .bbmodel reopen for project/counts, body state, thin per-face UV state, texture metadata/UV gate, and both animation/bone states. It does not substitute for texture visual fidelity or Minecraft execution.",
      },
      null,
      2
    )
  );
}

if (import.meta.main) {
  await main();
}