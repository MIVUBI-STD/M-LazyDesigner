/// <reference types="blockbench-types" />

import { getAllToolDefinitions } from "@/lib/factories";
import {
  planExclusivePbrMaterialAssignment,
  planPbrMaterialConfiguration,
  requireExclusivePbrMaterialState,
  type PbrMaterialChannel,
  type PbrMaterialChannelRequest,
  type PbrMaterialTextureState,
} from "@/lib/pbrMaterialMembership";
import {
  analyzeTextureProductionAlignment,
  type TextureProductionAlignmentInput,
  type TextureProductionAlignmentRole,
} from "@/lib/textureProductionAlignment";
import { resolveCoreTexture } from "@/lib/coreIdentity";

type RuntimeToolDefinition = {
  execute: (
    args: Record<string, unknown>,
    context?: unknown
  ) => Promise<unknown>;
};

type MaterialConfigLike = {
  color_value?: unknown;
  mer_value?: unknown;
  subsurface_value?: unknown;
  saved: boolean;
};

let wired = false;

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function runtimeDefinition(name: string): RuntimeToolDefinition {
  const definition = getAllToolDefinitions()[name] as RuntimeToolDefinition | undefined;
  if (!definition) throw new Error(`Texture quality wiring requires ${name}.`);
  return definition;
}

function resolvePbrMaterial(reference: unknown): TextureGroup {
  if (typeof reference !== "string" || !reference) {
    throw new Error("PBR material operation requires an explicit material UUID or unique exact name.");
  }
  const groups = TextureGroup.all ?? [];
  const uuid = groups.find((group: TextureGroup) => group.uuid === reference);
  const matches = uuid
    ? [uuid]
    : groups.filter((group: TextureGroup) => group.name === reference);
  if (matches.length !== 1) {
    throw new Error(
      matches.length === 0
        ? `Material "${reference}" was not found.`
        : `Material name "${reference}" is ambiguous; pass its UUID.`
    );
  }
  if (matches[0].is_material !== true) {
    throw new Error(`TextureGroup "${matches[0].name}" is not a PBR material.`);
  }
  return matches[0];
}

function textureStates(): PbrMaterialTextureState[] {
  return (Project?.textures ?? Texture.all).map((texture: Texture) => ({
    uuid: texture.uuid,
    group: texture.group || "",
    pbr_channel: texture.pbr_channel || "color",
  }));
}

function textureByUuid(uuid: string): Texture {
  const texture = (Project?.textures ?? Texture.all).find(
    (candidate: Texture) => candidate.uuid === uuid
  );
  if (!texture) throw new Error(`Texture ${uuid} disappeared after material preflight.`);
  return texture;
}

function materialGroupsByUuid(uuids: readonly string[]): TextureGroup[] {
  const ids = new Set(uuids.filter(Boolean));
  return (TextureGroup.all ?? []).filter(
    (group: TextureGroup) => ids.has(group.uuid) && group.is_material === true
  );
}

function sameNumberArray(current: unknown, next: unknown): boolean {
  if (!Array.isArray(current) || !Array.isArray(next)) return false;
  return (
    current.length === next.length &&
    current.every((value, index) => value === next[index])
  );
}

function applyMembershipChanges(
  changes: readonly { uuid: string; group: string; pbr_channel: string }[]
): Texture[] {
  return changes.map((change) => {
    const texture = textureByUuid(change.uuid);
    texture.group = change.group;
    texture.pbr_channel = change.pbr_channel as Texture["pbr_channel"];
    return texture;
  });
}

function refreshAffectedMaterialGroups(groups: readonly TextureGroup[]): void {
  for (const group of groups) {
    group.material_config.saved = false;
    group.updateMaterial();
  }
}

function requireAffectedMaterialIntegrity(
  groupUuids: readonly string[],
  context: string
): void {
  const states = textureStates();
  for (const group of materialGroupsByUuid(groupUuids)) {
    requireExclusivePbrMaterialState(states, group.uuid, `${context} "${group.name}"`);
  }
}

function channelTextureReference(
  args: Record<string, unknown>,
  field: string
): string | undefined | null {
  const value = args[field];
  if (value === undefined) return undefined;
  if (value === "none") return null;
  if (typeof value !== "string" || !value) {
    throw new Error(`${field} must be a texture reference, "none", or omitted.`);
  }
  return value;
}

