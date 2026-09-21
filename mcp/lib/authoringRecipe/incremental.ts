import { createHash } from "node:crypto";
import type { AuthoringRecipe, CompiledCubePlacement } from "@/lib/authoringRecipe/contracts";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";

export type IncrementalRecipeReason = "ADDED" | "REMOVED" | "CHANGED";

export type IncrementalRecipeRebuildPlan = {
  schema: 1;
  previous_recipe_fingerprint: string;
  next_recipe_fingerprint: string;
  upserts: CompiledCubePlacement[];
  remove_instance_ids: string[];
  preserved_instance_ids: string[];
  reasons: Array<{ instance_id: string; reason: IncrementalRecipeReason }>;
  metrics: {
    previous_cube_count: number;
    next_cube_count: number;
    upsert_count: number;
    remove_count: number;
    preserved_count: number;
    affected_count: number;
    affected_ratio_of_next: number;
  };
};

function fingerprint(value: unknown): string {
  return "sha256:" + createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function placementEqual(left: CompiledCubePlacement, right: CompiledCubePlacement): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function planIncrementalRecipeRebuild(
  previousRecipe: AuthoringRecipe,
  nextRecipe: AuthoringRecipe
): IncrementalRecipeRebuildPlan {
  if (previousRecipe.id !== nextRecipe.id) {
    throw new Error("Incremental recipe rebuild requires stable recipe identity.");
  }
  const previous = compileAuthoringRecipe(previousRecipe);
  const next = compileAuthoringRecipe(nextRecipe);
  const previousById = new Map(previous.placements.map((placement) => [placement.id, placement]));
  const nextById = new Map(next.placements.map((placement) => [placement.id, placement]));
  const upserts: CompiledCubePlacement[] = [];
  const removals: string[] = [];
  const preserved: string[] = [];
  const reasons: IncrementalRecipeRebuildPlan["reasons"] = [];

  for (const placement of next.placements) {
    const before = previousById.get(placement.id);
    if (!before) {
      upserts.push(placement);
      reasons.push({ instance_id: placement.id, reason: "ADDED" });
    } else if (!placementEqual(before, placement)) {
      upserts.push(placement);
      reasons.push({ instance_id: placement.id, reason: "CHANGED" });
    } else {
      preserved.push(placement.id);
    }
  }
  for (const placement of previous.placements) {
    if (!nextById.has(placement.id)) {
      removals.push(placement.id);
      reasons.push({ instance_id: placement.id, reason: "REMOVED" });
    }
  }

  upserts.sort((a,b) => a.id.localeCompare(b.id));
  removals.sort(); preserved.sort();
  reasons.sort((a,b) => a.instance_id.localeCompare(b.instance_id));
  const affectedCount = upserts.length + removals.length;
  return {
    schema: 1,
    previous_recipe_fingerprint: fingerprint(previousRecipe),
    next_recipe_fingerprint: fingerprint(nextRecipe),
    upserts,
    remove_instance_ids: removals,
    preserved_instance_ids: preserved,
    reasons,
    metrics: {
      previous_cube_count: previous.placements.length,
      next_cube_count: next.placements.length,
      upsert_count: upserts.length,
      remove_count: removals.length,
      preserved_count: preserved.length,
      affected_count: affectedCount,
      affected_ratio_of_next: next.placements.length === 0 ? (affectedCount === 0 ? 0 : 1) : affectedCount / next.placements.length,
    },
  };
}
