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
  /** Ranking of caller estimates only; no claim of visual quality or convergence. */
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
  if (ew + mw + rw === 0) throw new Error("Correction ranking requires a nonzero weight.");

  const seenIds = new Set<string>();
  const eligible = candidates.filter((candidate) => {
    if (!candidate.id || candidate.id !== candidate.id.trim() || seenIds.has(candidate.id)) {
      throw new Error("Correction candidate IDs must be unique and non-empty.");
    }
    seenIds.add(candidate.id);
    finiteNonNegative(candidate.predicted_error, candidate.id + " predicted error");
    finiteNonNegative(candidate.mutation_cost, candidate.id + " mutation cost");
    finiteNonNegative(candidate.risk, candidate.id + " risk");
    return candidate.risk <= maximumRisk;
  });
  if (eligible.length === 0) throw new Error("Correction solver has no candidate within the allowed risk boundary.");

  const ranked = eligible
    .map((candidate) => {
      const score = candidate.predicted_error * ew + candidate.mutation_cost * mw + candidate.risk * rw;
      if (!Number.isFinite(score)) throw new Error("Correction ranking score overflowed.");
      return { candidate, score };
    })
    .sort((a, b) => a.score - b.score || a.candidate.id.localeCompare(b.candidate.id));

  const selected = ranked[0];
  return {
    selected: selected.candidate,
    rejected_ids: candidates.filter((candidate) => candidate.id !== selected.candidate.id).map((candidate) => candidate.id).sort(),
    score: selected.score,
  };
}