function configureChannelRequests(
  args: Record<string, unknown>
): PbrMaterialChannelRequest[] {
  const fields = [
    ["color", "color_texture"],
    ["normal", "normal_texture"],
    ["height", "height_texture"],
    ["mer", "mer_texture"],
  ] as const;
  const requests: PbrMaterialChannelRequest[] = [];
  for (const [channel, field] of fields) {
    const reference = channelTextureReference(args, field);
    if (reference === undefined) continue;
    if (reference === null) {
      requests.push({ channel, texture_uuid: null });
      continue;
    }
    const texture = resolveCoreTexture(
      reference,
      `Use list_textures to resolve ${field} before configuring the material.`
    );
    requests.push({ channel, texture_uuid: texture.uuid });
  }
  return requests;
}

function requireUniformSourceSwitch(
  group: TextureGroup,
  args: Record<string, unknown>
): void {
  const textures = group.getTextures();
  if (
    Array.isArray(args.color_value) &&
    args.color_texture === undefined &&
    textures.some((texture: Texture) => (texture.pbr_channel || "color") === "color")
  ) {
    throw new Error(
      `Material "${group.name}" already has a color texture. Send color_texture="none" with color_value so the uniform value is not silently ignored.`
    );
  }
  if (
    Array.isArray(args.mer_value) &&
    args.mer_texture === undefined &&
    textures.some((texture: Texture) => texture.pbr_channel === "mer")
  ) {
    throw new Error(
      `Material "${group.name}" already has a MER texture. Send mer_texture="none" with mer_value so the uniform value is not silently ignored.`
    );
  }
}

function configChangeRequested(
  config: MaterialConfigLike,
  args: Record<string, unknown>
): boolean {
  if (
    Array.isArray(args.color_value) &&
    !sameNumberArray(config.color_value, args.color_value)
  ) return true;
  if (
    Array.isArray(args.mer_value) &&
    !sameNumberArray(config.mer_value, args.mer_value)
  ) return true;
  return (
    args.subsurface_value !== undefined &&
    config.subsurface_value !== args.subsurface_value
  );
}

function applyConfigValues(
  config: MaterialConfigLike,
  args: Record<string, unknown>
): void {
  if (Array.isArray(args.color_value)) {
    config.color_value = [...args.color_value];
  }
  if (Array.isArray(args.mer_value)) {
    config.mer_value = [...args.mer_value];
  }
  if (args.subsurface_value !== undefined) {
    config.subsurface_value = args.subsurface_value;
  }
}

async function configureMaterial(
  args: Record<string, unknown>
) {
  const group = resolvePbrMaterial(args.material);
  requireUniformSourceSwitch(group, args);
  const requests = configureChannelRequests(args);
  const plan = planPbrMaterialConfiguration(
    textureStates(),
    group.uuid,
    requests,
    `Material "${group.name}"`
  );
  const config = group.material_config as MaterialConfigLike;
  const configChanged = configChangeRequested(config, args);
  if (plan.changes.length === 0 && !configChanged) {
    throw new Error(`Material "${group.name}" already matches the requested configuration; no authored change is required.`);
  }

  const changedTextures = plan.changes.map((change) => textureByUuid(change.uuid));
  const affectedGroups = materialGroupsByUuid(plan.affected_group_uuids);
  Undo.initEdit({
    texture_groups: affectedGroups,
    textures: changedTextures,
  });
  try {
    applyMembershipChanges(plan.changes);
    applyConfigValues(config, args);
    refreshAffectedMaterialGroups(affectedGroups);
    requireAffectedMaterialIntegrity(
      plan.affected_group_uuids,
      "Configured material"
    );
    Undo.finishEdit("Agent configured material");
  } catch (error) {
    Undo.cancelEdit(true);
    Canvas.updateAll();
    throw error;
  }
  Canvas.updateAll();
  return `Configured material "${group.name}" with exclusive Bedrock PBR channel ownership.`;
}

