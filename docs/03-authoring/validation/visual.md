# LazyDesigner — Visual Validation

**Status:** Active Policy  
**Version:** 1.6  
**Updated:** 2026-09-18

## Purpose

Define the minimum evidence required before LazyDesigner claims that a Blockbench
model visually matches the requested scope.

Reference preparation belongs to [04-reference-guide.md](04-reference-guide.md).
This note validates the Blockbench result.
Comparison captures require Shading ON. Record shading, view/front direction, and artifact revision with the image; unknown/off shading is not final comparison evidence. Use the same lighting context for before/after judgements. Blockbench preview shading supports review but does not prove actual Minecraft in-game lighting.

## Core Principle

**Structural success is not visual success.**

None of these proves resemblance by itself:

- successful MCP/tool call;
- all Cubes existing;
- Cubes touching/overlapping;
- valid `from/to/origin/rotation` values;
- valid hierarchy/parenting;
- matching global bounds;
- saved/reopenable file;
- linked UV/texture data;
- numeric similarity/IoU/projection score.

A material visual `PASS` requires **both the actual approved reference image and fresh current-revision model image evidence to be visible to the reviewing model in the active comparison context**.

A filename/path/manifest, Reference Evidence Map, prose description, remembered reference, prior observation summary, or old model screenshot is not a substitute for those images.

## Reference Claim / View Grounding

Use a compact Reference Evidence Map only when material identity/view/attachment ambiguity needs explicit tracking; otherwise state the concrete difference and supporting views directly:

```text
claim_id | observable reference claim | supporting reference view(s) | evidence state
```

The map is navigation/cache for current reasoning, not independent visual proof. If the actual image contradicts a cached claim, the image wins and the claim must be re-grounded.

Compare like with like; use an explicit View Pair Map when correspondence is materially ambiguous:

```text
REFERENCE FRONT ↔ MODEL front
REFERENCE BACK  ↔ MODEL back
REFERENCE SIDE  ↔ MODEL matching left/right
REFERENCE TOP   ↔ MODEL top
REFERENCE 3/4   ↔ MODEL matching front_left_3q/front_right_3q
```

View identity must be explicit. Ambiguous/mirrored front/back, left/right, or 3/4 pairing leaves the affected claim `UNVERIFIED`; **do not silently compare the closest-looking view**.

## Visual Verdict Contract

Every material visual gate must end in exactly one state:

```text
FAIL
UNVERIFIED
PASS
```

### FAIL

Use when any critical or major mismatch is visible in an applicable criterion. The review must name the mismatch and corresponding reference/model view evidence; include `claim_id` only when a claim map was needed.

### UNVERIFIED

Use when evidence needed for the claim is missing or insufficient. Examples include missing actual reference image, missing current model view, invalid/ambiguous View Pair Map, missing side/depth evidence, materially conflicting views, or unavailable capture. Missing evidence is not a visual pass.

### PASS

Use only after the **actual approved reference image and fresh current-revision model images were directly inspected together through the correct paired view(s)**, a difference-first review checked the applicable supported claim, and no critical/major mismatch was found.

A claim may be narrower than the whole model. For example, a front silhouette can pass while depth remains UNVERIFIED. Do not upgrade a partial-view success into a full 3D PASS.

### Claim-locked difference-first review

Before approval, actively search for mismatch in each relevant paired claim/view:

```text
claim_id
REFERENCE VIEW ↔ CURRENT MODEL VIEW
observable reference requirement
silhouette / primary mass / count difference
primary proportion / placement difference
orientation / slope difference
visible contact / topology difference
negative-space difference when material
severity: critical / major / minor / none
verdict: FAIL | UNVERIFIED | PASS
```

Only after this mismatch search may the reviewer choose PASS. Generic positive language is not a substitute for this comparison.

## Evidence Types

### Structural Evidence

Examples:

- element UUIDs;
- authored transforms;
- hierarchy/parent state;
- rendered global envelope;
- save/runtime state.

Structural evidence answers **what state exists**, not whether it looks right.

### Reference Visual Evidence

The **actual approved reference image** currently visible to the reviewing model. A path/manifest/metadata/text summary by itself is not visual evidence.

### Model Visual Evidence

Fresh model images from the current revision, in views that correspond to the
reference question being evaluated.

Visual evidence answers **whether the form reads correctly**.

After a material geometry/pivot/hierarchy mutation, affected previous model views are stale until re-captured.

### Runtime Evidence

Live proof of Blockbench/MCP behavior such as camera/render transport, Undo,
project switching, animation, save/reopen, or persistence.

Static GitHub source is not runtime evidence.

## Current Local Observation Instruments

Current Local source includes:

### `inspect_model_bounds`

Returns raw rendered whole-Cube envelope facts such as size/center/ground context.

