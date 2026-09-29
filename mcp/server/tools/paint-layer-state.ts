export type ManagedTextureLayer = TextureLayer & {
  width: number;
  height: number;
  offset?: [number, number];
  parent_uuid?: string;
};

export type LayerMetadataBatchUpdate = {
  layer_id: string;
  name?: string;
  opacity?: number;
  blend_mode?: string;
  target_index?: number;
};

export function resolveManagedTextureLayer(
  texture: Texture,
  reference: string
): ManagedTextureLayer {
  const layers = (texture.layers ?? []).filter(
    (layer): layer is ManagedTextureLayer => layer instanceof TextureLayer
  );
  const uuidMatch = layers.find((layer) => layer.uuid === reference);
  if (uuidMatch) return uuidMatch;

  const nameMatches = layers.filter((layer) => layer.name === reference);
  if (nameMatches.length === 1) return nameMatches[0];
  if (nameMatches.length > 1) {
    throw new Error(
      `Texture layer name "${reference}" is ambiguous inside texture "${texture.name}". Pass the exact layer UUID.`
    );
  }
  throw new Error(
    `Texture layer "${reference}" was not found inside texture "${texture.name}".`
  );
}

export function layerContinuationState(
  texture: Texture,
  layer: ManagedTextureLayer
) {
  return {
    uuid: layer.uuid,
    name: layer.name,
    index: texture.layers.indexOf(layer),
    opacity: layer.opacity,
    blend_mode: layer.blend_mode,
    width: layer.width,
    height: layer.height,
    offset: Array.isArray(layer.offset) ? [...layer.offset] : null,
    parent_uuid: layer.parent_uuid || null,
  };
}

export function textureLayerContinuationState(texture: Texture) {
  return {
    uuid: texture.uuid,
    name: texture.name,
    layers_enabled: texture.layers_enabled === true,
    layer_count: texture.layers.length,
    selected_layer_uuid: texture.selected_layer?.uuid ?? null,
  };
}

function requireDistinctBatchLayerTargets(
  updates: readonly LayerMetadataBatchUpdate[]
): void {
  const seen = new Set<string>();
  for (const update of updates) {
    if (seen.has(update.layer_id)) {
      throw new Error(
        `batch_metadata contains duplicate layer target "${update.layer_id}". Combine metadata for one layer into one update.`
      );
    }
    seen.add(update.layer_id);
  }
}

export function preflightLayerMetadataBatch<
  TUpdate extends LayerMetadataBatchUpdate
>(
  texture: Texture,
  updates: readonly TUpdate[]
) {
  requireDistinctBatchLayerTargets(updates);
  const resolved = updates.map((update) => ({
    update,
    layer: resolveManagedTextureLayer(texture, update.layer_id),
  }));

  for (const { update, layer } of resolved) {
    if (
      update.target_index !== undefined &&
      update.target_index >= texture.layers.length
    ) {
      throw new Error(
        `Target index ${update.target_index} is out of range for ${texture.layers.length} layers.`
      );
    }
    if (
      update.name === layer.name &&
      update.opacity === undefined &&
      update.blend_mode === undefined &&
      update.target_index === undefined
    ) {
      throw new Error(
        `Layer "${layer.name}" already has the requested name and no other metadata change was supplied.`
      );
    }
  }

  const finalNames = new Map(
    texture.layers.map((layer) => [layer.uuid, layer.name] as const)
  );
  for (const { update, layer } of resolved) {
    if (update.name !== undefined) finalNames.set(layer.uuid, update.name);
  }

  const nameOwners = new Map<string, string>();
  for (const [uuid, name] of finalNames) {
    const key = name.toLowerCase();
    const previous = nameOwners.get(key);
    if (previous && previous !== uuid) {
      throw new Error(
        `batch_metadata would create duplicate layer name "${name}" (case-insensitive).`
      );
    }
    nameOwners.set(key, uuid);
  }

  const previous = resolved.map(({ layer }) => ({
    layer_uuid: layer.uuid,
    state: layerContinuationState(texture, layer),
  }));

  const anyChange = resolved.some(
    ({ update, layer }) =>
      (update.name !== undefined && update.name !== layer.name) ||
      (update.opacity !== undefined && update.opacity !== layer.opacity) ||
      (update.blend_mode !== undefined &&
        update.blend_mode !== layer.blend_mode) ||
      (update.target_index !== undefined &&
        update.target_index !== texture.layers.indexOf(layer))
  );
  if (!anyChange) {
    throw new Error(
      "batch_metadata already matches the requested final layer metadata; no authored change is required."
    );
  }

  const visualChange = resolved.some(
    ({ update, layer }) =>
      (update.opacity !== undefined && update.opacity !== layer.opacity) ||
      (update.blend_mode !== undefined &&
        update.blend_mode !== layer.blend_mode) ||
      (update.target_index !== undefined &&
        update.target_index !== texture.layers.indexOf(layer))
  );
  const orderChange = resolved.some(
    ({ update, layer }) =>
      update.target_index !== undefined &&
      update.target_index !== texture.layers.indexOf(layer)
  );

  return { resolved, previous, visualChange, orderChange };
}
