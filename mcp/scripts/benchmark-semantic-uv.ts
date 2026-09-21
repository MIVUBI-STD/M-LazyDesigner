import { planSemanticUv } from "@/lib/uv/semanticPlanner";

function bytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

const islands = Array.from({ length: 48 }, (_, index) => ({
  id: "panel_" + index,
  world_size: [4, 4] as const,
  cohort: "metal",
}));

const initial = planSemanticUv(islands, {
  atlas_width: 128,
  atlas_height: 128,
  default_texel_density: 1,
  padding: 1,
});

const changedIslands = islands.map((island, index) =>
  index === 17 ? { ...island, world_size: [6, 4] as const } : island
);

const incremental = planSemanticUv(changedIslands, {
  atlas_width: 128,
  atlas_height: 128,
  default_texel_density: 1,
  padding: 1,
  previous_placements: initial.owner_placements,
  affected_ids: ["panel_17"],
});

const explicitPayload = changedIslands.map((island) => ({
  island: island.id,
  world_size: island.world_size,
}));
const incrementalPayload = {
  affected_ids: ["panel_17"],
  changed: changedIslands[17],
};

const retained = incremental.retained_ids.length;
const moved = incremental.placements.filter((placement) => {
  const previous = initial.placements.find((candidate) => candidate.id === placement.id);
  return !previous ||
    previous.x !== placement.x ||
    previous.y !== placement.y ||
    previous.width !== placement.width ||
    previous.height !== placement.height ||
    previous.rotated !== placement.rotated;
}).length;

const result = {
  fixture_islands: islands.length,
  explicit_payload_bytes: bytes(explicitPayload),
  incremental_payload_bytes: bytes(incrementalPayload),
  serialized_payload_proxy_reduction:
    1 - bytes(incrementalPayload) / bytes(explicitPayload),
  retained_islands: retained,
  changed_or_moved_islands: moved,
  atlas_utilization_before: initial.utilization,
  atlas_utilization_after: incremental.utilization,
  complete: initial.complete && incremental.complete,
};

console.log(JSON.stringify(result, null, 2));

if (!result.complete) throw new Error("Semantic UV benchmark fixture did not pack completely.");
if (retained < islands.length - 2) throw new Error("Semantic UV incremental planning moved too much unaffected state.");
if (result.serialized_payload_proxy_reduction < 0.5) throw new Error("Semantic UV incremental payload proxy reduction regressed below 50%.");
