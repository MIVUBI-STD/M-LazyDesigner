# Reference Intelligence — Source Map

Status: research index on branch `Ref` only.

This file classifies external sources by evidence role. A source is not promoted because it is famous, visually impressive, or technically sophisticated. Each source must contribute a distinct kind of evidence and must remain within its rights boundary.

## Evidence Classes

- `CRAFTSMANSHIP_CORPUS` — authored assets used to study geometry, hierarchy, pivots, texture decisions, animation construction, and correction patterns.
- `METHOD_AUTHORITY` — official documentation or tooling guidance used to verify format/rig/animation semantics.
- `AGENT_WORKFLOW_COMPARISON` — another AI-assisted authoring system used to compare reasoning boundaries, planning, compilation, validation, and quality gates.
- `RUNTIME_REFERENCE` — runtime/rendering systems that may clarify how authored structures are consumed, but are not quality authorities.

Do not merge these evidence classes into one authority hierarchy.

## S1 — Daffa's Arsenal 3.7.1.1

Class: `CRAFTSMANSHIP_CORPUS`

Primary value:

- complex hard-surface decomposition;
- mechanical hierarchy and helper/anchor use;
- pivot intent;
- state-aware animation;
- repeated-action variants;
- long interaction/reload choreography;
- texture/material-map examples;
- negative examples in naming and duplicated/back-up assets.

Current representative set: HK416, Taurus, RPD, MG338.

Rights: conflicting metadata observed in the supplied archive. Treat as analysis-only; do not copy source assets or implementation payloads into LazyDesigner.

Bias warning: weapon/mechanical-heavy. Never use this corpus alone to generalize humanoid, organic, creature, furniture, or simple-prop policy.

## S2 — Mowzie's Mobs Public

Class: `CRAFTSMANSHIP_CORPUS` for organic/humanoid study.

Observed source characteristics:

- repository exposes raw `.bbmodel` authoring files in its `assets/` directory;
- current model-side code exposes semantic bone/control usage for selected characters;
- Umvuthi materially demonstrates distributed anatomy, phase-offset idle motion, secondary-motion families, soft-volume response, and spatially varied repeated appendages;
- Sculptor materially demonstrates humanoid anatomy, state-visible geometry variants, attachment ownership, dynamic chains, and corrective garment/deformation relationships;
- Biloko remains pending deeper validation and contributes no generalized rule yet.

Primary generic findings:

1. organic decomposition requires articulation and deformation responsibility in addition to independent transforms;
2. visible actions may be distributed across anatomical chains;
3. phase offsets and spatial variation are first-class secondary-motion tools;
4. primary motion and secondary response should be distinguished;
5. garments/flexible accessories may act as corrective followers of nearby anatomy;
6. paired anatomy may share structure without identical animation timing;
7. attachment/state presentation should remain separable from core anatomy when materially required.

Rights boundary:

The repository license states all rights reserved unless explicitly stated otherwise and places conditions on public use. Treat all asset study as analysis-only. Do not copy model, texture, animation, name, character design, code, or other asset content into LazyDesigner.

Status: `MINED_FOR_OBSERVATION_AND_PATTERN`. See `mowzies-organic-study.md`.

## S3 — GeckoLib Official Documentation

Class: `METHOD_AUTHORITY`

Why it matters:

GeckoLib's Blockbench workflow is explicitly close to Bedrock entity animation authoring. Its official guidance supplies a useful independent check on rigging concepts without depending on one artist's style.

Verified methodology themes:

- groups function as animation bones;
- parenting propagates parent transforms to children;
- pivots are joint/rotation points rather than arbitrary visual centers;
- rigging is a preparation step that makes animation manageable;
- Blockbench-authored GeckoLib animation is substantially similar to Bedrock animation workflow;
- easing/interpolation should be selected according to motion intent rather than used indiscriminately.

Use this source to validate terminology and mechanical principles. Do not use it as evidence that a specific geometry style is visually superior.

Status: `METHOD_AUTHORITY_ACCEPTED`.

## S4 — Orca img2blockbench

Class: `AGENT_WORKFLOW_COMPARISON`

License: MIT.

Primary value:

This project directly addresses AI-assisted reference-image-to-Blockbench authoring and therefore provides a useful architectural comparison with LazyDesigner.

Observed workflow principles:

- agent is the 3D/anatomy reasoner;
- deterministic compiler is file-format authority, not visual-resemblance authority;
- reference probing and subject/proportion/identity analysis occur before build;
- model specification is validated before deterministic compilation;
- procedural/render review occurs before final model acceptance;
- generated `.bbmodel` should not be manually patched as the primary correction path;
- static-model approval and animation approval are separate decisions;
- successful validation/audit does not prove visual resemblance;
- unseen geometry should be inferred conservatively;
- geometry should not be split merely because color changes;
- dense voxel/cuboid accumulation is explicitly discouraged.

### Deep audit result

Orca's strongest transferable value is not its compiler pipeline. LazyDesigner already has a more direct native Blockbench authoring/correction path and already separates technical validity from visual fidelity.

The deep audit therefore rejects a second model-spec/compiler workflow and keeps only three task-local reasoning ideas for experimentation:

1. **explicit uncertainty ownership** — record hidden/unseen/ambiguous evidence only when it can materially change construction or acceptance;
2. **identity-critical feature ownership** — track the smallest feature set whose loss would materially reduce recognizability, with `GEOMETRY | TEXTURE | ANIMATION | MIXED` ownership;
3. **risk-derived review targets** — choose the smallest proving view set from the diagnosed risk/difference rather than a universal screenshot checklist.

