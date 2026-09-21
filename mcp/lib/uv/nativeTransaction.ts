import type { NativeUvApplyOperation } from "@/lib/uv/nativeApplyPlan";

export type NativeUvTransactionPlan = {
  expected_fingerprint: string;
  operations: readonly NativeUvApplyOperation[];
};

export type NativeUvTransactionReceipt = {
  execution: "applied" | "unchanged";
  affected_cube_uuids: string[];
  affected_island_ids: string[];
  operation_count: number;
  before_fingerprint: string;
  after_fingerprint: string;
};

export function validateNativeUvTransactionPlan(plan: NativeUvTransactionPlan): void {
  if (!plan.expected_fingerprint) {
    throw new Error("Native UV transaction requires an expected source fingerprint.");
  }
  const ids = new Set<string>();
  const nativeTargets = new Set<string>();
  for (const operation of plan.operations) {
    if (!operation.island_id || ids.has(operation.island_id)) {
      throw new Error("Native UV transaction island IDs must be non-empty and unique.");
    }
    ids.add(operation.island_id);
    const target = operation.cube_uuid + ":" + operation.face;
    if (nativeTargets.has(target)) {
      throw new Error("Native UV transaction cannot target the same Cube face twice: " + target + ".");
    }
    nativeTargets.add(target);
    if (operation.uv.some((value) => !Number.isFinite(value))) {
      throw new Error("Native UV transaction contains non-finite UV values for " + operation.island_id + ".");
    }
    if (operation.rotation !== 0 && operation.rotation !== 90) {
      throw new Error("Semantic UV transaction supports only generated 0/90-degree packing rotation.");
    }
  }
}
