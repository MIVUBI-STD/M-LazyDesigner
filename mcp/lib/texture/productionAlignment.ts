export const TEXTURE_PRODUCTION_ALIGNMENT_EXAMPLE_LIMIT = 6;

export type TextureProductionAlignmentRole =
  | "base_color_candidate"
  | "explicit_variant"
  | "pbr_support";

export type TextureProductionAlignmentInput = {
  uuid: string;
  name: string;
  role: TextureProductionAlignmentRole;
  pbr_channel: string;
  group_uuid: string | null;
  group_name: string | null;
  group_is_material: boolean | null;
  bitmap_width: number;
  bitmap_height: number;
  logical_uv_width: number;
  logical_uv_height: number;
};

const PBR_CHANNELS = new Set(["color", "normal", "height", "mer"]);

function textureSummary(input: TextureProductionAlignmentInput) {
  return {
    uuid: input.uuid,
    name: input.name,
    pbr_channel: input.pbr_channel,
    group_uuid: input.group_uuid,
    group_name: input.group_name,
    bitmap: [input.bitmap_width, input.bitmap_height],
    logical_uv: [input.logical_uv_width, input.logical_uv_height],
  };
}

function bounded<T>(values: readonly T[], limit: number) {
  return {
    examples: values.slice(0, limit),
    examples_truncated: values.length > limit,
  };
}

function alignmentDifferences(
  base: TextureProductionAlignmentInput,
  dependent: TextureProductionAlignmentInput
): string[] {
  const differences: string[] = [];
  if (
    base.bitmap_width !== dependent.bitmap_width ||
    base.bitmap_height !== dependent.bitmap_height
  ) {
    differences.push("bitmap_dimensions");
  }
  if (
    base.logical_uv_width !== dependent.logical_uv_width ||
    base.logical_uv_height !== dependent.logical_uv_height
  ) {
    differences.push("logical_uv_dimensions");
  }
  return differences;
}

