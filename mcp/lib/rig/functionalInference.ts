import type { CompiledAuthoringRecipe, CompiledCubePlacement } from "@/lib/authoringRecipe/contracts";
import type { MechanicalRigIntent } from "@/lib/rig/mechanicalTemplates";

export type FunctionalPartKind = "HINGE" | "SLIDER" | "ROTATOR" | "STATIC";

export type FunctionalRigHint = {
  instance_id: string;
  kind: FunctionalPartKind;
  axis?: "X" | "Y" | "Z";
  hinge_side?: "MIN" | "MAX";
  confidence: number;
  evidence: string[];
};

function longestAxis(placement: CompiledCubePlacement): "X" | "Y" | "Z" {
  const sizes = placement.to.map((value, index) => value - placement.from[index]);
  const max = Math.max(...sizes);
  return (["X", "Y", "Z"] as const)[sizes.indexOf(max)];
}

function explicitAxis(name: string): "X" | "Y" | "Z" | undefined {
  const match = name.toLowerCase().match(/(?:^|[_:\-])(x|y|z)(?:$|[_:\-])/);
  return match ? (match[1].toUpperCase() as "X" | "Y" | "Z") : undefined;
}

function classifyName(name: string): { kind: FunctionalPartKind; evidence: string } | null {
  const lower = name.toLowerCase();
  if (/(door|lid|flap|lever|hinge)/.test(lower)) return { kind: "HINGE", evidence: "name:hinged-part" };
  if (/(slider|drawer|piston|rail|slide)/.test(lower)) return { kind: "SLIDER", evidence: "name:linear-part" };
  if (/(wheel|knob|dial|fan|rotor|gear)/.test(lower)) return { kind: "ROTATOR", evidence: "name:rotating-part" };
  return null;
}

export function inferFunctionalRigHints(compiled: CompiledAuthoringRecipe): FunctionalRigHint[] {
  return compiled.placements.map((placement) => {
    const named = classifyName(placement.name);
    if (!named) {
      return { instance_id: placement.id, kind: "STATIC", confidence: 0.2, evidence: ["no-functional-evidence"] };
    }

    const axis = explicitAxis(placement.name);
    if (!axis) {
      return {
        instance_id: placement.id,
        kind: named.kind,
        axis: longestAxis(placement),
        ...(named.kind === "HINGE" ? { hinge_side: "MIN" as const } : {}),
        confidence: 0.55,
        evidence: [named.evidence, "axis:heuristic-only", "review-required"],
      };
    }

    return {
      instance_id: placement.id,
      kind: named.kind,
      axis,
      ...(named.kind === "HINGE" ? { hinge_side: "MIN" as const } : {}),
      confidence: 0.82,
      evidence: [named.evidence, "axis:explicit-name-token"],
    };
  });
}

export function compileHighConfidenceFunctionalRig(
  hints: readonly FunctionalRigHint[],
  minimumConfidence = 0.8
): MechanicalRigIntent[] {
  if (!Number.isFinite(minimumConfidence) || minimumConfidence < 0 || minimumConfidence > 1) {
    throw new Error("Functional rig confidence threshold must be within 0..1.");
  }
  return hints.flatMap((hint) => {
    if (hint.kind === "STATIC" || hint.confidence < minimumConfidence) return [];
    if (!hint.axis) throw new Error("Functional rig hint " + hint.instance_id + " requires an axis.");
    const base = {
      id: "auto:" + hint.instance_id,
      name: "auto_" + hint.instance_id.replace(/[^a-zA-Z0-9_]+/g, "_"),
      instance_id: hint.instance_id,
    };
    if (hint.kind === "HINGE") {
      return [{ ...base, kind: "HINGE" as const, hinge_axis: hint.axis, hinge_side: hint.hinge_side ?? "MIN" }];
    }
    if (hint.kind === "SLIDER") {
      return [{ ...base, kind: "SLIDER" as const, axis: hint.axis }];
    }
    return [{ ...base, kind: "ROTATOR" as const, axis: hint.axis }];
  });
}
