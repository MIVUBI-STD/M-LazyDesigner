# Orca img2blockbench — Workflow Comparison Study

Status: `OBSERVATION` / `PATTERN` extraction only. Not a production dependency or architecture authority.

Source: `orca-gamedev/img2blockbench` (MIT).

## Why This Source Matters

Orca is useful because it addresses a problem adjacent to LazyDesigner: AI-assisted reference-image-to-Blockbench authoring with a deterministic compiler, explicit model specification, validation, render review, and correction loop.

The useful comparison is architectural, not implementation-level. LazyDesigner should not inherit Orca's route system, fixed cuboid counts, source-mesh assumptions, or compiler schema unless independently justified.

## Core Boundary Observed

Orca makes a strong distinction between:

```text
reasoning authority
!=
format/compiler authority
!=
visual acceptance authority
```

The agent owns anatomy, bones, cuboids, materials, landmarks, uncertainties, and review targets. The compiler validates and deterministically emits model files. A clean audit does not establish resemblance or visual quality; final acceptance requires render inspection.

This independently supports an existing LazyDesigner direction: tool success and structural validity are evidence of execution/technical correctness, not visual fidelity.

## Model Specification Findings

Orca's model specification records several categories before final compilation:

- reference identity and provenance;
- subject description and symmetry;
- explicit uncertainties;
- identity-defining features;
- required review views;
- review targets;
- texture density/palette constraints;
- semantic bones and parent chains;
- cubes with semantic/anatomical roles;
- landmarks for identity-critical surface features;
- collision metadata.

Important distinction: the specification is not merely a serialization intermediate. It is also a reasoning contract that records what must survive reconstruction and what remains uncertain.

### Useful Abstractions for LazyDesigner

Three ideas are worth testing because they can fit inside the existing LazyDesigner evidence path without creating a second workflow.

#### 1. Explicit uncertainty record

LazyDesigner already uses evidence states such as `SUPPORTED | PROVISIONAL | CONFLICTING | UNAVAILABLE` and depth states such as `OBSERVED | INFERRED | UNRESOLVED`.

Candidate improvement:

```text
unknown / hidden / inferred feature
→ record what is uncertain
→ record whether it is construction-changing
→ bind it to the affected semantic mass / relation
→ block only when it can change topology, articulation, identity, or required dimensions
```

This should extend the existing Reference Evidence Contract rather than add a new specification system.

Potential compact form:

```text
uncertainty:
  target: <semantic mass / relation>
  issue: <hidden depth / unseen side / ambiguous attachment / marking>
  consequence: NONBLOCKING | CONSTRUCTION_CHANGING
  current_basis: <view/evidence>
```

#### 2. Identity-feature contract

Orca explicitly lists `identity_features` before build and checks whether they survive geometry/texture reduction.

LazyDesigner already tracks identity-bearing silhouette and landmarks, but these are distributed across reference and geometry guidance.

Candidate improvement: maintain a very small task-local list of identity-critical features that must remain recognizable through Geometry, Texture, and Animation.

```text
identity feature
→ representation owner: GEOMETRY | TEXTURE | ANIMATION | MIXED
→ evidence view
→ acceptance check
```

This is valuable because a model can be structurally correct yet lose the small set of traits that makes the subject recognizable.

This should remain transient task evidence, not become a large persistent schema.

#### 3. Declared review targets

Orca states review targets and required views before final review. LazyDesigner already has conditional view logic and deliberately avoids routine five-view capture.

Do not copy Orca's fixed required-render set.

Instead test:

```text
known difference / risk
→ review target
→ smallest view set that can prove or disprove it
```

Examples:

- silhouette → front + side or source-matched 3/4;
- depth → side/top;
- rear attachment → back/affected 3/4;
- bilateral face direction → left/right close-up;
- articulated contact → representative motion extreme;
- texture seam → affected mapped surfaces + atlas.

This reinforces LazyDesigner's Minimum Necessary Evidence rule rather than contradicting it.

## Quality Rubric Findings

Orca evaluates separate concerns:

- reference suitability;
- geometry semantic purpose;
- silhouette;
- texture density and identity preservation;
- pivot/parent anatomy;
- connected-joint integrity;
- multiple rendered views;
- recognizable final subject.

The strongest transferable principle is:

> structural audits cannot approve anatomical direction, resemblance, expression, or animation quality.

LazyDesigner already implements a stronger form of this principle in its Difference-First Reference Fidelity Verdict: coordinates, hierarchy, bounds, validators, and similarity scores cannot justify a visual `PASS` by themselves.

