export function deriveMirroredRigName(name: string): string {
  if (name.includes("left")) return name.replace("left", "right");
  if (name.includes("right")) return name.replace("right", "left");
  return `${name}_mirrored`;
}

export function hasCaseInsensitiveRigNameCollision(
  groups: readonly { uuid: string; name: string }[],
  requestedName: string,
  excludeUuid?: string
): boolean {
  const normalizedName = requestedName.toLowerCase();
  return groups.some(
    (group) =>
      group.uuid !== excludeUuid &&
      group.name.toLowerCase() === normalizedName
  );
}

export function wouldCreateRigHierarchyCycle(
  targetUuid: string,
  candidateParentUuid: string,
  parentByUuid: ReadonlyMap<string, string | null>
): boolean {
  let currentUuid: string | null = candidateParentUuid;
  const visited = new Set<string>();

  while (currentUuid !== null) {
    if (currentUuid === targetUuid) return true;
    if (visited.has(currentUuid)) return true;
    visited.add(currentUuid);
    currentUuid = parentByUuid.get(currentUuid) ?? null;
  }

  return false;
}
