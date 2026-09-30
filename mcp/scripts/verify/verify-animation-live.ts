import {
  AUTHORING_E2E_ANIMATION_A_NAME,
  AUTHORING_E2E_ANIMATION_B_NAME,
  AUTHORING_E2E_BONE_NAME,
  AUTHORING_E2E_PROJECT_NAME,
  LiveMcpClient,
  expect,
  requireDisposableConsent,
  structuredObject,
  type JsonObject,
} from "./live-e2e-common";

const REQUIRED_TOOLS = [
  "get_project_info",
  "create_animation",
  "inspect_animation",
  "manage_animation_timeline",
  "undo",
  "redo",
] as const;

async function inspectAnimation(
  client: LiveMcpClient,
  animationId?: string,
  bone = false
): Promise<JsonObject> {
  return structuredObject(
    await client.callTool(
      "inspect_animation",
      {
        ...(animationId ? { animation_id: animationId } : {}),
        ...(bone ? { bone: AUTHORING_E2E_BONE_NAME } : {}),
      },
      "inspection"
    ),
    "inspect_animation"
  );
}

function animationSummary(inspection: JsonObject): JsonObject {
  return (inspection.animation ?? {}) as JsonObject;
}

function selectedAnimationUuid(inspection: JsonObject): string | null {
  const value = animationSummary(inspection).uuid;
  return typeof value === "string" ? value : null;
}

function rotationAt(inspection: JsonObject, time: number): unknown {
  const focused = (inspection.focused_bone ?? {}) as JsonObject;
  const channels = (focused.channels ?? {}) as JsonObject;
  const rotation = (channels.rotation ?? {}) as JsonObject;
  const keyframes = (rotation.keyframes ?? []) as JsonObject[];
  return keyframes.find((keyframe) => keyframe.time === time)?.values;
}

function stableAnimationFingerprint(inspection: JsonObject): string {
  return JSON.stringify({
    animation: inspection.animation ?? null,
    focused_bone: inspection.focused_bone ?? null,
  });
}

async function exactUndo(client: LiveMcpClient): Promise<void> {
  const undo = structuredObject(
    await client.callTool("undo", { steps: 1 }, "history"),
    "undo"
  );
  expect(undo.undone_count === 1, `Undo count mismatch: ${String(undo.undone_count)}.`);
}

async function exactRedo(client: LiveMcpClient): Promise<void> {
  const redo = structuredObject(
    await client.callTool("redo", { steps: 1 }, "history"),
    "redo"
  );
  expect(redo.redone_count === 1, `Redo count mismatch: ${String(redo.redone_count)}.`);
}

async function createAnimation(
  client: LiveMcpClient,
  name: string,
  endRotation: number
): Promise<string> {
  const result = structuredObject(
    await client.callTool(
      "create_animation",
      {
        name,
        loop: false,
        animation_length: 1,
        bones: {
          [AUTHORING_E2E_BONE_NAME]: [
            { time: 0, rotation: [0, 0, 0] },
            { time: 1, rotation: [0, endRotation, 0] },
          ],
        },
      },
      "mutation"
    ),
    "create_animation"
  );
  const animation = (result.animation ?? {}) as JsonObject;
  expect(typeof animation.uuid === "string", `create_animation ${name} returned no UUID.`);
  expect(animation.name === name, `create_animation normalized ${name} unexpectedly to ${String(animation.name)}.`);
  return animation.uuid;
}

