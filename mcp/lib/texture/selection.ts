/// <reference types="blockbench-types" />

import { resolveCoreTexture } from "@/lib/core/identity";

export function resolvePaintTexture(id?: string): Texture {
  if (!id) {
    const available = Project?.textures ?? Texture.all;
    if (available.length > 1) {
      const baseCandidates = available.filter((texture: Texture) => {
        const channel =
          (texture as Texture & { pbr_channel?: string }).pbr_channel ?? "color";
        if (channel !== "color") return false;
        const groupId = (texture as Texture & { group?: string }).group;
        if (!groupId) return true;
        const group = (
          globalThis as unknown as {
            TextureGroup?: {
              all: Array<{ uuid: string; is_material?: boolean }>;
            };
          }
        ).TextureGroup?.all.find((candidate) => candidate.uuid === groupId);
        return !group || group.is_material !== false;
      });
      if (baseCandidates.length === 1) return baseCandidates[0];
      throw new Error(
        "Multiple textures are loaded. Pass texture_id explicitly so painting targets the intended base-color atlas or support channel instead of implicit selected/default state."
      );
    }

    const active = Texture.selected ?? Texture.getDefault();
    if (!active) {
      throw new Error(
        "No texture available. Use create_texture first, or pass texture_id explicitly."
      );
    }
    return active;
  }

  return resolveCoreTexture(
    id,
    "Use list_textures to confirm the intended UUID or texture ID before painting."
  );
}

export function getAndActivateTexture(id?: string): Texture {
  const texture = resolvePaintTexture(id);
  if (Texture.selected?.uuid !== texture.uuid) texture.select();
  return texture;
}

export function getChannelTextureInfo(textures: Texture[], channel: string) {
  const tex = textures.find((t: Texture) => t.pbr_channel === channel);
  return tex ? { name: tex.name, uuid: tex.uuid } : null;
}
