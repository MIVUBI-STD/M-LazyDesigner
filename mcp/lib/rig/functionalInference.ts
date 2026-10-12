import type { CompiledAuthoringRecipe, CompiledCubePlacement } from "@/lib/authoringRecipe/contracts";
import type { MechanicalRigIntent } from "@/lib/rig/mechanicalTemplates";

export type FunctionalPartKind = "HINGE" | "SLIDER" | "ROTATOR" | "STATIC";

/** Caller-supplied, independently reviewed mechanism intent; never inferred from a Cube name. */
export type ConfirmedMechanicalIntent =
  | { kind: "HINGE"; axis: "X" | "Y" | "Z"; hinge_side: "MIN" | "MAX"; evidence_ref: string }
  | { kind: "SLIDER" | "ROTATOR"; axis: "X" | "Y" | "Z"; evidence_ref: string };

export type FunctionalRigHint = {
  instance_id: string;
  kind: FunctionalPartKind;
  axis?: "X" | "Y" | "Z";
  hinge_side?: "MIN" | "MAX";
  /** Uncalibrated name/shape heuristic score, not a probability of correct rigging. */
  confidence: number;
  evidence: string[];
  /** Explicit intent from current user/reference/native evidence; compiler cannot attest that source. */
  confirmed_intent?: ConfirmedMechanicalIntent;
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
        confidence: 0.45,
        evidence: [named.evidence, "axis:longest-dimension-guess", "mechanism:unverified", "review-required"],
      };
    }

    return {
      instance_id: placement.id,
      kind: named.kind,
      axis,
      confidence: 0.6,
      evidence: [named.evidence, "axis:name-token", "mechanism:unverified", "review-required"],
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
  const intents: MechanicalRigIntent[] = [];
  const seen = new Set<string>();
  for (const hint of hints) {
    if (!hint.instance_id || hint.instance_id !== hint.instance_id.trim() || seen.has(hint.instance_id)) {
      throw new Error("Functional rig hints require unique non-empty instance IDs.");
    }
    seen.add(hint.instance_id);
    if (!Number.isFinite(hint.confidence) || hint.confidence < 0 || hint.confidence > 1) {
      throw new Error("Functional rig hint confidence must be finite within 0..1.");
    }
    // Name and longest-axis hints are useful proposals, never authority for native rig mutation.
    const confirmed = hint.confirmed_intent;
    if (!confirmed || hint.confidence < minimumConfidence) continue;
    if (!confirmed.evidence_ref || confirmed.evidence_ref !== confirmed.evidence_ref.trim()) {
      throw new Error("Confirmed mechanical rig intent needs an explicit evidence reference.");
    }
    const base = {
      id: "auto:" + hint.instance_id,
      name: "auto_" + hint.instance_id.replace(/[^a-zA-Z0-9_]+/g, "_"),
      instance_id: hint.instance_id,
    };
    if (confirmed.kind === "HINGE") {
      intents.push({ ...base, kind: "HINGE", hinge_axis: confirmed.axis, hinge_side: confirmed.hinge_side });
    } else if (confirmed.kind === "SLIDER") {
      intents.push({ ...base, kind: "SLIDER", axis: confirmed.axis });
    } else if (confirmed.kind === "ROTATOR") {
      intents.push({ ...base, kind: "ROTATOR", axis: confirmed.axis });
    } else {
      throw new Error("Unsupported confirmed mechanical intent.");
    }
  }
  return intents;
}