async function main(): Promise<void> {
  requireDisposableConsent();
  const client = new LiveMcpClient({
    expectedPhase: "animation",
    requiredTools: REQUIRED_TOOLS,
  });
  const environment = await client.preflight();

  const projectInfo = structuredObject(
    await client.callTool("get_project_info", {}, "inspection"),
    "get_project_info"
  );
  const project = (projectInfo.project ?? {}) as JsonObject;
  expect(
    project.name === AUTHORING_E2E_PROJECT_NAME,
    `Expected shared disposable project ${AUTHORING_E2E_PROJECT_NAME}; current=${String(project.name)}. Run Geometry and Texturing E2E first.`
  );

  const animationA = await createAnimation(
    client,
    AUTHORING_E2E_ANIMATION_A_NAME,
    20
  );
  const animationB = await createAnimation(
    client,
    AUTHORING_E2E_ANIMATION_B_NAME,
    -10
  );

  const selectedAfterCreate = await inspectAnimation(client);
  expect(
    selectedAnimationUuid(selectedAfterCreate) === animationB,
    "Creating Animation B did not leave B selected; cannot prove A-vs-B targeting fixture."
  );
  const bBefore = await inspectAnimation(client, animationB, true);
  const bBeforeFingerprint = stableAnimationFingerprint(bBefore);

  const propertyReceipt = structuredObject(
    await client.callTool(
      "manage_animation_timeline",
      {
        operation: "timeline",
        animation_id: animationA,
        action: "set_anim_time_update",
        molang: "query.anim_time",
      },
      "mutation"
    ),
    "manage_animation_timeline"
  );
  const propertyAnimation = (propertyReceipt.animation ?? {}) as JsonObject;
  expect(
    propertyAnimation.uuid === animationA,
    `Persistent property receipt targeted ${String(propertyAnimation.uuid)} instead of Animation A.`
  );
  const aAfterProperty = await inspectAnimation(client, animationA, true);
  expect(
    typeof animationSummary(aAfterProperty).anim_time_update === "string" &&
      String(animationSummary(aAfterProperty).anim_time_update).includes("query.anim_time"),
    "Animation A persistent property did not change."
  );
  expect(
    selectedAnimationUuid(await inspectAnimation(client)) === animationB,
    "Persistent property edit on explicit Animation A changed selected Animation B."
  );
  expect(
    stableAnimationFingerprint(await inspectAnimation(client, animationB, true)) ===
      bBeforeFingerprint,
    "Persistent property edit on Animation A mutated Animation B."
  );

  await exactUndo(client);
  expect(
    animationSummary(await inspectAnimation(client, animationA)).anim_time_update === null,
    "Undo did not restore Animation A persistent property."
  );
  expect(
    selectedAnimationUuid(await inspectAnimation(client)) === animationB,
    "Undo of Animation A property edit changed selected Animation B."
  );
  await exactRedo(client);
  expect(
    typeof animationSummary(await inspectAnimation(client, animationA)).anim_time_update === "string",
    "Redo did not restore Animation A persistent property."
  );

  const setTime = structuredObject(
    await client.callTool(
      "manage_animation_timeline",
      {
        operation: "timeline",
        animation_id: animationA,
        action: "set_time",
        time: 0.5,
      },
      "mutation"
    ),
    "manage_animation_timeline"
  );
  expect(
    ((setTime.animation ?? {}) as JsonObject).uuid === animationA &&
      setTime.timeline_time === 0.5,
    `Explicit timeline set_time did not target A: ${JSON.stringify(setTime)}.`
  );
  expect(
    selectedAnimationUuid(await inspectAnimation(client)) === animationA,
    "Timeline set_time did not select explicit Animation A."
  );

  const play = structuredObject(
    await client.callTool(
      "manage_animation_timeline",
      {
        operation: "timeline",
        animation_id: animationA,
        action: "play",
      },
      "mutation"
    ),
    "manage_animation_timeline"
  );
  expect(
    ((play.animation ?? {}) as JsonObject).uuid === animationA,
    "Timeline play receipt did not target Animation A."
  );
  const pause = structuredObject(
    await client.callTool(
      "manage_animation_timeline",
      {
        operation: "timeline",
        animation_id: animationA,
        action: "pause",
      },
      "mutation"
    ),
    "manage_animation_timeline"
  );
  expect(
    ((pause.animation ?? {}) as JsonObject).uuid === animationA,
    "Timeline pause receipt did not target Animation A."
  );
  const stop = structuredObject(
    await client.callTool(
      "manage_animation_timeline",
      {
        operation: "timeline",
        animation_id: animationA,
        action: "stop",
      },
      "mutation"
    ),
    "manage_animation_timeline"
  );
  expect(
    ((stop.animation ?? {}) as JsonObject).uuid === animationA &&
      stop.timeline_time === 0,
    `Timeline stop did not reset explicit Animation A: ${JSON.stringify(stop)}.`
  );

  const beforeKeyEdit = await inspectAnimation(client, animationA, true);
  expect(
    JSON.stringify(rotationAt(beforeKeyEdit, 1)) === JSON.stringify([[0, 20, 0]]),
    `Unexpected Animation A keyframe before edit: ${JSON.stringify(rotationAt(beforeKeyEdit, 1))}.`
  );
  const keyReceipt = structuredObject(
    await client.callTool(
      "manage_animation_timeline",
      {
        operation: "keyframes",
        animation_id: animationA,
        action: "edit",
        bone_name: AUTHORING_E2E_BONE_NAME,
        channel: "rotation",
        keyframes: [{ time: 1, values: [0, 30, 0] }],
      },
      "mutation"
    ),
    "manage_animation_timeline"
  );
  expect(
    ((keyReceipt.animation ?? {}) as JsonObject).uuid === animationA &&
      keyReceipt.affected_count === 1,
    `Keyframe edit receipt did not target one key on Animation A: ${JSON.stringify(keyReceipt)}.`
  );
  expect(
    JSON.stringify(rotationAt(await inspectAnimation(client, animationA, true), 1)) ===
      JSON.stringify([[0, 30, 0]]),
    "Animation A keyframe edit did not read back exactly."
  );
  expect(
    stableAnimationFingerprint(await inspectAnimation(client, animationB, true)) ===
      bBeforeFingerprint,
    "Animation A keyframe edit mutated Animation B."
  );

  await exactUndo(client);
  expect(
    JSON.stringify(rotationAt(await inspectAnimation(client, animationA, true), 1)) ===
      JSON.stringify([[0, 20, 0]]),
    "Undo did not restore Animation A keyframe."
  );
  await exactRedo(client);
  expect(
    JSON.stringify(rotationAt(await inspectAnimation(client, animationA, true), 1)) ===
      JSON.stringify([[0, 30, 0]]),
    "Redo did not restore Animation A keyframe edit."
  );
  expect(
    stableAnimationFingerprint(await inspectAnimation(client, animationB, true)) ===
      bBeforeFingerprint,
    "Animation B changed during A-targeted timeline/keyframe/Undo/Redo proof."
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        proof: "live_animation_e2e",
        profile: "bedrock_entity",
        phase: "animation",
        build_identity: environment.buildIdentity,
        project: AUTHORING_E2E_PROJECT_NAME,
        animation_a: animationA,
        animation_b: animationB,
        explicit_property_target_a_while_b_selected: true,
        property_undo_redo: true,
        timeline_set_time_selected_a: true,
        playback_start_pause_stop_targeted_a: true,
        keyframe_edit_targeted_a: true,
        keyframe_undo_redo: true,
        animation_b_unchanged: true,
        current_public_animation_surface: "manage_animation_timeline",
        cost: client.snapshotMetrics(),
        visual_quality: "not_evaluated",
        next: "Run verify:persistence-live -- --prepare --confirm-disposable, reopen the exported disposable .bbmodel in Blockbench, then run the same verifier with --verify.",
        note: "Proves explicit A-vs-selected-B targeting, native playback controls, persistent property and keyframe Undo/Redo through the current consolidated public surface. It does not prove motion aesthetics or user approval.",
      },
      null,
      2
    )
  );
}

if (import.meta.main) {
  await main();
}