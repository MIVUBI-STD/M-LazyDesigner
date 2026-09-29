export type Vec3 = readonly [number, number, number];

export type ContactSample = {
  time: number;
  marker: Vec3;
  target: Vec3;
};

export type ContactConstraintInput = {
  id: string;
  mode: "pair" | "fixed" | "planted";
  tolerance: number;
  samples: readonly ContactSample[];
};

function validVec3(value: Vec3): boolean {
  return value.length === 3 && value.every(Number.isFinite);
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

/**
 * Deterministic contact evidence. Callers provide sampled world positions from
 * real runtime/editor state; this helper does not pose the model or infer contact.
 */
export function analyzeAnimationContactEvidence(input: {
  constraints: readonly ContactConstraintInput[];
  exampleLimit?: number;
}) {
  const exampleLimit = input.exampleLimit ?? 8;
  if (!Number.isInteger(exampleLimit) || exampleLimit < 1 || exampleLimit > 100) {
    return { state: "unavailable" as const, reason: "example_limit_invalid" as const };
  }

  const results = [] as Array<{
    id: string;
    mode: ContactConstraintInput["mode"];
    tolerance: number;
    sample_count: number;
    violation_count: number;
    max_distance: number;
    mean_distance: number;
    max_marker_drift_from_first: number | null;
    status: "pass" | "review";
    violation_examples: Array<{ time: number; distance: number }>;
    violation_examples_truncated: boolean;
  }>;
  let invalidConstraintCount = 0;

  for (const constraint of input.constraints) {
    if (
      constraint.id.trim().length === 0 ||
      !Number.isFinite(constraint.tolerance) ||
      constraint.tolerance < 0
    ) {
      invalidConstraintCount += 1;
      continue;
    }

    const samples = constraint.samples
      .filter((sample) => Number.isFinite(sample.time) && validVec3(sample.marker) && validVec3(sample.target))
      .sort((a, b) => a.time - b.time);
    if (samples.length === 0) {
      invalidConstraintCount += 1;
      continue;
    }

    const distances = samples.map((sample) => ({
      time: sample.time,
      distance: distance(sample.marker, sample.target),
    }));
    const violations = distances.filter((entry) => entry.distance > constraint.tolerance);
    const firstMarker = samples[0]!.marker;
    const maxDrift = constraint.mode === "planted"
      ? Math.max(...samples.map((sample) => distance(sample.marker, firstMarker)))
      : null;

    results.push({
      id: constraint.id,
      mode: constraint.mode,
      tolerance: constraint.tolerance,
      sample_count: samples.length,
      violation_count: violations.length,
      max_distance: round(Math.max(...distances.map((entry) => entry.distance))),
      mean_distance: round(distances.reduce((sum, entry) => sum + entry.distance, 0) / distances.length),
      max_marker_drift_from_first: maxDrift === null ? null : round(maxDrift),
      status: violations.length === 0 ? "pass" : "review",
      violation_examples: violations.slice(0, exampleLimit).map((entry) => ({
        time: round(entry.time),
        distance: round(entry.distance),
      })),
      violation_examples_truncated: violations.length > exampleLimit,
    });
  }

  const reviewCount = results.filter((entry) => entry.status === "review").length;
  return {
    state: "available" as const,
    visual_verdict: "not_evaluated" as const,
    constraint_count: results.length,
    invalid_constraint_count: invalidConstraintCount,
    review_constraint_count: reviewCount,
    pass_constraint_count: results.length - reviewCount,
    constraints: results,
    note: "Contact evidence is geometric/runtime evidence only. A passing distance tolerance does not prove believable weight, timing, deformation, or visual quality; reference-grounded native playback remains required.",
  };
}
