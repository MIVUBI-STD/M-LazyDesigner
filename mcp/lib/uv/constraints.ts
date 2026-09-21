import {
  type UvFaceKey,
  type UvIsland,
  type UvIslandConstraintPatch,
} from "@/lib/uv/contracts";
import { mergeUvIslandConstraints } from "@/lib/uv/islands";

export type UvConstraintSelector = {
  island_ids?: readonly string[];
  cube_uuids?: readonly string[];
  cube_names?: readonly string[];
  faces?: readonly UvFaceKey[];
  box_uv?: boolean;
};

export type UvConstraintRule = {
  id: string;
  selector: UvConstraintSelector;
  constraints: UvIslandConstraintPatch;
};

export type UvConstraintAssignment = {
  island_id: string;
  matched_rule_ids: string[];
  constraints: ReturnType<typeof mergeUvIslandConstraints>;
};

type FlatPatch = Record<string, unknown>;

function selectorMatches(
  island: UvIsland,
  selector: UvConstraintSelector
): boolean {
  if (
    selector.island_ids &&
    !selector.island_ids.includes(island.id)
  ) return false;
  if (
    selector.cube_uuids &&
    !selector.cube_uuids.includes(island.source.cube_uuid)
  ) return false;
  if (
    selector.cube_names &&
    !selector.cube_names.includes(island.source.cube_name)
  ) return false;
  if (
    selector.faces &&
    !selector.faces.some((face) => island.source.faces.includes(face))
  ) return false;
  if (
    selector.box_uv !== undefined &&
    selector.box_uv !== island.source.box_uv
  ) return false;
  return true;
}

function flattenPatch(patch: UvIslandConstraintPatch): FlatPatch {
  const flat: FlatPatch = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (
      (key === "rotation" || key === "density") &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (nestedValue !== undefined) {
          flat[`${key}.${nestedKey}`] = nestedValue;
        }
      }
      continue;
    }
    flat[key] = value;
  }
  return flat;
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function composePatches(
  islandId: string,
  matched: readonly UvConstraintRule[]
): UvIslandConstraintPatch {
  const claimed = new Map<string, { rule: string; value: unknown }>();
  for (const rule of matched) {
    for (const [path, value] of Object.entries(
      flattenPatch(rule.constraints)
    )) {
      const previous = claimed.get(path);
      if (previous && !sameValue(previous.value, value)) {
        throw new Error(
          `UV constraint conflict on ${islandId} at ${path}: rules "${previous.rule}" and "${rule.id}" disagree.`
        );
      }
      claimed.set(path, { rule: rule.id, value });
    }
  }

  const result: UvIslandConstraintPatch = {};
  for (const [path, entry] of claimed) {
    if (path.startsWith("rotation.")) {
      result.rotation ??= {};
      (result.rotation as Record<string, unknown>)[
        path.slice("rotation.".length)
      ] = entry.value;
    } else if (path.startsWith("density.")) {
      result.density ??= {};
      (result.density as Record<string, unknown>)[
        path.slice("density.".length)
      ] = entry.value;
    } else {
      (result as Record<string, unknown>)[path] = entry.value;
    }
  }
  return result;
}

export function assignUvConstraints(
  islands: readonly UvIsland[],
  rules: readonly UvConstraintRule[]
): UvConstraintAssignment[] {
  const ruleIds = rules.map((rule) => rule.id);
  if (
    ruleIds.some((id) => !id) ||
    new Set(ruleIds).size !== ruleIds.length
  ) {
    throw new Error(
      "UV constraint rules require unique non-empty IDs."
    );
  }

  return islands.map((island) => {
    const matched = rules.filter((rule) =>
      selectorMatches(island, rule.selector)
    );
    const patch = composePatches(island.id, matched);
    return {
      island_id: island.id,
      matched_rule_ids: matched.map((rule) => rule.id),
      constraints: mergeUvIslandConstraints({
        ...island.constraints,
        ...patch,
        rotation: {
          ...island.constraints.rotation,
          ...patch.rotation,
        },
        density: {
          ...island.constraints.density,
          ...patch.density,
        },
      }),
    };
  });
}

export function constraintResolverFromAssignments(
  assignments: readonly UvConstraintAssignment[]
) {
  const byIsland = new Map(
    assignments.map((assignment) => [
      assignment.island_id,
      assignment.constraints,
    ])
  );
  return (island: Pick<UvIsland, "id">): UvIslandConstraintPatch | undefined =>
    byIsland.get(island.id);
}
