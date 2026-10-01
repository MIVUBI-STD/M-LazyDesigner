# LazyDesigner Modelling Correction and Convergence Reference

This file is loaded only for its named modelling decision. Durable Geometry policy remains in `docs/03-authoring/modelling/standard.md`; the modelling Skill owns hot-path execution triggers.


Load only when a bounded geometry correction/convergence loop or post-mutation evidence recovery is active.

## Local Correction / Convergence
Correction continuation is runtime-owned and incremental:

```text
CANDIDATE_CONTEXT → DECISION_SUMMARY → VERIFY_PENDING → PRUNED_READY → CLEAR/BLOCKED
FULL | DELTA | CACHED | DEFERRED
```

Reuse `continuation_id` via `knownContinuationIds`. `decision_summary` is immediate-handoff only; later turns use the pruned continuation containing unresolved discrepancies, fresh per-view evidence handles, and pending verification. Known unchanged state → CACHED; known changed base → DELTA; unknown base → FULL. Same-mode/state micro updates may be DEFERRED inside a runtime-owned semantic group, but any mode/state change flushes immediately. Resolved branches, stale handles, old candidate IDs/metrics, full recipe state, and fingerprints do not persist model-facing. Full rejected candidate patches remain ephemeral. Evidence recovery is fail-closed: expired or cross-generation evidence requires complete fresh stale-view coverage before correction resumes, does not consume an attempt, aborts open grouping, and unknown continuation base uses FULL. `UNKNOWN_OUTCOME` never auto-retries. Gateway process restart invalidates process-local handles; resume from fresh status, Runtime/Workspace/Reference state, and fresh required evidence rather than replaying old correction/evidence/continuation IDs.

For correction ambiguity, do not enumerate a large option tree. Candidate budget follows verification risk: `LOW=1 | MEDIUM=2 | HIGH=3`. Each executable candidate must stay inside one supported family: `TRANSLATE→TRANSLATE`, `RESIZE→RESIZE_AXIS`, `ROTATE→ROTATE_AXIS`, `LAYER_OFFSET→TRANSLATE|RESIZE_AXIS|INFLATE`. `REATTACH | SPLIT | MERGE_REMOVE | ADD_MASS` require their owning structural path and must not be disguised as semantic-edit candidates. If the bounded candidate set is still insufficient, keep the decision ambiguous/blocked rather than emitting more speculative candidates.

For a visual mismatch, compress judgment into the existing `CompactAuthoringIntent`; do not replay a prose diagnosis before execution:

```text
target
difference = { criterion, severity, view, delta, claim_id? }
correction_family = TRANSLATE | RESIZE | ROTATE | REATTACH | LAYER_OFFSET | SPLIT | MERGE_REMOVE | ADD_MASS
geometry_operations = exact semantic operation(s)
preserve = only affected invariants
```

`delta` is one bounded observable mismatch, not an explanation. Reuse fresh exact authored state; otherwise inspect once. `LAYER_OFFSET` uses translate/resize or justified inflate/deflate, never a universal epsilon. `MERGE_REMOVE`/`REATTACH` preserve assembly boundaries/openings; mapped/textured `RESIZE` preflights UV/pixel impact.
When multiple discrepancies exist, bind the chosen correction to `target_discrepancy_codes`; re-verification should carry only those targeted stale discrepancies while keeping the complete evidence set local in the correction registry. When discrepancy view provenance is complete, recapture only targeted stale views and reuse unrelated prior views through the existing evidence handle. If provenance is incomplete, recapture conservatively; never infer view freshness. After mutation, recapture only affected evidence and judge `IMPROVED | UNCHANGED | REGRESSED`; progress requires improvement with no material regression. Same causal direction failing twice without new evidence → `BLOCKED`.
