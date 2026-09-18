# Native Validation Execution Packet

Status: execution-ready plan on branch `Ref`; native execution not yet performed.

## Current Readiness

Repository inspection shows:

- `workspace/active/` contains only the legacy `lift` project;
- `workspace/saved/` contains no current authored asset projects;
- the legacy Lift asset is explicitly excluded as a craftsmanship / quality authority.

Therefore the native experiment is currently blocked by the absence of a current-quality LazyDesigner-owned validation asset.

Do **not** use Lift to satisfy this requirement.

## First Native Action

Create a fresh current-quality T1 validation asset using the normal LazyDesigner workflow:

```text
approved reference
→ workspace/active/<new-validation-asset>/
→ requirement gate
→ Geometry authoring
→ visual review
→ user approval / authorized verification
→ continue only as required by the T1 scope
```

The asset must be authored by LazyDesigner itself; external corpus assets remain learning evidence only.

## T1 Selection Criteria

Choose a simple prop with one of these properties:

- one optional/local visual variant; or
- one articulated local part; or
- one moving attachment/reference point.

Avoid:

- old/deprecated fixtures;
- highly complex characters for the first test;
- assets whose quality cannot be judged from the approved reference;
- copied external corpus geometry.

Preferred T1 characteristics:

```text
clear silhouette
clear dimensions
1–2 obvious transform responsibilities
small enough to inspect causality
large enough to expose over-rigging if it occurs
```

## Baseline Pass

Use only canonical current LazyDesigner policy.

Record before authoring:

- exact repo source SHA;
- installed Runtime/build identity;
- approved reference;
- requested dimensions;
- animation requirement;
- front direction.

During authoring record only experiment observations, not a tool transcript:

- owner/group/bone count at Geometry READY_FOR_USER_REVIEW;
- Locator count;
- correction rounds;
- repeated same-cause failures;
- visual capture batches;
- tool calls to accepted result.

Final baseline outcome:

```text
quality verdict: PASS | FAIL | UNVERIFIED
accepted by user / authorized verification: YES | NO
```

## Candidate Pass

Start again from the same approved reference and same requested scope.

Use canonical policy plus only the compact candidate rules relevant to T1:

```text
preserve base semantic ownership where possible
local variant → smallest changed branch
do not grow rig/clip/controller complexity without causal need
animated Locator allowed only when it owns a moving attachment/reference transform
```

Do not expose corpus examples to the candidate pass as templates.

## T1 Comparison

Compare:

| Category | Baseline | Candidate | Interpretation |
| --- | --- | --- | --- |
| visual quality |  |  | quality must not regress |
| required part completeness |  |  | no missing/unsupported parts |
| owner count |  |  | lower is useful only if capability preserved |
| Locator count |  |  | diagnostic only |
| correction rounds |  |  | fewer can support efficiency |
| repeated same-cause failures |  |  | should not increase |
| capture batches |  |  | avoid evidence churn |
| tool calls to accepted result |  |  | secondary to quality |
| hierarchy rework after motion/state need appears |  |  | candidate should not defer necessary structure |

## T1 Decision

### PASS FOR NEXT TEST

Use when:

- candidate accepted quality is equal or better;
- no required capability is lost;
- candidate reduces unnecessary hierarchy OR improves correction clarity/cost;
- no hidden later rework invalidates the apparent simplification.

Then continue to T2 mechanical/vehicle.

### KEEP EXPERIMENTAL

Use when quality is equivalent but efficiency/clarity difference is inconclusive.

### NARROW

Use when only one bounded rule such as smallest-changed-branch shows clear value.

### REJECT

Use when candidate produces:

- worse accepted quality;
- under-rigging;
- late hierarchy rebuild caused by excessive reuse;
- speculative variant fragmentation;
- attachment/pivot ambiguity.

## T2–T4 Continuation

Only after T1 does not expose an obvious overdevelopment/under-rigging failure:

```text
T2 mechanical / vehicle
→ R1 R2 R3 R4 R5

T3 character / humanoid
→ R1 R2 R3 R4

T4 related creature pair
→ R1 R2 R6
```

Each task reuses the baseline-vs-candidate contract from `native-validation-matrix.md`.

## Evidence Integrity

Never claim native validation from:

- GitHub source inspection;
- synthetic benchmark PASS;
- external corpus examples;
- valid hierarchy alone;
- tool success alone;
- stored screenshots from another revision.

Native promotion evidence requires fresh current-revision Blockbench/reference comparison.

## Promotion Gate

No research refinement moves to `Local` until the applicable native test produces an evidence-backed `PROMOTE` or bounded `NARROW` outcome.

Until then:

```text
Ref = research authority
Local = unchanged canonical authority
```