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
  workspace_projection: boolean;
  acceptance_gates: boolean;
};

export type SemanticHistoryEffectOptions = {
  workspace_projection?: boolean;
  acceptance_gates?: boolean;
};

const effects = new WeakMap<object, SemanticHistoryEffect>();

function normalizedScopes(
  scopes: readonly SemanticHistoryScope[]
): SemanticHistoryScope[] {
  return [...new Set(scopes)].sort((a, b) => a.localeCompare(b));
}

export function recordSemanticHistoryEffect(
  entry: object | null | undefined,
  scopes: readonly SemanticHistoryScope[],
  options: SemanticHistoryEffectOptions = {}
): void {
  if (!entry) return;
  effects.set(entry, {
    stale: normalizedScopes(scopes),
    workspace_projection: options.workspace_projection ?? scopes.length > 0,
    acceptance_gates: options.acceptance_gates ?? scopes.length > 0,
  });
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
    workspace_projection: resolved.some(
      (effect) => effect?.workspace_projection === true
    ),
    acceptance_gates: resolved.some(
      (effect) => effect?.acceptance_gates === true
    ),
  };
}

export function recordCurrentSemanticHistoryEffect(
  scopes: readonly SemanticHistoryScope[],
  options: SemanticHistoryEffectOptions = {}
): void {
  if (typeof Undo === "undefined") return;
  const history = Undo.history ?? [];
  const index = (Undo.index ?? 0) - 1;
  if (index < 0) return;
  recordSemanticHistoryEffect(
    history[index] as object | undefined,
    scopes,
    options
  );
}
