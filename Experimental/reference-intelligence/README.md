# Reference Intelligence Studies

Status: experimental research on branch `Ref` only.

This area studies external authoring samples to improve LazyDesigner's generic modelling, rigging, texturing, animation, validation, and correction intelligence without introducing a second runtime, router, workflow engine, model-spec compiler, or asset implementation path.

## Purpose

External samples are teachers, not production dependencies.

```text
external sample
→ inspect structure and authoring decisions
→ extract observations
→ compare across materially different assets
→ generalize candidate principles
→ static/source-contract stress test
→ LazyDesigner-owned quality benchmark crosswalk
→ current-quality native authoring test
→ promote only proven generic knowledge
```

A visually strong sample is not automatically a rule. Tool count, Cube count, bone count, keyframe count, or hierarchy depth is not a quality score.

## Evidence Levels

- `OBSERVATION` — directly visible in one or more sources.
- `PATTERN` — repeated across materially different sources.
- `CANDIDATE_RULE` — generalized pattern worth testing in LazyDesigner.
- `STATICALLY_VALIDATED_CANDIDATE` — survives remote cross-domain/source-contract stress tests but has not yet proven accepted-result improvement in native authoring.
- `PROVEN_RULE` — survives LazyDesigner-owned current-quality authoring tests without reducing accepted quality or creating unnecessary complexity.

Only `PROVEN_RULE` is eligible for canonical `Local` promotion. Runtime semantics require a separate implementation justification.

## Evidence Classes

- `CRAFTSMANSHIP_CORPUS` — authored assets used to study decisions and correction patterns.
- `METHOD_AUTHORITY` — official methodology/format guidance.
- `AGENT_WORKFLOW_COMPARISON` — external AI authoring architecture used only for reasoning/workflow comparison.
- `RUNTIME_REFERENCE` — runtime-side evidence when a concrete authoring question requires it.

Do not merge these classes into one authority hierarchy.

## Current Studies

- `daffas-arsenal-study.md` — hard-surface/mechanical decomposition, pivots, helpers, state-aware animation, complexity discipline.
- `mowzies-organic-study.md` — organic/humanoid articulation, distributed motion, secondary motion, corrective followers, attachment/state separation.
- `orca-workflow-study.md` — uncertainty, identity-critical features, review-target reasoning; explicitly rejects a second compiler/workflow.
- `prop-furniture-scout.md` — low-complexity prop/furniture evidence and Minimum Sufficient Structure.
- `cross-domain-responsibility-vocabulary.md` — compact responsibility vocabulary: `FORM | ARTICULATION | ATTACHMENT | STATE | FOLLOW | CONTROL`.
- `responsibility-vocabulary-stress-test.md` — static cross-domain stress test.
- `reasoning-metadata-stress-test.md` — static test for compact uncertainty/identity/review metadata.
- `quality-benchmark-crosswalk.md` — alignment against LazyDesigner's six current quality benchmark cases.
- `bedrock-pack-corpus-study.md` — user-supplied Bedrock corpus filtered strictly for Blockbench modelling: geometry, hierarchy, pivots, locators/attachments, UV/texture, animation/controllers, attachables, render relationships, and visual validation.
- `actions-stuff-modelling-study.md` — humanoid/player rig reuse, attachables, held/worn presentation, view-context variants.
- `vehicle-modelling-study.md` — vehicle/mechanical hierarchy, wheels/doors/steering, locators, modular visual upgrades.
- `friendly-fishing-modelling-study.md` — aquatic creature chains, distributed swim motion, held-object/rod secondary structures.
- `compact-rig-animation-study.md` — rich animation libraries on compact stable rigs.
- `user-corpus-modelling-synthesis.md` — compact cross-source modelling patterns for future validation.
- `native-validation-matrix.md` — bounded baseline-vs-candidate native Blockbench validation plan for the compact modelling refinements.
- `native-validation-execution-packet.md` — execution-ready T1 baseline/candidate procedure and evidence log, with Lift explicitly excluded.
- `source-map.md` — source roles, coverage, current decisions, and next research order.

## Cross-Domain Candidate

Current compact responsibility reasoning:

```text
FORM
ARTICULATION
ATTACHMENT
STATE
FOLLOW
CONTROL
```

This is not a schema.

Create another owner only when an existing owner cannot satisfy the required responsibility cleanly. Color/detail difference alone is not an ownership reason.

Static/source-contract status: `STATICALLY_VALIDATED_CANDIDATE`.

## Study Dimensions

1. Geometry decomposition — silhouette, component boundaries, detail hierarchy, complexity control.
2. Rig structure — parent/child ownership, transform groups, functional bones, helpers, anchors, pivots.
3. Animation planning — clip inventory, transitions, persistent states, variants, timing, interpolation, secondary motion.
4. Texture planning — UV allocation, texel priority, material separation, detail density.
5. Correction intelligence — locate the causal owner and correct the minimum necessary structure.
6. Negative patterns — naming ambiguity, unnecessary hierarchy, duplicated assets, implementation-specific coupling.
7. Context economy — improve reasoning without always-loading a corpus or verbose role inventory.

## External-Corpus Boundary

Do not commit external model, texture, animation, sound, script, or other copyrighted asset payloads unless redistribution rights are independently established and the payload is actually necessary.

Prefer derived facts, measurements, independently expressed diagrams, and generic principles.

External runtime/gameplay implementations are not LazyDesigner knowledge unless they directly clarify a Blockbench-authored asset relationship. Ignore gameplay architecture, Script API systems, mcfunctions, scoreboards, worldgen, mission/UI logic, and map-framework concerns.

## Context Rule

Reference intelligence remains retrieval-oriented.

Do not inject the entire corpus or all research documents into routine authoring context. If a candidate is eventually promoted, load only the smallest proven projection needed for the current task.

## Branch Rule

`Ref` is the experimental/reference-learning branch. `Local` remains core development authority.

As of the current REMOTE_GITHUB pass, `Ref` contains the latest `Local` head as an ancestor and differs only by `Experimental/reference-intelligence/**` research files.

No research rule is automatically promoted into `Local`.
