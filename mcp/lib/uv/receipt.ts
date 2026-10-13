import { z } from "zod";
import type {
  UvLayoutPlan,
  UvLayoutReceipt,
} from "@/lib/uv/contracts";

/**
 * A stored UV planning result is not necessarily eligible for apply.
 * The Runtime registry and source fingerprint remain final authority at
 * apply-time; this limited receipt is only an ephemeral Graph readiness hint.
 */
export const uvUsablePlanReceiptSchema = z.object({
  plan_id: z.string().regex(/^uvplan:[a-f0-9]{64}$/),
  source_fingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  report: z.object({
    schema: z.literal(1),
    execution: z.literal("planned"),
    apply_allowed: z.literal(true),
    hard_violations: z.array(z.string()).length(0),
  }),
});

export function isUvUsablePlanReceipt(value: unknown): boolean {
  return uvUsablePlanReceiptSchema.safeParse(value).success;
}

export function buildUvLayoutReceipt(
  plan: UvLayoutPlan,
  sourceFingerprintBefore: string,
  sourceFingerprintAfter: string
): UvLayoutReceipt {
  const beforeById = new Map(
    plan.before.islands.map((island) => [island.id, island])
  );
  const afterById = new Map(
    plan.proposed.islands.map((island) => [island.id, island])
  );
  const transformById = new Map(
    plan.placement_transforms.map((transform) => [
      transform.island_id,
      transform,
    ])
  );

  const moved = plan.moved_island_ids.map((islandId) => {
    const before = beforeById.get(islandId);
    const after = afterById.get(islandId);
    if (!before || !after) {
      throw new Error(
        `UV receipt cannot resolve moved island ${islandId}.`
      );
    }
    return {
      island_id: islandId,
      before: { ...before.rect },
      after: { ...after.rect },
      rotated_90:
        transformById.get(islandId)?.rotated_90 === true,
    };
  });

  const changedCubes = new Set<string>();
  const changedFaces: Array<{
    cube_uuid: string;
    face: import("@/lib/uv/contracts").UvFaceKey | null;
  }> = [];

  for (const islandId of plan.moved_island_ids) {
    const island = beforeById.get(islandId);
    if (!island) continue;
    changedCubes.add(island.source.cube_uuid);
    if (island.source.box_uv) {
      changedFaces.push({
        cube_uuid: island.source.cube_uuid,
        face: null,
      });
    } else {
      for (const face of island.source.faces) {
        changedFaces.push({
          cube_uuid: island.source.cube_uuid,
          face,
        });
      }
    }
  }

  return {
    schema: 1,
    planner_version: plan.planner_version,
    backend: plan.backend,
    backend_version: plan.backend_version,
    mode: plan.mode,
    source_fingerprint_before: sourceFingerprintBefore,
    source_fingerprint_after: sourceFingerprintAfter,
    changed_island_ids: [...plan.moved_island_ids],
    changed_cube_ids: [...changedCubes].sort(),
    changed_faces: changedFaces.sort((a, b) =>
      a.cube_uuid.localeCompare(b.cube_uuid) ||
      String(a.face).localeCompare(String(b.face))
    ),
    moved,
    before_metrics: { ...plan.before.metrics },
    after_metrics: { ...plan.proposed.metrics },
  };
}
