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

## S7–S14 — User-Supplied Bedrock Pack Corpus

Class: mixed cross-system corpus spanning `WORLD_SYSTEM_CORPUS`, `CONTENT_HEAVY_ADDON_CORPUS`, `PRESENTATION_ENVIRONMENT_CORPUS`, `RESOURCE_PRESENTATION_CORPUS`, `SCRIPTED_INTERACTION_CORPUS`, `HYBRID_WORLD_SYSTEM_CORPUS`, `MODULAR_ADDON_SYSTEM_CORPUS`, and `FUNCTION_STATE_MACHINE_CORPUS`.

Sources:
- Bloom;
- Minecraft: Friendly Fishing Add-On;
- Realism Visuals;
- Actions & Stuff 1.4;
- Advanced Movement Add-on;
- Advanced Truck Simulator;
- Better on Bedrock 1.1;
- TNT Arena.

Primary cross-corpus value:

1. proves that Bedrock systems can be function-driven, Script API-driven, or hybrid;
2. separates gameplay state/computation from entity/item/environment presentation;
3. demonstrates content-family scaling without equating every content instance with a new subsystem;
4. exposes large animation/controller/attachable surfaces as first-class presentation architecture;
5. demonstrates environment rendering as a separate presentation domain;
6. provides vehicle, movement, arena, worldgen, mission/UI, and function-state-machine examples for future focused audits;
7. reinforces that packaged obfuscation/hashed naming is not authoring-semantic guidance.

Rights boundary: all eight user-supplied archives are analysis-only unless redistribution rights are independently verified. No raw payload is promoted.

Status: `MINED_FOR_CROSS_SYSTEM_PATTERN`. See `bedrock-pack-corpus-study.md`.

## Cross-Domain Responsibility Vocabulary

Status: `STATICALLY_VALIDATED_CANDIDATE` synthesized from the current cross-domain studies.

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

This vocabulary is a reasoning overlay on existing LazyDesigner Geometry/Hierarchy/Locator concepts, not a new schema or workflow. It passed static scenario/correction stress tests and aligns with all six current LazyDesigner quality benchmark cases. See `cross-domain-responsibility-vocabulary.md`, `responsibility-vocabulary-stress-test.md`, and `quality-benchmark-crosswalk.md`.

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

1. Deep-inspect a small licensed prop/furniture family and one compact articulated prop only when raw source becomes remotely retrievable; do not infer hidden `.bbmodel` internals from listing metadata.
2. Run the six-responsibility vocabulary on a current-quality LazyDesigner-owned native authoring task and measure correction clarity / accepted-result cost.
3. Run compact uncertainty + identity-feature + review-target metadata on the same native task and compare with the current path.
4. Continue Biloko only if it adds a genuinely different organic-rig pattern beyond Umvuthi/Sculptor.
5. Keep all candidate rules on `Ref` until native proof exists; REMOTE_GITHUB source-contract alignment alone is not promotion evidence.

## REMOTE_GITHUB Validation Status

Completed remotely:

- `Ref` synchronized with current `Local` core while preserving research isolation;
- responsibility vocabulary static stress test: PASS;
- compact uncertainty/identity/review metadata static stress test: PASS;
- crosswalk against all six LazyDesigner-owned quality benchmark cases: `REMOTE_BENCHMARK_ALIGNED`;
- no second schema, workflow, compiler, score system, or Runtime path introduced;
- research remains isolated under `Experimental/reference-intelligence/**`.

Not remotely provable:

- live Blockbench visual acceptance;
- actual correction-round reduction;
- tool-call savings to accepted result;
- native pivot/playback/Undo/persistence behavior;
- current installed Runtime freshness.

CI note: current verification workflows are push-scoped to `Local`; `Ref` research commits therefore do not automatically create workflow runs.

## Promotion Rule

No source-specific technique becomes canonical merely because two sources agree. Promotion still requires a LazyDesigner-owned test against current-quality assets and evidence that the rule improves accepted quality, correction efficiency, or causal clarity without unnecessary complexity.