Use `inspect_model_bounds` only for material envelope/scale/ground/displacement or bounded surface/contact questions; reuse fresh evidence. Do not call it as a mandatory modelling checkpoint. It is structural evidence, not a visual validator.

### `capture_model_views`

Produces named canonical **model images** for explicit front direction and stable
reference ↔ model comparison.

Principal views are orthographic comparison evidence; 3/4 views are volume/
readability context. Successful capture is not `PASS`. It does not itself load/score the approved reference or judge resemblance.

### `inspect_elements(mode=detail)`

Returns exact authored Cube/Group state for a diagnosed local target. Reuse fresh exact state already returned for that target when sufficient; use `inspect_elements(mode=detail)` only when required state is unavailable, insufficient, or stale. Do not add a mandatory readback before every numeric correction.

These are source-implemented capabilities. Their live integration/image delivery
still remains `LOCAL PROOF REQUIRED` until tested locally.

## Reference ↔ Model View Pairing

Compare like with like using the View Pair Map. Do not silently compare mismatched front/back or left/right interpretations.

Do not require every view after every mutation. Capture the smallest view set
that can answer the current modelling question.

## Cross-View Validity

A whole-form verdict must cover the views/axes that the claim actually depends on.

```text
front PASS + side FAIL        -> whole-form FAIL
front PASS + side unavailable -> whole-form UNVERIFIED for depth/side claims
front PASS + conflicting side/top reference -> BLOCKED if the conflict materially affects primary form and cannot be resolved
```

Do not promote the strongest-looking view to represent the whole 3D model. For each material mismatch/approval, name the paired view that supports it and keep unsupported axes provisional or unverified.

### Blocked validation

`BLOCKED` is not a visual quality grade. It means a valid visual verdict cannot currently be reached without guessing because the actual approved image is unavailable, view pairing cannot be resolved, material reference evidence conflicts, required observation/capability is unavailable, or repeated failed work has exhausted the bounded correction direction.

When blocked, stop speculative corrections and report:

```text
blocker category
evidence
claim/result that cannot be validated
bounded attempts already made
exact requirement to unblock
```

If the same causal correction direction fails twice without new evidence, treat continued patching as a loop and stop. Do not manufacture a success report from repeated attempts.

## Structural Envelope Gate

When approved numeric target bounds exist:

1. inspect current rendered bounds;
2. compare width/height/length/center/ground with the target envelope;
3. use explicit target-envelope framing for visual capture where appropriate.

This prevents auto-framing from hiding scale/offset failure.

Matching bounds remain **structural evidence only**.

## Gate 1 — Primary Whole Form

Before secondary/detail work, check grounded material claims for:

- recognizability;
- required primary masses/landmarks/counts;
- global silhouette;
- major proportions;
- primary mass placement;
- important orientation/slopes;
- major visible contacts/topology;
- important negative spaces/separations.

For a material mismatch, identify:

```text
claim_id
failed criterion
responsible mass/relationship when known
observed mismatch
reference/model view(s)
severity: critical | major | minor
```

Statements such as “looks good”, “everything is attached”, or “all Cubes are
present” cannot produce `PASS`.

### Hard Rebuild Threshold

Reject/rebuild the primary scaffold when:

- the intended object is not recognizable;
- several primary relationships fail together;
- semantic decomposition itself omitted/misread material parts;
- repair would require detail/compensating geometry to hide a wrong whole form.

If decomposition is wrong, return to Semantic Form against actual reference claims. If decomposition is sound but spatial relationships are globally wrong, return to Primary Form Hypothesis. Do not micro-patch a globally wrong scaffold because work has already been spent on it.

## Gate 2 — Complete Geometry

After secondary geometry/neutral organization, with form-defining hierarchy/pivots already established when required, review applicable supported claims:

- silhouette/proportions across the declared reference views;
- required major parts/counts and orientation;
- depth/footprint where reference evidence exists;
- coherent visible attachments;
- important negative spaces;
- rotations that correspond to visible form/motion;
- meaningful pivots corresponding to actual transform/joint/attachment needs;
- no arbitrary distant pivot;
- no major unnecessary/intersecting/inverted geometry;
- hierarchy supporting intended editability/motion.

## Gate 3 — Texture

Only when texture is in scope:

- UV orientation/alignment;
- material/pattern direction;
- pixel-density consistency where applicable;
- missing/broken surfaces;
- identity/readability.

Texture cannot approve or conceal wrong primary geometry.

## Gate 4 — Animation

Only when animation is required:

- pivot arcs;
- hierarchy behavior;
- clipping/detachment;
- intended motion/readability;
- return/neutral behavior when relevant.

A static pivot that creates an implausible motion arc is not approved.

## Gate 5 — Final Review

Use the **actual approved reference image plus evidence from the current saved/release candidate**. Do not reuse older model screenshots after material geometry/pivot/hierarchy/texture/animation changes.

## Visual Repair Loop

