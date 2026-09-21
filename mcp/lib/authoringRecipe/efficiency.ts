import type { AuthoringRecipe, CompiledAuthoringRecipe } from "@/lib/authoringRecipe/contracts";

export type ParametricEfficiencyComparison = {
  metric_basis: "serialized_bytes_and_static_operation_proxy";
  wall_clock_claim: "not_measured";
  baseline: { explicit_cube_payload_bytes: number; coordinate_number_count: number; minimum_manage_cubes_calls: number; };
  recipe: { recipe_payload_bytes: number; authored_numeric_parameter_count: number; planned_recipe_calls: number; prototype_count: number; pattern_count: number; };
  savings: { payload_bytes: number; payload_ratio: number; manage_cubes_calls: number; call_ratio: number; };
  quality_contract: { expected_cube_count: number; compiled_cube_count: number; deterministic: boolean; finite_geometry: boolean; };
};

function serializedBytes(value: unknown): number { return new TextEncoder().encode(JSON.stringify(value)).length; }
function countNumbers(value: unknown): number {
  if (typeof value === "number") return 1;
  if (Array.isArray(value)) return value.reduce((sum, entry) => sum + countNumbers(entry), 0);
  if (value && typeof value === "object") return Object.values(value).reduce((sum, entry) => sum + countNumbers(entry), 0);
  return 0;
}

export function explicitCubePayload(compiled: CompiledAuthoringRecipe) {
  return {
    operation: "create",
    elements: compiled.placements.map((placement) => ({
      name: placement.name, from: placement.from, to: placement.to, origin: placement.origin,
      rotation: placement.rotation, inflate: placement.inflate,
    })),
  };
}

export function compareParametricEfficiency(recipe: AuthoringRecipe, compiled: CompiledAuthoringRecipe): ParametricEfficiencyComparison {
  const baselinePayload = explicitCubePayload(compiled);
  const baselineBytes = serializedBytes(baselinePayload);
  const recipeBytes = serializedBytes(recipe);
  const baselineCalls = Math.ceil(compiled.placements.length / 32);
  const recipeCalls = compiled.placements.length === 0 ? 0 : 1;
  const finiteGeometry = compiled.placements.every((placement) => [
    ...placement.from, ...placement.to, ...placement.origin, ...placement.rotation, placement.inflate,
  ].every(Number.isFinite));
  return {
    metric_basis: "serialized_bytes_and_static_operation_proxy", wall_clock_claim: "not_measured",
    baseline: { explicit_cube_payload_bytes: baselineBytes, coordinate_number_count: countNumbers(baselinePayload), minimum_manage_cubes_calls: baselineCalls },
    recipe: { recipe_payload_bytes: recipeBytes, authored_numeric_parameter_count: countNumbers(recipe), planned_recipe_calls: recipeCalls, prototype_count: compiled.metrics.prototype_count, pattern_count: compiled.metrics.pattern_count },
    savings: {
      payload_bytes: baselineBytes - recipeBytes,
      payload_ratio: baselineBytes === 0 ? 0 : (baselineBytes - recipeBytes) / baselineBytes,
      manage_cubes_calls: baselineCalls - recipeCalls,
      call_ratio: baselineCalls === 0 ? 0 : (baselineCalls - recipeCalls) / baselineCalls,
    },
    quality_contract: { expected_cube_count: compiled.metrics.instance_count, compiled_cube_count: compiled.placements.length, deterministic: true, finite_geometry: finiteGeometry },
  };
}