async function assignMaterialChannel(
  args: Record<string, unknown>
) {
  const group = resolvePbrMaterial(args.material);
  const textureReference = args.texture;
  const channel = args.channel;
  if (typeof textureReference !== "string" || !textureReference) {
    throw new Error("assign_channel requires an explicit texture reference.");
  }
  if (
    channel !== "color" &&
    channel !== "normal" &&
    channel !== "height" &&
    channel !== "mer"
  ) {
    throw new Error("assign_channel requires color, normal, height, or mer.");
  }
  const texture = resolveCoreTexture(
    textureReference,
    "Use list_textures to resolve the intended channel texture."
  );
  const plan = planExclusivePbrMaterialAssignment(
    textureStates(),
    group.uuid,
    texture.uuid,
    channel as PbrMaterialChannel,
    `Material "${group.name}"`
  );
  if (plan.changes.length === 0) {
    throw new Error(
      `Texture "${texture.name}" is already the exclusive ${channel} assignment on material "${group.name}"; no authored change is required.`
    );
  }

  const changedTextures = plan.changes.map((change) => textureByUuid(change.uuid));
  const affectedGroups = materialGroupsByUuid(plan.affected_group_uuids);
  Undo.initEdit({
    texture_groups: affectedGroups,
    textures: changedTextures,
  });
  try {
    applyMembershipChanges(plan.changes);
    refreshAffectedMaterialGroups(affectedGroups);
    requireAffectedMaterialIntegrity(
      plan.affected_group_uuids,
      "Assigned material channel"
    );
    Undo.finishEdit("Agent assigned texture channel");
  } catch (error) {
    Undo.cancelEdit(true);
    Canvas.updateAll();
    throw error;
  }
  Canvas.updateAll();
  return `Assigned texture "${texture.name}" to ${channel} channel of material "${group.name}" with exclusive channel ownership.`;
}

function productionAlignmentRuntime() {
  const groups = TextureGroup.all ?? [];
  const inputs: TextureProductionAlignmentInput[] = (
    Project?.textures ?? Texture.all
  ).map((texture: Texture) => {
    const group = texture.group
      ? groups.find((candidate: TextureGroup) => candidate.uuid === texture.group)
      : undefined;
    const channel = texture.pbr_channel || "color";
    const role: TextureProductionAlignmentRole =
      channel !== "color"
        ? "pbr_support"
        : texture.group && group?.is_material === false
          ? "explicit_variant"
          : "base_color_candidate";
    return {
      uuid: texture.uuid,
      name: texture.name,
      role,
      pbr_channel: channel,
      group_uuid: texture.group || null,
      group_name: group?.name ?? null,
      group_is_material: group?.is_material ?? null,
      bitmap_width: texture.width,
      bitmap_height: texture.height,
      logical_uv_width: texture.getUVWidth(),
      logical_uv_height: texture.getUVHeight(),
    };
  });
  return analyzeTextureProductionAlignment(inputs);
}

/**
 * Closes technical texture-quality gaps without adding MCP tools or pixel scans.
 * - list_textures gains metadata-only variant/PBR production alignment.
 * - manage_material configure/assign_channel enforces exclusive Bedrock channels.
 */
export function wireTextureQualityRuntime(): void {
  if (wired) return;

  const listTextures = runtimeDefinition("list_textures");
  const originalList = listTextures.execute.bind(listTextures);
  listTextures.execute = async (args, context) => {
    const result = await originalList(args, context);
    if (args.diagnostics !== true) return result;
    const scope =
      typeof args.diagnostic_scope === "string"
        ? args.diagnostic_scope
        : "full";
    if (scope !== "pbr" && scope !== "full") return result;
    const record = objectRecord(result);
    const structured = record ? objectRecord(record.structuredContent) : null;
    if (!record || !structured) return result;
    return {
      ...record,
      structuredContent: {
        ...structured,
        production_alignment: productionAlignmentRuntime(),
      },
    };
  };

  const manageMaterial = runtimeDefinition("manage_material");
  const originalManage = manageMaterial.execute.bind(manageMaterial);
  manageMaterial.execute = async (args, context) => {
    if (args.operation === "configure") return configureMaterial(args);
    if (args.operation === "assign_channel") return assignMaterialChannel(args);
    if (args.operation === "save") resolvePbrMaterial(args.material);
    return originalManage(args, context);
  };

  wired = true;
}
