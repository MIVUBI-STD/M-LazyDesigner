import type {
  UvLayoutPlan,
  UvLayoutSnapshot,
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

export function planUvPacking(
  snapshot: UvLayoutSnapshot,
  options: {
    bitmap_width: number;
    bitmap_height: number;
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

  const locked = snapshot.islands.filter(
    (island) => island.constraints.locked
  );
  const movable = snapshot.islands.filter(
    (island) => !island.constraints.locked
  );
  const occupied = locked.map((island) =>
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

  const proposedIslands = snapshot.islands.map((island) => {
    const placement = placementById.get(island.id);
    return placement
      ? {
          ...island,
          rect: { ...placement.rect },
        }
      : {
          ...island,
          rect: { ...island.rect },
        };
  });

  const movedIslandIds = movable
    .filter((island) => {
      const placement = placementById.get(island.id);
      if (!placement) return false;
      return (
        placement.rect.x !== island.rect.x ||
        placement.rect.y !== island.rect.y ||
        placement.rect.width !== island.rect.width ||
        placement.rect.height !== island.rect.height
      );
    })
    .map((island) => island.id);

  const physicalArea = proposedIslands.reduce(
    (sum, island) => sum + island.physical.area,
    0
  );
  const uvArea = proposedIslands.reduce(
    (sum, island) => sum + island.rect.width * island.rect.height,
    0
  );

  return {
    schema: 1,
    planner_version: snapshot.planner_version,
    backend: "maxrects_v1",
    backend_version: 1,
    before: snapshot,
    proposed: {
      ...snapshot,
      islands: proposedIslands,
      metrics: {
        ...snapshot.metrics,
        physical_area: physicalArea,
        uv_area: uvArea,
      },
    },
    score,
    moved_island_ids: movedIslandIds,
  };
}
