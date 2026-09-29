export type MaterialChannelTextureInput = {
  uuid: string;
  name: string;
  channel: string;
  width: number;
  height: number;
};

export type TextureMaterialStatusInput = {
  uuid: string;
  name: string;
  textures: readonly MaterialChannelTextureInput[];
  color_value?: readonly number[] | null;
  mer_value?: readonly number[] | null;
  subsurface_value?: number | null;
  saved: boolean;
  file_path?: string | null;
};

function textureSummary(texture: MaterialChannelTextureInput | undefined) {
  return texture
    ? {
        uuid: texture.uuid,
        name: texture.name,
        bitmap: [texture.width, texture.height] as [number, number],
      }
    : null;
}

function finiteByteArray(
  value: readonly number[] | null | undefined,
  length: number
) {
  return Boolean(
    value &&
      value.length === length &&
      value.every(
        (entry) => Number.isFinite(entry) && entry >= 0 && entry <= 255
      )
  );
}

export function analyzeTextureMaterialStatus(input: TextureMaterialStatusInput) {
  const byChannel = new Map<string, MaterialChannelTextureInput[]>();
  for (const texture of input.textures) {
    const group = byChannel.get(texture.channel) ?? [];
    group.push(texture);
    byChannel.set(texture.channel, group);
  }

  const color = byChannel.get("color") ?? [];
  const normal = byChannel.get("normal") ?? [];
  const height = byChannel.get("height") ?? [];
  const mer = byChannel.get("mer") ?? [];
  const unknown = [...byChannel.keys()].filter(
    (channel) => !["color", "normal", "height", "mer"].includes(channel)
  );
  const subsurface = Number(input.subsurface_value ?? 0);
  const hasSubsurface = Number.isFinite(subsurface) && subsurface > 0;

  const reasons: string[] = [];
  if ([color, normal, height, mer].some((items) => items.length > 1)) {
    reasons.push("DUPLICATE_MATERIAL_CHANNEL");
  }
  if (normal.length > 0 && height.length > 0) {
    reasons.push("NORMAL_HEIGHT_CONFLICT");
  }
  if (unknown.length > 0) reasons.push("UNKNOWN_MATERIAL_CHANNEL");

  const colorMode =
    color.length > 0
      ? ("texture" as const)
      : finiteByteArray(input.color_value, 4)
        ? ("uniform" as const)
        : ("unresolved" as const);
  if (colorMode === "unresolved") reasons.push("COLOR_SOURCE_UNRESOLVED");

  const depthMode =
    normal.length > 0
      ? ("normal_texture" as const)
      : height.length > 0
        ? ("height_texture" as const)
        : ("none" as const);

  const surfaceMode =
    mer.length > 0
      ? hasSubsurface
        ? ("mers_texture" as const)
        : ("mer_texture" as const)
      : hasSubsurface
        ? ("mers_uniform" as const)
        : finiteByteArray(input.mer_value, 3) &&
            input.mer_value!.some((value) => value !== 0)
          ? ("mer_uniform" as const)
          : ("default" as const);

  const path = typeof input.file_path === "string" ? input.file_path : "";
  const pathReady = path.length > 0;
  const previewReady = reasons.length === 0;
  const saveReady = previewReady && pathReady;

  const nextActions: string[] = [];
  if (reasons.length > 0) nextActions.push("resolve_channel_conflicts");
  if (!pathReady) nextActions.push("establish_color_texture_file_path");
  if (previewReady) nextActions.push("material_preview");
  if (saveReady && !input.saved) nextActions.push("save_material_config");

  return {
    domain: "pbr_texture_set" as const,
    identity: { uuid: input.uuid, name: input.name },
    sources: {
      color: {
        mode: colorMode,
        texture: textureSummary(color[0]),
        uniform: colorMode === "uniform" ? [...(input.color_value ?? [])] : null,
      },
      depth: {
        mode: depthMode,
        texture: textureSummary(normal[0] ?? height[0]),
      },
      surface: {
        mode: surfaceMode,
        texture: textureSummary(mer[0]),
        mer_uniform:
          surfaceMode === "mer_uniform" || surfaceMode === "mers_uniform"
            ? [...(input.mer_value ?? [])]
            : null,
        subsurface_value: hasSubsurface ? subsurface : 0,
        alpha_carries_subsurface: surfaceMode === "mers_texture",
      },
    },
    readiness: {
      preview: {
        state: previewReady ? ("ready" as const) : ("review_required" as const),
        reasons,
      },
      save: {
        state: !pathReady
          ? ("path_unavailable" as const)
          : saveReady
            ? input.saved
              ? ("saved" as const)
              : ("pending" as const)
            : ("review_required" as const),
        path_ready: pathReady,
        file_path: path || null,
        saved: input.saved,
      },
    },
    next_actions: nextActions,
    note:
      "PBR Texture Set status is separate from Minecraft entity render_profile and geometry_material_instance. Preview validity and save-target readiness are distinct. MER texture + subsurface_value>0 is MERS: RGB stays metalness/emissive/roughness and alpha carries subsurface.",
  };
}
