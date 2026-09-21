import type {
  UvLayoutReceipt,
  UvPackingMode,
} from "@/lib/uv/contracts";
import type { UvConstraintRule } from "@/lib/uv/constraints";
import {
  assignUvConstraints,
  constraintResolverFromAssignments,
} from "@/lib/uv/constraints";
import { buildUvLayoutSnapshot } from "@/lib/uv/islands";
import { planUvDensity } from "@/lib/uv/density";
import { planUvPacking } from "@/lib/uv/packing/planner";
import { discoverUvStackProposals } from "@/lib/uv/stacking";
import { buildUvDryRunReport } from "@/lib/uv/dryRun";
import { applyUvLayoutPlanAtomic } from "@/lib/uv/transaction";
import { invalidationForUvReceipt } from "@/lib/uv/invalidation";
import {
  fingerprintUvNativeSource,
  type UvNativeSourceSnapshot,
} from "@/lib/uv/adapters/blockbenchCubeUv";
import type { UvApplyAdapter } from "@/lib/uv/transaction";
import { UvPlanRegistry } from "@/lib/uv/planRegistry";

export type UvLayoutPlanningInput = {
  bitmap_width: number;
  bitmap_height: number;
  mode?: UvPackingMode;
  island_ids?: readonly string[];
  default_target_pixels_per_model_unit?: number;
  constraints?: readonly UvConstraintRule[];
  include_implicit_stack_candidates?: boolean;
};

export type UvLayoutServiceDependencies = {
  readSource(): Promise<UvNativeSourceSnapshot> | UvNativeSourceSnapshot;
  createApplyAdapter(): UvApplyAdapter;
};

export function createUvLayoutService(
  dependencies: UvLayoutServiceDependencies,
  registry = new UvPlanRegistry()
) {
  return {
    async plan(input: UvLayoutPlanningInput) {
      const native = await dependencies.readSource();
      const sourceFingerprint = fingerprintUvNativeSource(native);

      const base = buildUvLayoutSnapshot(
        native.cubes,
        native.logical_width,
        native.logical_height
      );
      const assignments = assignUvConstraints(
        base.islands,
        input.constraints ?? []
      );
      const constrained = buildUvLayoutSnapshot(
        native.cubes,
        native.logical_width,
        native.logical_height,
        constraintResolverFromAssignments(assignments)
      );
      const density = planUvDensity(constrained, {
        bitmap_width: input.bitmap_width,
        bitmap_height: input.bitmap_height,
        default_target_pixels_per_model_unit:
          input.default_target_pixels_per_model_unit ?? 1,
      });
      const sizeOverrides = Object.fromEntries(
        density.proposals
          .filter((proposal) => proposal.changed)
          .map((proposal) => [
            proposal.island_id,
            proposal.proposed_size,
          ])
      );
      const plan = planUvPacking(constrained, {
        bitmap_width: input.bitmap_width,
        bitmap_height: input.bitmap_height,
        mode: input.mode,
        island_ids: input.island_ids,
        size_overrides: sizeOverrides,
      });
      const stackProposals = discoverUvStackProposals(
        constrained.islands,
        {
          include_implicit_candidates:
            input.include_implicit_stack_candidates,
        }
      );
      const report = buildUvDryRunReport(plan, {
        density_plan: density,
        stack_proposals: stackProposals,
      });
      const stored = registry.put(
        plan,
        sourceFingerprint,
        report
      );

      return {
        plan_id: stored.plan_id,
        source_fingerprint: sourceFingerprint,
        report,
      };
    },

    async apply(input: {
      plan_id: string;
      expected_source_fingerprint: string;
    }): Promise<{
      receipt: UvLayoutReceipt;
      invalidation: ReturnType<typeof invalidationForUvReceipt>;
    }> {
      const stored = registry.get(input.plan_id);
      if (
        stored.source_fingerprint !==
        input.expected_source_fingerprint
      ) {
        throw new Error(
          "STALE_UV_PLAN: supplied source fingerprint does not match the stored plan."
        );
      }
      if (!stored.report.apply_allowed) {
        throw new Error(
          "UV_LAYOUT_PLAN_BLOCKED: dry-run report contains blocking violations."
        );
      }

      const receipt = await applyUvLayoutPlanAtomic(
        stored.plan,
        stored.source_fingerprint,
        dependencies.createApplyAdapter()
      );
      return {
        receipt,
        invalidation: invalidationForUvReceipt(receipt),
      };
    },

    registrySize(): number {
      return registry.size();
    },
  };
}
