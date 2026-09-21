import type { RecipeVec3 } from "@/lib/authoringRecipe/contracts";

export type ReferenceDeviation =
  | {
      kind: "BOUNDS";
      instance_id: string;
      axis: "X" | "Y" | "Z";
      expected: number;
      actual: number;
      tolerance?: number;
    }
  | {
      kind: "CENTER_OFFSET";
      instance_id: string;
      expected_center: RecipeVec3;
      actual_center: RecipeVec3;
      tolerance?: number;
    }
  | {
      kind: "ROTATION";
      instance_id: string;
      axis: "X" | "Y" | "Z";
      expected_degrees: number;
      actual_degrees: number;
      tolerance_degrees?: number;
    };

export type ReferenceCorrectionVector =
  | { instance_id: string; operation: "RESIZE_AXIS"; axis: "X" | "Y" | "Z"; delta: number }
  | { instance_id: string; operation: "TRANSLATE"; delta: RecipeVec3 }
  | { instance_id: string; operation: "ROTATE_AXIS"; axis: "X" | "Y" | "Z"; delta_degrees: number };

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(label + " must be finite.");
  return value;
}

export function deriveReferenceCorrectionVectors(
  deviations: readonly ReferenceDeviation[]
): ReferenceCorrectionVector[] {
  return deviations.flatMap((deviation) => {
    if (!deviation.instance_id) throw new Error("Reference deviation requires an instance identity.");
    if (deviation.kind === "BOUNDS") {
      const delta = finite(deviation.expected, "Expected bound") - finite(deviation.actual, "Actual bound");
      const tolerance = deviation.tolerance ?? 0;
      if (Math.abs(delta) <= tolerance) return [];
      return [{ instance_id: deviation.instance_id, operation: "RESIZE_AXIS" as const, axis: deviation.axis, delta }];
    }
    if (deviation.kind === "ROTATION") {
      const delta = finite(deviation.expected_degrees, "Expected rotation") - finite(deviation.actual_degrees, "Actual rotation");
      const tolerance = deviation.tolerance_degrees ?? 0;
      if (Math.abs(delta) <= tolerance) return [];
      return [{ instance_id: deviation.instance_id, operation: "ROTATE_AXIS" as const, axis: deviation.axis, delta_degrees: delta }];
    }
    const delta: RecipeVec3 = [
      finite(deviation.expected_center[0], "Expected center X") - finite(deviation.actual_center[0], "Actual center X"),
      finite(deviation.expected_center[1], "Expected center Y") - finite(deviation.actual_center[1], "Actual center Y"),
      finite(deviation.expected_center[2], "Expected center Z") - finite(deviation.actual_center[2], "Actual center Z"),
    ];
    const tolerance = deviation.tolerance ?? 0;
    if (Math.hypot(...delta) <= tolerance) return [];
    return [{ instance_id: deviation.instance_id, operation: "TRANSLATE" as const, delta }];
  });
}
