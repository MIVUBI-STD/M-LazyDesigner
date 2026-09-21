import type {
  UvLayoutPlan,
  UvLayoutReceipt,
} from "@/lib/uv/contracts";
import type {
  UvNativeMutationInstruction,
  UvNativeSourceSnapshot,
} from "@/lib/uv/adapters/blockbenchCubeUv";
import {
  assertUvPlanSourceFresh,
  fingerprintUvNativeSource,
  translateUvPlanToNativeInstructions,
} from "@/lib/uv/adapters/blockbenchCubeUv";
import { requireValidUvLayoutPlan } from "@/lib/uv/validatePlan";
import { buildUvLayoutReceipt } from "@/lib/uv/receipt";

export type UvApplyAdapter = {
  readSource(): Promise<UvNativeSourceSnapshot> | UvNativeSourceSnapshot;
  apply(
    instructions: readonly UvNativeMutationInstruction[]
  ): Promise<void> | void;
  restore(
    snapshot: UvNativeSourceSnapshot
  ): Promise<void> | void;
  beginUndo?(): Promise<void> | void;
  commitUndo?(): Promise<void> | void;
  cancelUndo?(): Promise<void> | void;
};

export async function applyUvLayoutPlanAtomic(
  plan: UvLayoutPlan,
  expectedSourceFingerprint: string,
  adapter: UvApplyAdapter
): Promise<UvLayoutReceipt> {
  requireValidUvLayoutPlan(plan);
  const before = await adapter.readSource();
  assertUvPlanSourceFresh(expectedSourceFingerprint, before);
  const instructions = translateUvPlanToNativeInstructions(plan);

  await adapter.beginUndo?.();
  try {
    await adapter.apply(instructions);
    const after = await adapter.readSource();
    const afterFingerprint = fingerprintUvNativeSource(after);
    if (afterFingerprint === expectedSourceFingerprint && instructions.length > 0) {
      throw new Error(
        "UV_APPLY_POSTCONDITION_FAILED: native UV source fingerprint did not change."
      );
    }
    await adapter.commitUndo?.();
    return buildUvLayoutReceipt(
      plan,
      expectedSourceFingerprint,
      afterFingerprint
    );
  } catch (error) {
    try {
      await adapter.restore(before);
    } finally {
      await adapter.cancelUndo?.();
    }
    throw error;
  }
}