Therefore this Orca finding is **confirmatory evidence**, not a reason to add another quality gate.

## Correction Loop Comparison

Orca:

```text
reference
→ model specification
→ validate
→ procedural preview
→ visual correction
→ build
→ Blockbench render review
→ correct specification
→ rebuild
```

LazyDesigner:

```text
reference evidence contract
→ semantic form
→ native Blockbench authoring
→ bounded view gate
→ causal difference diagnosis
→ native correction
→ affected-view recapture
→ cross-view regression check
```

### Conclusion

LazyDesigner should **not** adopt Orca's compile-first workflow.

LazyDesigner already has native Blockbench semantic mutation and a more direct correction path. Introducing a separate model-spec compiler as a mandatory intermediate would increase state duplication and correction cost.

The useful extraction is therefore limited to task-local reasoning metadata:

```text
uncertainty
identity-critical features
review targets
```

These can strengthen the existing Reference Evidence Contract and Difference-First verdict without creating a second authoring system.

## Fixed Cuboid Count Finding

Orca's guidance includes target cuboid ranges such as `15–35` for medium mobs.

Do **not** promote this into LazyDesigner.

Reason:

- cuboid count is highly dependent on asset class, silhouette, required articulation, texture-vs-geometry representation, and target style;
- Daffa demonstrates legitimate high-count mechanical assets;
- Mowzie demonstrates semantic organic decomposition and secondary structures;
- LazyDesigner already decides representation before counting cubes.

Candidate rule remains:

> every geometric element needs a semantic/visual/motion reason; complexity count itself is not a quality target.

## Geometry-vs-Texture Finding

Orca explicitly prohibits splitting geometry solely because color changes and reserves flat markings for texture.

This converges strongly with LazyDesigner's existing Geometry Detail Budget.

Cross-source status:

```text
Daffa    → visible mechanical decomposition follows transform/state responsibility
Mowzie   → organic decomposition follows articulation/deformation responsibility
Orca     → color/material boundaries alone do not justify geometry
LazyDesigner → representation chosen by silhouette/volume/contact/motion vs surface information
```

This is now strong cross-domain evidence for the broader candidate principle:

> geometry boundaries should be caused by form, articulation, attachment, deformation, state, or required spatial separation—not merely by appearance changes.

## Candidate Additions to Reference Intelligence

### C1 — Uncertainty as causal evidence

Status: `CANDIDATE_RULE`

Record uncertainty only when it may change construction or acceptance. Do not produce exhaustive uncertainty inventories.

### C2 — Identity-critical feature ownership

Status: `CANDIDATE_RULE`

Before primary construction, identify the smallest set of features whose loss would materially reduce recognizability and assign each a representation owner.

### C3 — Risk-derived review targets

Status: `CANDIDATE_RULE`

Review views should be selected from the diagnosed risk/difference, not from a universal screenshot checklist.

### C4 — Compiler/audit cannot visually approve

Status: `PATTERN_ALREADY_IMPLEMENTED`

No implementation change needed unless a specific LazyDesigner path still violates this boundary.

### C5 — Geometry boundary requires causal justification

Status: `CANDIDATE_RULE`, strong cross-domain support.

A material/color change alone is insufficient reason to split geometry.

## Rejected / Non-Transferable Orca Ideas

Do not inherit by default:

- fixed cuboid-count ranges;
- mandatory Three.js preview stage;
- mandatory model-spec compiler intermediate;
- Route 1/2/3 architecture;
- source-mesh provider assumptions;
- fixed full render list for every task;
- Orca's exact schema or field vocabulary.

These solve Orca's implementation constraints, not necessarily LazyDesigner's.

## Integration Direction

No runtime code or canonical Local policy should change from this study alone.

Next test should be performed on LazyDesigner-owned validation assets:

1. compare current Reference Evidence Contract vs the same task with compact uncertainty + identity-feature + review-target metadata;
2. measure whether diagnosis becomes faster or more causally precise;
3. ensure routine context does not materially increase;
4. promote only fields that reduce correction ambiguity or accepted-result cost.

## Study Verdict

Orca contributes useful workflow evidence, but it does not justify a new LazyDesigner pipeline.

Best extraction:

```text
existing LazyDesigner architecture
+ clearer uncertainty ownership
+ identity-critical feature ownership
+ risk-derived review targets
= potentially lower Cost to Accepted Result
```

Status: `MINED_FOR_WORKFLOW_PATTERN`; candidate additions remain experimental on `Ref`.