export function analyzeTextureProductionAlignment(
  textures: readonly TextureProductionAlignmentInput[],
  exampleLimit = TEXTURE_PRODUCTION_ALIGNMENT_EXAMPLE_LIMIT
) {
  const bases = textures.filter(
    (texture) => texture.role === "base_color_candidate"
  );
  const variants = textures.filter(
    (texture) => texture.role === "explicit_variant"
  );
  const supports = textures.filter(
    (texture) => texture.role === "pbr_support"
  );
  const activeSupports = supports.filter(
    (texture) => texture.group_uuid && texture.group_is_material === true
  );
  const detachedSupports = supports.filter((texture) => !texture.group_uuid);
  const invalidGroupedSupports = supports.filter(
    (texture) =>
      texture.group_uuid !== null && texture.group_is_material !== true
  );
  const base = bases.length === 1 ? bases[0] : null;

  const variantMismatches = base
    ? variants
        .map((texture) => ({
          texture,
          differences: alignmentDifferences(base, texture),
        }))
        .filter((entry) => entry.differences.length > 0)
    : [];
  const pbrMismatches = base
    ? activeSupports
        .map((texture) => ({
          texture,
          differences: alignmentDifferences(base, texture),
        }))
        .filter((entry) => entry.differences.length > 0)
    : [];

  const materialGroups = new Map<
    string,
    {
      name: string | null;
      textures: TextureProductionAlignmentInput[];
    }
  >();
  for (const texture of textures) {
    if (!texture.group_uuid || texture.group_is_material !== true) continue;
    const entry = materialGroups.get(texture.group_uuid) ?? {
      name: texture.group_name,
      textures: [],
    };
    entry.textures.push(texture);
    materialGroups.set(texture.group_uuid, entry);
  }

  const channelConflicts: Array<{
    group_uuid: string;
    group_name: string | null;
    duplicate_channels: string[];
    normal_height_conflict: boolean;
  }> = [];
  const unknownChannels: Array<ReturnType<typeof textureSummary>> = [];

  for (const [groupUuid, group] of materialGroups) {
    const counts = new Map<string, number>();
    for (const texture of group.textures) {
      counts.set(
        texture.pbr_channel,
        (counts.get(texture.pbr_channel) ?? 0) + 1
      );
      if (!PBR_CHANNELS.has(texture.pbr_channel)) {
        unknownChannels.push(textureSummary(texture));
      }
    }
    const duplicateChannels = [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([channel]) => channel)
      .sort();
    const normalHeightConflict =
      (counts.get("normal") ?? 0) > 0 &&
      (counts.get("height") ?? 0) > 0;
    if (duplicateChannels.length > 0 || normalHeightConflict) {
      channelConflicts.push({
        group_uuid: groupUuid,
        group_name: group.name,
        duplicate_channels: duplicateChannels,
        normal_height_conflict: normalHeightConflict,
      });
    }
  }

  const reasons: string[] = [];
  const hasDependents =
    variants.length > 0 ||
    activeSupports.length > 0 ||
    invalidGroupedSupports.length > 0;
  if (hasDependents && bases.length !== 1) {
    reasons.push("DEPENDENT_BASE_ATLAS_UNRESOLVED");
  }
  if (variantMismatches.length > 0) {
    reasons.push("VARIANT_ALIGNMENT_MISMATCH");
  }
  if (pbrMismatches.length > 0) {
    reasons.push("PBR_ALIGNMENT_MISMATCH");
  }
  if (invalidGroupedSupports.length > 0) {
    reasons.push("PBR_SUPPORT_GROUP_INVALID");
  }
  if (channelConflicts.length > 0) {
    reasons.push("PBR_MATERIAL_CHANNEL_CONFLICT");
  }
  if (unknownChannels.length > 0) {
    reasons.push("UNKNOWN_PBR_CHANNEL");
  }

  const applicable =
    hasDependents ||
    channelConflicts.length > 0 ||
    unknownChannels.length > 0;

  const variantExamples = bounded(
    variantMismatches.map(({ texture, differences }) => ({
      ...textureSummary(texture),
      differences,
    })),
    exampleLimit
  );
  const pbrExamples = bounded(
    pbrMismatches.map(({ texture, differences }) => ({
      ...textureSummary(texture),
      differences,
    })),
    exampleLimit
  );
  const invalidSupportExamples = bounded(
    invalidGroupedSupports.map(textureSummary),
    exampleLimit
  );
  const conflictExamples = bounded(channelConflicts, exampleLimit);
  const unknownExamples = bounded(unknownChannels, exampleLimit);

  return {
    base_atlas_count: bases.length,
    base_atlas: base ? textureSummary(base) : null,
    variants: {
      count: variants.length,
      mismatch_count: variantMismatches.length,
      ...variantExamples,
    },
    pbr: {
      active_support_count: activeSupports.length,
      detached_support_count: detachedSupports.length,
      invalid_group_count: invalidGroupedSupports.length,
      alignment_mismatch_count: pbrMismatches.length,
      channel_conflict_count: channelConflicts.length,
      unknown_channel_count: unknownChannels.length,
      alignment_examples: pbrExamples.examples,
      alignment_examples_truncated: pbrExamples.examples_truncated,
      invalid_group_examples: invalidSupportExamples.examples,
      invalid_group_examples_truncated:
        invalidSupportExamples.examples_truncated,
      conflict_examples: conflictExamples.examples,
      conflict_examples_truncated: conflictExamples.examples_truncated,
      unknown_channel_examples: unknownExamples.examples,
      unknown_channel_examples_truncated: unknownExamples.examples_truncated,
    },
    gate: {
      state: !applicable
        ? ("not_applicable" as const)
        : reasons.length === 0
          ? ("ready" as const)
          : ("review_required" as const),
      reasons,
    },
    efficiency: {
      metadata_only: true,
      extra_pixel_scan: false,
    },
    note:
      "Production alignment is a technical consistency gate, not a visual score. Detached unused PBR support textures are advisory inventory only; active variants/PBR must preserve the production atlas mapping and exclusive channel semantics.",
  };
}
