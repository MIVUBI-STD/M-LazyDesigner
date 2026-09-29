import { getChannelTextureInfo } from "@/lib/util";

export function resolveTextureToolMaterial(reference: string): TextureGroup {
  const uuidMatch = TextureGroup.all.find(
    (group: TextureGroup) => group.uuid === reference
  );
  if (uuidMatch) return uuidMatch;

  const nameMatches = TextureGroup.all.filter(
    (group: TextureGroup) => group.name === reference
  );
  if (nameMatches.length === 1) return nameMatches[0];
  if (nameMatches.length > 1) {
    throw new Error(
      `Material/texture group name "${reference}" is ambiguous. Use an exact UUID. Candidates: ${nameMatches
        .map((group: TextureGroup) => `${group.name} (uuid: ${group.uuid})`)
        .join(", ")}`
    );
  }

  throw new Error(
    `Material/texture group "${reference}" not found. Use the list_materials tool to confirm the intended UUID or unique name.`
  );
}

export function resolvePbrMaterial(reference: string): TextureGroup {
  const group = resolveTextureToolMaterial(reference);
  if (group.is_material !== true) {
    throw new Error(
      `TextureGroup "${group.name}" is not a PBR material.`
    );
  }
  return group;
}

export function materialContinuationState(group: TextureGroup) {
  const textures = group.getTextures();
  return {
    name: group.name,
    uuid: group.uuid,
    is_material: group.is_material,
    channels: {
      color: getChannelTextureInfo(textures, "color"),
      normal: getChannelTextureInfo(textures, "normal"),
      height: getChannelTextureInfo(textures, "height"),
      mer: getChannelTextureInfo(textures, "mer"),
    },
    config: {
      color_value: group.material_config.color_value,
      mer_value: group.material_config.mer_value,
      subsurface_value: group.material_config.subsurface_value,
      saved: group.material_config.saved,
    },
  };
}

export type RuntimePbrTextureState = {
  uuid: string;
  group: string;
  pbr_channel: string;
};

export function runtimePbrTextureStates(): RuntimePbrTextureState[] {
  return (Project?.textures ?? Texture.all).map((texture: Texture) => ({
    uuid: texture.uuid,
    group: texture.group || "",
    pbr_channel: texture.pbr_channel || "color",
  }));
}

export function resolveRuntimeTextureByUuid(uuid: string): Texture {
  const texture = (Project?.textures ?? Texture.all).find(
    (candidate: Texture) => candidate.uuid === uuid
  );
  if (!texture) {
    throw new Error(`Texture ${uuid} disappeared after material preflight.`);
  }
  return texture;
}

export function materialGroupsByUuid(
  uuids: readonly string[]
): TextureGroup[] {
  const ids = new Set(uuids.filter(Boolean));
  return (TextureGroup.all ?? []).filter(
    (group: TextureGroup) =>
      ids.has(group.uuid) && group.is_material === true
  );
}

export function applyPbrMembershipChanges(
  changes: readonly {
    uuid: string;
    group: string;
    pbr_channel: string;
  }[]
): Texture[] {
  return changes.map((change) => {
    const texture = resolveRuntimeTextureByUuid(change.uuid);
    texture.group = change.group;
    texture.pbr_channel = change.pbr_channel as Texture["pbr_channel"];
    return texture;
  });
}
