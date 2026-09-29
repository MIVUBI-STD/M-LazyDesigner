# Geometry Verification, UV, and Correction Reference

Load this file only when the active task reaches one of these conditions:

- fresh Geometry evidence is being judged against an approved reference;
- Geometry is approved and production UV layout is beginning;
- a local correction/convergence loop is active;
- continuation/evidence recovery semantics are needed after a mutation or reconnect.

The hot-path modelling rules remain in `../SKILL.md`. This reference adds the detailed verification, UV, and correction semantics without changing those gates.

## Primary Build / Difference-First Reference Fidelity Verdict
`requirement → source evidence → selected profile guidance → simplest recognizable Blockbench-buildable interpretation → PRIMARY BLOCKOUT + required hierarchy/pivots → primary PASS → identity-weighted secondary geometry`.

Verdict requires approved reference + fresh current-revision model evidence:
`claim | matching reference view | current view | observed difference | severity | owning cause | FAIL | UNVERIFIED | PASS`.
Mutation stales affected captures. Correct first cause, then recapture affected views. `capture_model_views` correspondence metadata only maps captures to canonical board slots; it is not a scorer and never creates visual PASS.
Tool success, coordinates, bounds, hierarchy, validators, or similarity scores cannot justify `PASS`. Internal Geometry `PASS` requires form/depth, surface integrity, hierarchy/pivots, and no major defect.

**Largest-difference-first:** rank only material visible differences by construction consequence, not pixel area. Fix in this order when applicable: missing/extra required part → wrong topology/attachment → wrong primary silhouette/proportion/depth → broken negative space/contact → pivot/motion-readiness defect → secondary geometric detail. Do not spend a correction round polishing a smaller difference while a higher-order structural defect remains.

**Cross-view regression rule:** a correction is accepted only when the intended difference improves and no required orthographic relation materially regresses. A front-view improvement that breaks side depth, rear attachment, top footprint, or motion clearance is `REGRESSED`, not progress.

Before user review, state the largest remaining reference differences at comparable angle/scale, including depth and identity landmarks. Neutral contact alone cannot certify an articulated assembly: inspect required closed boundaries in representative extremes, especially jaw/cheek/chest and limb attachments when present. Correct the owning structure before detail or production keys; do not hide unresolved gaps behind texture or filler Cubes.

**UV Readiness Preflight** checks thin/Box-UV collapse, aspect/representation, seam/unique-region blockers. Read-only: no production UV/`UV Layout PASS`. **User Geometry APPROVED is required** before production UV.
Layered contacts and exposed undersides need an affected side/bottom view when front/three-quarter views conceal the boundary. Distinguish dark material from actual missing surface; a prior approval does not clear a newly observed major defect.

## Native UV Layout / Texel Integrity
`Geometry APPROVED → create_texture(type=template), explicit pixel_density, rearrange_uv=true, power_of_two=true → native UV/template → audit → UV Layout PASS → Texturing`.

No guessed/stretched islands. Prefer per-face UV; use minimum proven native power-of-two packing. Audit padding/aspect/orientation/overlap/reuse/asymmetry. `uv_audit.production_gate=ready` is hygiene, not UV Layout PASS. Requested atlas size and density are constraints. Do not silently enlarge the atlas.
Review the actual atlas and mapped adjoining surfaces together: group islands by editable semantic cohorts, allocate detail to identity-critical regions, and explain intentional mirroring or seams. Record technical validity separately from this layout verdict. Fractional logical UV can be valid when physical pixel mapping is integral; never resize approved Geometry solely to obtain integer logical coordinates.
Native packing is a starting layout. Keep named body/head/appendage cohorts in readable zones with coherent order and gutters. Reposition exact native islands via UV offsets without stretching; verify bounds/overlap. Scattered placement fails editability even if the audit is ready. Unused atlas stays transparent.

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
