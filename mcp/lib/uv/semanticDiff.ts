import type { SemanticUvPlacement } from "@/lib/uv/semanticPlanner";

function samePlacement(a: SemanticUvPlacement, b: SemanticUvPlacement): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height && a.rotated === b.rotated && a.shared_with === b.shared_with;
}

export function diffSemanticUv(previous: readonly SemanticUvPlacement[], next: readonly SemanticUvPlacement[]) {
  const before = new Map(previous.map((placement) => [placement.id, placement]));
  const after = new Map(next.map((placement) => [placement.id, placement]));
  const upserts: SemanticUvPlacement[] = [];
  const removals: string[] = [];
  const unchanged: string[] = [];

  for (const [id, placement] of after) {
    const old = before.get(id);
    if (!old || !samePlacement(old, placement)) upserts.push(placement);
    else unchanged.push(id);
  }
  for (const id of before.keys()) if (!after.has(id)) removals.push(id);

  return {
    upserts: upserts.sort((a, b) => a.id.localeCompare(b.id)),
    removals: removals.sort(),
    unchanged: unchanged.sort(),
  };
}
