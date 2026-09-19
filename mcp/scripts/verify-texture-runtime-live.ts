import { PAINT_TEXTURE_TRANSACTION_TOOL_NAME } from "@/lib/paintTransactionPolicy";
import {
  LiveMcpClient,
  expect,
  firstImage,
  imageDigest,
  requireDisposableConsent,
  structuredObject,
  type JsonObject,
} from "./live-e2e-common";

const PROJECT_NAME = "blockit_texture_runtime_e2e";
const BASE_NAME = "wiring_base";
const VARIANT_NAME = "wiring_variant";
const VARIANT_GROUP = "wiring_variants";
export const TEXTURE_RUNTIME_PROJECT_INPUT = {
  name: PROJECT_NAME,
  discard_unsaved: true,
  resolution: 128,
} as const;

const REQUIRED_TOOLS = [
  "create_project",
  "get_project_info",
  "create_texture",
  "add_texture_group",
  "get_texture",
  PAINT_TEXTURE_TRANSACTION_TOOL_NAME,
  "undo",
  "redo",
] as const;

function revisionOf(value: JsonObject, context: string): string {
  const revision = value.revision;
  expect(
    typeof revision === "string" && /^sha256:\d+x\d+:[0-9a-f]{64}$/.test(revision),
    `${context} returned no valid full-RGBA revision.`
  );
  return revision;
}

async function expectToolFailure(
  action: () => Promise<unknown>,
  marker: string
): Promise<void> {
  try {
    await action();
  } catch (error) {
    expect(
      String(error).toLowerCase().includes(marker.toLowerCase()),
      `Expected failure containing ${JSON.stringify(marker)}, received ${String(error)}.`
    );
    return;
  }
  throw new Error(`Expected tool failure containing ${JSON.stringify(marker)}.`);
}

