export type SemanticHistoryScope =
  | "GEOMETRY_STRUCTURE"
  | "UV_MAPPING"
  | "TEXTURE_APPEARANCE"
  | "MATERIAL_RENDER"
  | "ANIMATION_MOTION"
  | "ANIMATION_CONTROLLER"
  | "ANIMATION_EFFECTS"
  | "PARTICLE_SYSTEM";

export type SemanticHistoryEffect = {
  stale: SemanticHistoryScope[];
};

const effects = new WeakMap<object, SemanticHistoryEffect>();

function normalizedScopes(
  scopes: readonly SemanticHistoryScope[]
): SemanticHistoryScope[] {
  return [...new Set(scopes)].sort((a, b) => a.localeCompare(b));
}

export function recordSemanticHistoryEffect(
  entry: object | null | undefined,
  scopes: readonly SemanticHistoryScope[]
): void {
  if (!entry || scopes.length === 0) return;
  effects.set(entry, { stale: normalizedScopes(scopes) });
}

export function semanticHistoryEffectForEntry(
  entry: object | null | undefined
): SemanticHistoryEffect | null {
  return entry ? effects.get(entry) ?? null : null;
}

export function mergeSemanticHistoryEffects(
  entries: readonly (object | null | undefined)[]
): SemanticHistoryEffect | null {
  const resolved = entries.map(semanticHistoryEffectForEntry);
  if (resolved.some((effect) => effect === null)) return null;
  return {
    stale: normalizedScopes(
      resolved.flatMap((effect) => effect?.stale ?? [])
    ),
  };
}
