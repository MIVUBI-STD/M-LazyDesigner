import type { RecipeVec3 } from "@/lib/authoringRecipe/contracts";
import type { SemanticGeometryEditIntent } from "@/lib/authoringRecipe/semanticEdit";

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

function nonNegativeTolerance(value: number | undefined, label: string): number {
  const resolved = value ?? 0;
  if (!Number.isFinite(resolved) || resolved < 0) throw new Error(label + " must be finite and non-negative.");
  return resolved;
}

export function deriveReferenceCorrectionVectors(
  deviations: readonly ReferenceDeviation[]
): ReferenceCorrectionVector[] {
  const corrections: ReferenceCorrectionVector[] = [];
  for (const deviation of deviations) {
    if (!deviation.instance_id) throw new Error("Reference deviation requires an instance identity.");
    if (deviation.kind === "BOUNDS") {
      const delta = finite(deviation.expected, "Expected bound") - finite(deviation.actual, "Actual bound");
      const tolerance = nonNegativeTolerance(deviation.tolerance, "Bounds tolerance");
      if (Math.abs(delta) > tolerance) {
        corrections.push({ instance_id: deviation.instance_id, operation: "RESIZE_AXIS", axis: deviation.axis, delta });
      }
      continue;
    }
    if (deviation.kind === "ROTATION") {
      const delta = finite(deviation.expected_degrees, "Expected rotation") - finite(deviation.actual_degrees, "Actual rotation");
      const tolerance = nonNegativeTolerance(deviation.tolerance_degrees, "Rotation tolerance");
      if (Math.abs(delta) > tolerance) {
        corrections.push({ instance_id: deviation.instance_id, operation: "ROTATE_AXIS", axis: deviation.axis, delta_degrees: delta });
      }
      continue;
    }
    const delta: RecipeVec3 = [
      finite(deviation.expected_center[0], "Expected center X") - finite(deviation.actual_center[0], "Actual center X"),
      finite(deviation.expected_center[1], "Expected center Y") - finite(deviation.actual_center[1], "Actual center Y"),
      finite(deviation.expected_center[2], "Expected center Z") - finite(deviation.actual_center[2], "Actual center Z"),
    ];
    const tolerance = nonNegativeTolerance(deviation.tolerance, "Center tolerance");
    if (Math.hypot(...delta) > tolerance) {
      corrections.push({ instance_id: deviation.instance_id, operation: "TRANSLATE", delta });
    }
  }
  return corrections;
}

export function compileReferenceCorrectionsToGeometryIntents(
  corrections: readonly ReferenceCorrectionVector[]
): SemanticGeometryEditIntent[] {
  return corrections.map((correction) => {
    const target = { instance_ids: [correction.instance_id] };
    if (correction.operation === "TRANSLATE") {
      return { target, operation: { kind: "TRANSLATE" as const, delta: correction.delta } };
    }
    if (correction.operation === "ROTATE_AXIS") {
      return {
        target,
        operation: {
          kind: "ROTATE_AXIS" as const,
          axis: correction.axis,
          delta_degrees: correction.delta_degrees,
        },
      };
    }
    return {
      target,
      operation: {
        kind: "RESIZE_AXIS" as const,
        axis: correction.axis,
        mode: "ADD" as const,
        value: correction.delta,
        anchor: "CENTER" as const,
      },
    };
  });
}