```text
actual reference image + fresh paired current model evidence
↓
claim_id + concrete mismatch
↓
GLOBAL or LOCAL?

GLOBAL
→ revise Semantic Form when decomposition is wrong
→ otherwise revise/rebuild Primary Form Hypothesis

LOCAL
→ locate exact UUID only if target identity is not already fresh/known
→ reuse fresh exact authored state; inspect_elements(mode=detail) only if unavailable/insufficient/stale
→ choose causal correction
→ retain relevant pre-correction paired evidence
→ mutate bounded relationship
→ fresh affected paired view(s) first; expand only for material cross-view risk
→ qualitative fidelity delta
```

### Causal Correction

Use:

`TRANSLATE`, `RESIZE`, `ROTATE`, `REATTACH`, `SPLIT`, `MERGE/REMOVE`, `ADD MASS`.

Do not default to adding another Cube.

For one multi-Cube relationship, `manage_cubes(operation=batch_update)` may execute different
exact-UUID corrections as one recoverable operation. It does not plan or judge
the correction.

### Fidelity Delta / Convergence

A local correction must prove direction, not merely mutation activity. Compare the relevant fresh pre-correction evidence with fresh post-correction evidence for every materially affected supported claim/view:

```text
IMPROVED | UNCHANGED | REGRESSED
```

A correction counts as progress only when the target mismatch is `IMPROVED` and no previously supported material claim/view is `REGRESSED`. `UNCHANGED` or `REGRESSED` is not progress. If one paired view improves while another material paired view regresses, reject that correction direction; change the causal diagnosis or reopen the owning Primary Form Hypothesis rather than patching around the regression.

This is a qualitative difference-first delta, not a scalar similarity score. Do not aggregate view outcomes into a numeric fidelity score or let one improved view cancel a material regression elsewhere.

## Rotation Review

For a material rotation, answer:

- Which grounded reference/form/motion claim justifies the angle?
- Is the rotated mass improving the intended silhouette rather than compensating
  for wrong placement/size?
- Is the rotation simpler/more coherent than an unnecessary stepped
  approximation?
- Did it damage visible contacts/global bounds?

A newly created non-zero-rotation Cube must have an intentional explicit pivot;
this source-level safety does not itself prove the pivot is visually correct.

A visible material slope left axis-aligned is `FAIL` unless the approved construction language intentionally requires a stepped form.

## Pivot Review

For a meaningful pivot, answer:

- What rotation/joint/attachment/parent-transform purpose does it serve?
- Is it near the intended transform relation rather than a random distant point?
- Does its transform preserve visible attachment/articulation?

### Pivot-only Cube correction

If geometry is already correct and only pivot is wrong, Local uses Cube
pivot-transfer semantics so the pivot can change without intentionally moving the
visual Cube.

### Group pivot

Group/bone pivot changes use Blockbench transfer-origin semantics through `modify_group(origin)`; reserve `bone_rigging` for IK/mirror.

Both behaviors are source implemented; live behavior still requires local proof.

## Severity

### Critical

Makes the model unusable, unrecognizable, or materially different from the
requested target.

### Major

Strongly reduces reference fidelity, readability, attachment, or required
function.

### Minor

Does not block intended use.

Critical/major issues block visual completion.

## Evidence Economy

Good reasons to capture:

- primary whole-form gate;
- complete-geometry gate;
- one targeted correction;
- texture/animation gate;
- final current-revision gate.

Bad reasons:

- after every Cube/tool call;
- to prove that a Cube was technically created;
- to create evidence volume without a decision it informs;
- repeat unchanged views after the criterion is already established.

More screenshots are not automatically more proof.

## Completion Rule

Visual `PASS` is valid only when the **actual approved reference image and fresh current-revision model image(s)** were actually inspected against the relevant grounded claim/view criteria.

Invalid approval justifications include:

```text
all Cubes are present
all Cubes are attached
tool calls succeeded
coordinates are valid
bounds match
hierarchy is valid
rotation/pivot values exist
validator has no error
similarity/IoU/projection score is high
reference path/manifest/summary says it should match
```

## Execution-Channel Boundary

### ChatGPT → GitHub

May review/change source/docs and establish static contracts. Cannot claim live
Blockbench visual/runtime success or model image-understanding accuracy.

### Codex Local

Blockbench + MCP is the final environment for proof requiring actual image
transport, camera behavior, model appearance, animation, Undo, or persistence.

If that proof is unavailable, report `LOCAL PROOF REQUIRED` / user-facing
`Perlu pemeriksaan` rather than inventing a substitute. If the approved reference image itself is unavailable to the reviewing model, reference-driven visual authoring/approval is `BLOCKED` rather than memory-based.

## Related

- [Modelling Workflow](03-modelling-workflow.md)
- [Geometry Standard](05-geometry-standard.md)
- [Validation Report](validation-report.md)
- [Current Flow](../knowledge/flow.md)