Cross-domain support also strengthened this broader candidate principle:

> geometry boundaries should be caused by form, articulation, attachment, deformation, state, or required spatial separation—not merely by appearance/color changes.

Important divergences retained:

- fixed cuboid-count targets are not LazyDesigner quality rules;
- mandatory Three.js preview is not required;
- Orca's Route 1/2/3 architecture is not adopted;
- a separate deterministic model-spec compiler is not adopted;
- fixed all-angle render lists are not adopted because LazyDesigner uses Minimum Necessary Evidence.

Status: `MINED_FOR_WORKFLOW_PATTERN`. See `orca-workflow-study.md`.

## S5 — FreeMinecraftModels / similar `.bbmodel` runtimes

Class: `RUNTIME_REFERENCE` candidate.

Potential value:

- direct `.bbmodel` consumption;
- persistent props;
- model animation playback;
- mount/anchor naming conventions;
- runtime consequences of hierarchy and authored metadata.

Not currently selected as craftsmanship evidence. Runtime capability does not establish modelling or animation quality.

Status: `DEFERRED` until a concrete LazyDesigner authoring question requires runtime-side comparison.


## S6 — Blockbench Workshop Simple Prop / Furniture Scout

Class: `CRAFTSMANSHIP_CORPUS` candidate, evaluated per listing rather than as one global authority.

Why it matters:

- supplies the low-complexity counterexample missing from Daffa and Mowzie;
- public listings expose real `.bbmodel` projects plus model counts, animation counts, texture information, creator metadata, and per-listing license terms;
- licensed examples such as Old Shelf / Old Workbench (CC BY) demonstrate that several geometry elements can legitimately share one static owner;
- Toolbox (CC BY) is a compact articulated prop whose moving lid justifies a second owner without requiring a large hierarchy.

Primary candidate principles:

1. `element decomposition != bone/owner decomposition`;
2. static visible pieces do not need separate bones without independent responsibility;
3. articulated subparts should receive the smallest hierarchy sufficient for their motion;
4. hierarchy depth and bone count are not quality signals;
5. simple props need a dedicated **Minimum Sufficient Structure** discipline.

Rights boundary:

Evaluate rights per listing. Prefer explicit CC0/CC BY assets. Derived facts and independently expressed principles are preferred over committing third-party payloads.

Status: `SCOUTED_FOR_SIMPLE_PROP_DISCIPLINE`. See `prop-furniture-scout.md`.

## Cross-Domain Responsibility Vocabulary

Status: `CANDIDATE_RULE` synthesized from the current cross-domain studies.

The previous exclusive role enum has been rejected as too heavy. Current candidate vocabulary is six orthogonal responsibility reasons:

```text
FORM
ARTICULATION
ATTACHMENT
STATE
FOLLOW
CONTROL
```

Key rule:

> create another owner only when an existing owner cannot satisfy the required responsibility cleanly.

This vocabulary is a reasoning overlay on existing LazyDesigner Geometry/Hierarchy/Locator concepts, not a new schema or workflow. See `cross-domain-responsibility-vocabulary.md`.

## Current Coverage Matrix

| Intelligence area | Daffa | Mowzie | GeckoLib docs | Orca | Current coverage |
| --- | --- | --- | --- | --- | --- |
| hard-surface geometry | strong | low | methodology only | moderate | good |
| mechanical rigging | strong | low | methodology | moderate | good |
| creature anatomy | low | strong | methodology | moderate | good candidate evidence |
| humanoid rigging | low | strong | methodology | moderate | good candidate evidence |
| secondary/organic motion | low | strong | methodology | low | good candidate evidence |
| corrective deformation | low | strong | low | low | newly covered |
| animation choreography | strong | strong | methodology | low | good cross-corpus evidence |
| pivot/parent semantics | strong | strong | strong authority | moderate | very good |
| agent reasoning workflow | low | low | low | strong | good |
| visual acceptance methodology | moderate | moderate | low | strong | strong cross-system convergence |
| uncertainty handling | moderate | implicit | low | strong | candidate improvement identified |
| identity-feature preservation | moderate | implicit | low | strong | candidate improvement identified |
| review evidence selection | strong | low | low | moderate | LazyDesigner stronger; Orca adds contract framing |
| simple prop discipline | weak | weak | low | moderate | scout evidence added |
| furniture/environment prop | weak | weak | low | moderate | licensed scout corpus found; deep mining pending |
| texture craftsmanship | strong hard-surface | candidate organic | low | methodology | needs cross-domain study |

## Next Research Order

1. Deep-inspect a small licensed prop/furniture family and one compact articulated prop from the Blockbench Workshop scout; compare actual `.bbmodel` organization, texture allocation, and pivot use.
2. Test the six-responsibility vocabulary against representative task briefs and correction scenarios; reject it if it causes verbose classification or unnecessary hierarchy.
3. Test Orca-derived compact uncertainty + identity-feature + review-target metadata on LazyDesigner-owned validation assets before any canonical promotion.
4. Continue Biloko only if it adds a genuinely different organic-rig pattern beyond Umvuthi/Sculptor.
5. Keep all candidate rules on `Ref` until a current-quality LazyDesigner-owned validation asset exists.

## Promotion Rule

No source-specific technique becomes canonical merely because two sources agree. Promotion still requires a LazyDesigner-owned test against current-quality assets and evidence that the rule improves accepted quality, correction efficiency, or causal clarity without unnecessary complexity.
