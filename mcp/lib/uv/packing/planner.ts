import type {
  UvLayoutPlan,
  UvLayoutSnapshot,
  UvPackingMode,
  UvRect,
} from "@/lib/uv/contracts";
import { physicalPixelsPerUvUnit } from "@/lib/uv/density";
import { packMaxRects } from "@/lib/uv/packing/maxRects";
import { scoreUvPacking } from "@/lib/uv/packing/scorer";
import type {
  UvPackingItem,
  UvPackingRect,
} from "@/lib/uv/packing/types";

function toPackingRect(rect: UvRect): UvPackingRect {
  return { ...rect };
}

function measureProposedMetrics(
  snapshot: UvLayoutSnapshot,
  rects: ReadonlyMap<string, UvRect>
) {
  const islands = snapshot.islands.map((island) => ({
    ...island,
    rect: { ...(rects.get(island.id) ?? island.rect) },
  }));
  let occupiedBounds: UvRect | null = null;
  if (islands.length > 0) {
    const left = Math.min(...islands.map((island) => island.rect.x));
    const top = Math.min(...islands.map((island) => island.rect.y));
    const right = Math.max(
      ...islands.map((island) => island.rect.x + island.rect.width)
    );
    const bottom = Math.max(
      ...islands.map((island) => island.rect.y + island.rect.height)
    );
    occupiedBounds = {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    };
  }
  return {
    islands,
    metrics: {
      island_count: islands.length,
      face_count: islands.reduce(
        (sum, island) => sum + island.source.faces.length,
        0
      ),
      physical_area: islands.reduce(
        (sum, island) => sum + island.physical.area,
        0
      ),
      uv_area: islands.reduce(
        (sum, island) =>
          sum + island.rect.width * island.rect.height,
        0
      ),
      occupied_bounds: occupiedBounds,
    },
  };
}

function resolveMovableIds(
  snapshot: UvLayoutSnapshot,
  mode: UvPackingMode,
  explicitIds: readonly string[]
): Set<string> {
  const known = new Set(snapshot.islands.map((island) => island.id));
  for (const id of explicitIds) {
    if (!known.has(id)) {
      throw new Error(`UV packing target island "${id}" was not found.`);
    }
  }

  if (mode === "REPACK_ALL") {
    return new Set(
      snapshot.islands
        .filter((island) => !island.constraints.locked)
        .map((island) => island.id)
    );
  }

  if (explicitIds.length === 0) {
    throw new Error(
      `${mode} requires at least one explicit island ID.`
    );
  }

  const requested = new Set(explicitIds);
  return new Set(
    snapshot.islands
      .filter(
        (island) =>
          requested.has(island.id) &&
          !island.constraints.locked
      )
      .map((island) => island.id)
  );
}

export function planUvPacking(
  snapshot: UvLayoutSnapshot,
  options: {
    bitmap_width: number;
    bitmap_height: number;
    mode?: UvPackingMode;
    island_ids?: readonly string[];
    size_overrides?: Readonly<
      Record<string, readonly [number, number]>
    >;
  }
): UvLayoutPlan {
  const pixelScale = physicalPixelsPerUvUnit(
    snapshot.logical_width,
    snapshot.logical_height,
    options.bitmap_width,
    options.bitmap_height
  );

  const mode = options.mode ?? "REPACK_ALL";
  const explicitIds = options.island_ids ?? [];
  const movableIds = resolveMovableIds(
    snapshot,
    mode,
    explicitIds
  );
  const movable = snapshot.islands.filter((island) =>
    movableIds.has(island.id)
  );
  const fixed = snapshot.islands.filter(
    (island) => !movableIds.has(island.id)
  );
  const occupied = fixed.map((island) =>
    toPackingRect(island.rect)
  );

  const items: UvPackingItem[] = movable.map((island) => {
    const override = options.size_overrides?.[island.id];
    const width = override?.[0] ?? island.rect.width;
    const height = override?.[1] ?? island.rect.height;
    const paddingPixels = island.constraints.padding_pixels;
    return {
      id: island.id,
      width,
      height,
      padding_x: paddingPixels / pixelScale[0],
      padding_y: paddingPixels / pixelScale[1],
      allow_rotate_90:
        !island.source.box_uv &&
        island.constraints.rotation.allowed &&
        island.constraints.rotation.step === 90,
      priority: island.constraints.priority,
      original_rect: { ...island.rect },
    };
  });

  const candidate = packMaxRects(
    items,
    snapshot.logical_width,
    snapshot.logical_height,
    occupied
  );
  const score = scoreUvPacking(candidate, items, occupied);
  const placementById = new Map(
    candidate.placements.map((placement) => [
      placement.id,
      placement,
    ])
  );

  const proposedRectById = new Map(
    candidate.placements.map((placement) => [
      placement.id,
      placement.rect,
    ])
  );
  const proposed = measureProposedMetrics(
    snapshot,
    proposedRectById
  );

  const movedIslandIds = movable
    .filter((island) => {
      const placement = placementById.get(island.id);
      if (!placement) return false;
      return (
        placement.rect.x !== island.rect.x ||
        placement.rect.y !== island.rect.y ||
        placement.rect.width !== island.rect.width ||
        placement.rect.height !== island.rect.height ||
        placement.rotated_90
      );
    })
    .map((island) => island.id);

  return {
    schema: 1,
    planner_version: snapshot.planner_version,
    backend: "maxrects_v1",
    backend_version: 1,
    mode,
    before: snapshot,
    proposed: {
      ...snapshot,
      islands: proposed.islands,
      metrics: proposed.metrics,
    },
    score,
    moved_island_ids: movedIslandIds,
    fixed_island_ids: fixed.map((island) => island.id),
    placement_transforms: candidate.placements.map(
      (placement) => ({
        island_id: placement.id,
        rotated_90: placement.rotated_90,
      })
    ),
  };
}
