export type PbrChannelAssignment = {
  channel: string;
  texture?: Pick<Texture, "uuid" | "name">;
};

export function hasExactTextureGroupNameCollision(
  groups: readonly { name: string }[],
  requestedName: string
): boolean {
  return groups.some((group) => group.name === requestedName);
}

export function isMinecraftTextureSetDocument(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const root = (value as Record<string, unknown>)["minecraft:texture_set"];
  return Boolean(root && typeof root === "object" && !Array.isArray(root));
}

export function importedTextureGroupName(filePath: string): string {
  const fileName = filePath.split(/[\/\\]/).pop() ?? filePath;
  return fileName.replace(/\.texture_set\.json$/, ".png material");
}

export function requireMaterialConfigSavePostcondition(
  saved: boolean,
  fileExists: boolean,
  filePath: string
): void {
  if (saved && fileExists) return;

  throw new Error(
    `Material config save was not confirmed at "${filePath}". Ensure the color texture has a writable existing directory, then retry.`
  );
}

export function requireDistinctPbrChannelAssignments<
  TAssignment extends PbrChannelAssignment
>(
  assignments: readonly TAssignment[]
): void {
  const channelByTexture = new Map<string, string>();

  for (const { channel, texture } of assignments) {
    if (!texture) continue;

    const previousChannel = channelByTexture.get(texture.uuid);
    if (previousChannel && previousChannel !== channel) {
      throw new Error(
        `Texture "${texture.name}" (${texture.uuid}) cannot be assigned to both ${previousChannel} and ${channel} in one material operation. A Texture has one pbr_channel; use distinct textures per channel.`
      );
    }

    channelByTexture.set(texture.uuid, channel);
  }
}
