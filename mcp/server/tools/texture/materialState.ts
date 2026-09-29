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

