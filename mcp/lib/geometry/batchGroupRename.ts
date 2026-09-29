type NamedGroup = {uuid: string; name: string};
type AnimatorReference = {uuid?: string; name?: string};
export type RenameAnimation = {
  animators?: Record<string, AnimatorReference>;
  groups?: Record<string, unknown>;
  saved?: boolean;
};

/** Resolve the complete final namespace before touching groups or animation maps. */
export function planGroupRename(
  groups: NamedGroup[],
  updates: Array<{id: string; new_name: string}>,
  animations: RenameAnimation[],
) {
  const requested = new Map(updates.map(update => [update.id, update.new_name]));
  if (requested.size !== updates.length) throw new Error("Duplicate Group UUID in rename batch.");
  for (const [id, name] of requested) {
    if (!name.trim()) throw new Error("Group names must not be blank.");
    if (!groups.some(group => group.uuid === id)) throw new Error(`Group UUID "${id}" not found.`);
  }
  const finalNames = new Set<string>();
  for (const group of groups) {
    const name = (requested.get(group.uuid) ?? group.name).toLowerCase();
    if (finalNames.has(name)) throw new Error(`Final Group name "${name}" is ambiguous.`);
    finalNames.add(name);
  }
  const rows = groups.filter(group => requested.has(group.uuid) && requested.get(group.uuid) !== group.name)
    .map(group => ({group, old_name: group.name, new_name: requested.get(group.uuid)!}));
  const byId = new Map(rows.map(row => [row.group.uuid, row]));
  const byName = new Map(rows.map(row => [row.old_name, row]));
  // Name-backed legacy maps cannot disambiguate a pre-existing duplicate name.
  for (const row of rows) {
    if (groups.filter(group => group.name.toLowerCase() === row.old_name.toLowerCase()).length > 1) {
      throw new Error(`Existing Group name "${row.old_name}" is ambiguous; animation references cannot be safely renamed.`);
    }
  }
  const references = animations.flatMap(animation => {
    const names: Array<{animator: AnimatorReference; name: string}> = [];
    const remap = <T>(source: Record<string, T> | undefined, animatorMap: boolean) => {
      if (!source) return undefined;
      const result: Record<string, T> = Object.create(null);
      for (const [key, value] of Object.entries(source)) {
        const animator = value as AnimatorReference;
        const row = animatorMap
          ? byId.get(key) ?? (animator.uuid ? byId.get(animator.uuid) : undefined) ?? byName.get(key)
          : byName.get(key);
        const nextKey = row && key === row.old_name && !byId.has(key) ? row.new_name : key;
        if (Object.hasOwn(result, nextKey)) throw new Error(`Animation map collision at "${nextKey}".`);
        result[nextKey] = value;
        if (row && animatorMap && typeof animator.name === "string" && animator.name !== row.new_name) names.push({animator, name: row.new_name});
      }
      return result;
    };
    const animators = remap(animation.animators, true);
    const groupMap = remap(animation.groups, false);
    const changedKeys = (before: object | undefined, after: object | undefined) => JSON.stringify(Object.keys(before ?? {})) !== JSON.stringify(Object.keys(after ?? {}));
    return names.length || changedKeys(animation.animators, animators) || changedKeys(animation.groups, groupMap)
      ? [{animation, animators, groupMap, names}] : [];
  });
  return {rows, references};
}

export function applyGroupRename(plan: ReturnType<typeof planGroupRename>) {
  for (const row of plan.rows) row.group.name = row.new_name;
  for (const reference of plan.references) {
    if (reference.animators) reference.animation.animators = reference.animators;
    if (reference.groupMap) reference.animation.groups = reference.groupMap;
    for (const {animator, name} of reference.names) animator.name = name;
    reference.animation.saved = false;
  }
}
