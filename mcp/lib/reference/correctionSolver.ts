export type CorrectionCandidate<T> = {
  id: string;
  patch: T;
  predicted_error: number;
  mutation_cost: number;
  risk: number;
};

export type CorrectionSolverOptions = {
  error_weight?: number;
  mutation_weight?: number;
  risk_weight?: number;
  maximum_risk?: number;
};

export type CorrectionDecision<T> = {
  selected: CorrectionCandidate<T>;
  rejected_ids: string[];
  score: number;
};

function finiteNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(label + " must be finite and non-negative.");
  return value;
}

export function selectLowestCostCorrection<T>(
  candidates: readonly CorrectionCandidate<T>[],
  options: CorrectionSolverOptions = {}
): CorrectionDecision<T> {
  if (candidates.length === 0) throw new Error("Correction solver requires at least one candidate.");
  const ew = finiteNonNegative(options.error_weight ?? 1, "Correction error weight");
  const mw = finiteNonNegative(options.mutation_weight ?? 0.35, "Correction mutation weight");
  const rw = finiteNonNegative(options.risk_weight ?? 0.65, "Correction risk weight");
  const maximumRisk = finiteNonNegative(options.maximum_risk ?? 1, "Correction maximum risk");

  const eligible = candidates.filter((candidate) => {
    if (!candidate.id) throw new Error("Correction candidate requires a non-empty id.");
    finiteNonNegative(candidate.predicted_error, candidate.id + " predicted error");
    finiteNonNegative(candidate.mutation_cost, candidate.id + " mutation cost");
    finiteNonNegative(candidate.risk, candidate.id + " risk");
    return candidate.risk <= maximumRisk;
  });
  if (eligible.length === 0) throw new Error("Correction solver has no candidate within the allowed risk boundary.");

  const ranked = eligible
    .map((candidate) => ({
      candidate,
      score: candidate.predicted_error * ew + candidate.mutation_cost * mw + candidate.risk * rw,
    }))
    .sort((a, b) => a.score - b.score || a.candidate.id.localeCompare(b.candidate.id));

  const selected = ranked[0];
  return {
    selected: selected.candidate,
    rejected_ids: candidates.filter((candidate) => candidate.id !== selected.candidate.id).map((candidate) => candidate.id).sort(),
    score: selected.score,
  };
}
