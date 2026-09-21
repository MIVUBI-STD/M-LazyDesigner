import { createHash } from "node:crypto";
import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import type { IncrementalRecipeRebuildPlan } from "@/lib/authoringRecipe/incremental";

export type StoredAuthoringRecipePlan = {
  plan_id: string;
  native_source_fingerprint: string;
  previous_recipe: AuthoringRecipe;
  next_recipe: AuthoringRecipe;
  rebuild: IncrementalRecipeRebuildPlan;
};

export class AuthoringRecipePlanRegistry {
  private readonly entries = new Map<string, StoredAuthoringRecipePlan>();

  constructor(private readonly maxEntries = 8) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 64) {
      throw new Error("Authoring recipe plan registry maxEntries must be 1..64.");
    }
  }

  put(input: Omit<StoredAuthoringRecipePlan, "plan_id">): StoredAuthoringRecipePlan {
    const planId = "recipeplan:" + createHash("sha256").update(JSON.stringify({
      native_source_fingerprint: input.native_source_fingerprint,
      previous_recipe: input.previous_recipe,
      next_recipe: input.next_recipe,
    })).digest("hex");
    const stored: StoredAuthoringRecipePlan = {
      plan_id: planId,
      native_source_fingerprint: input.native_source_fingerprint,
      previous_recipe: structuredClone(input.previous_recipe),
      next_recipe: structuredClone(input.next_recipe),
      rebuild: structuredClone(input.rebuild),
    };
    this.entries.delete(planId);
    this.entries.set(planId, stored);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (typeof oldest !== "string") break;
      this.entries.delete(oldest);
    }
    return stored;
  }

  get(planId: string): StoredAuthoringRecipePlan {
    const stored = this.entries.get(planId);
    if (!stored) {
      throw new Error("RECIPE_PLAN_NOT_FOUND: handle expired or belongs to a previous Runtime generation; create a fresh plan.");
    }
    this.entries.delete(planId);
    this.entries.set(planId, stored);
    return stored;
  }

  size(): number { return this.entries.size; }
}