async function main(): Promise<void> {
  requireDisposableConsent();
  const client = new LiveMcpClient({
    expectedPhase: "geometry",
    requiredTools: REQUIRED_TOOLS,
  });
  const environment = await client.preflight();

  const created = structuredObject(
    await client.callTool(
      "create_project",
      TEXTURE_RUNTIME_PROJECT_INPUT,
      "mutation"
    ),
    "create_project"
  );
  const createdProject = (created.project ?? {}) as JsonObject;
  expect(
    typeof createdProject.uuid === "string" && createdProject.name === PROJECT_NAME,
    `create_project did not publish the disposable project identity: ${JSON.stringify(createdProject)}.`
  );

  const projectInfo = structuredObject(
    await client.callTool("get_project_info", {}, "inspection"),
    "get_project_info"
  );
  const project = (projectInfo.project ?? {}) as JsonObject;
  expect(
    project.uuid === createdProject.uuid && project.name === PROJECT_NAME,
    `get_project_info did not read back the created project identity: ${JSON.stringify(project)}.`
  );

  const baseCreated = structuredObject(
    await client.callTool(
      "create_texture",
      { name: BASE_NAME, type: "blank", width: 128, height: 128 },
      "mutation"
    ),
    "create_texture"
  );
  const base = (baseCreated.texture ?? {}) as JsonObject;
  expect(typeof base.uuid === "string", "Base create_texture returned no UUID.");

  await client.callTool(
    "add_texture_group",
    { name: VARIANT_GROUP, is_material: false },
    "mutation"
  );
  const variantCreated = structuredObject(
    await client.callTool(
      "create_texture",
      {
        type: "variant",
        name: VARIANT_NAME,
        source_texture_id: base.uuid,
        group: VARIANT_GROUP,
      },
      "mutation"
    ),
    "create_texture variant"
  );
  const variant = (variantCreated.texture ?? {}) as JsonObject;
  expect(typeof variant.uuid === "string", "Variant create_texture returned no UUID.");

  const baseBeforeResult = await client.callTool(
    "get_texture",
    {
      texture: base.uuid,
      region: { x: 0, y: 0, width: 4, height: 4 },
    },
    "evidence"
  );
  const baseBefore = structuredObject(baseBeforeResult, "get_texture base before");
  const beforeRevision = revisionOf(baseBefore, "get_texture base before");
  const beforeImage = firstImage(baseBeforeResult, "get_texture base before");
  expect(
    (baseBefore.region as JsonObject | undefined)?.width === 4 &&
      (baseBefore.region as JsonObject | undefined)?.height === 4,
    `Focused get_texture did not preserve requested 4x4 region: ${JSON.stringify(baseBefore.region)}.`
  );
  expect(
    JSON.stringify(baseBefore).includes("rgba") === false,
    "Focused get_texture leaked raw RGBA into structuredContent."
  );

  const variantBeforeResult = await client.callTool(
    "get_texture",
    { texture: variant.uuid, region: { x: 0, y: 0, width: 4, height: 4 } },
    "evidence"
  );
  const variantBeforeDigest = imageDigest(
    firstImage(variantBeforeResult, "get_texture variant before")
  );

  const transaction = structuredObject(
    await client.callTool(
      PAINT_TEXTURE_TRANSACTION_TOOL_NAME,
      {
        texture_id: base.uuid,
        expected_revision: beforeRevision,
        operations: [
          {
            operation: "fill_rect",
            color: "#112233FF",
            rect: { x: 0, y: 0, width: 4, height: 4 },
          },
          {
            operation: "set_pixels",
            color: "#FF0000FF",
            coordinates: [{ x: 0, y: 0 }, { x: 3, y: 3 }],
          },
        ],
      },
      "mutation"
    ),
    PAINT_TEXTURE_TRANSACTION_TOOL_NAME
  );
  const transactionRevision = (transaction.revision ?? {}) as JsonObject;
  expect(
    transactionRevision.before === beforeRevision &&
      typeof transactionRevision.after === "string" &&
      transactionRevision.after !== beforeRevision,
    `Paint transaction returned invalid revision receipt: ${JSON.stringify(transactionRevision)}.`
  );
  const afterRevision = transactionRevision.after as string;

  await expectToolFailure(
    () =>
      client.callTool(
        "get_texture",
        {
          texture: base.uuid,
          region: { x: 0, y: 0, width: 4, height: 4 },
          expected_revision: beforeRevision,
        },
        "evidence"
      ),
    "changed since"
  );

  const baseAfterResult = await client.callTool(
    "get_texture",
    {
      texture: base.uuid,
      region: { x: 0, y: 0, width: 4, height: 4 },
      expected_revision: afterRevision,
    },
    "evidence"
  );
  expect(
    imageDigest(firstImage(baseAfterResult, "get_texture base after")) !==
      imageDigest(beforeImage),
    "Atomic transaction did not change requested base crop evidence."
  );

  const variantAfterResult = await client.callTool(
    "get_texture",
    { texture: variant.uuid, region: { x: 0, y: 0, width: 4, height: 4 } },
    "evidence"
  );
  expect(
    imageDigest(firstImage(variantAfterResult, "get_texture variant after")) ===
      variantBeforeDigest,
    "Painting the base mutated the explicit variant target."
  );

  await client.callTool("undo", { steps: 1 }, "history");
  const undone = structuredObject(
    await client.callTool("get_texture", { texture: base.uuid }, "evidence"),
    "get_texture after undo"
  );
  expect(
    revisionOf(undone, "get_texture after undo") === beforeRevision,
    "One Undo did not restore the pre-transaction full bitmap revision."
  );

  await client.callTool("redo", { steps: 1 }, "history");
  const redone = structuredObject(
    await client.callTool("get_texture", { texture: base.uuid }, "evidence"),
    "get_texture after redo"
  );
  expect(
    revisionOf(redone, "get_texture after redo") === afterRevision,
    "One Redo did not restore the applied transaction revision."
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        proof: "texture_runtime_live",
        build_identity: environment.buildIdentity,
        project_uuid: project.uuid,
        base_texture_uuid: base.uuid,
        variant_texture_uuid: variant.uuid,
        revision_before: beforeRevision,
        revision_after: afterRevision,
        focused_png_delivery: true,
        stale_revision_rejected: true,
        one_undo_redo_transaction: true,
        variant_target_isolation: true,
        cost: client.snapshotMetrics(),
      },
      null,
      2
    )
  );
}

if (import.meta.main) {
  await main();
}
