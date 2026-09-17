# Reference Intelligence Studies

Status: experimental research on branch `Ref` only.

This area studies external authoring samples to improve LazyDesigner's generic modelling, rigging, texturing, animation, validation, and correction intelligence without introducing a second runtime, router, workflow engine, or asset implementation path.

## Purpose

External samples are teachers, not production dependencies.

```text
external sample
→ inspect structure and authoring decisions
→ extract observations
→ compare across multiple assets
→ generalize candidate principles
→ test against unrelated LazyDesigner assets
→ promote only proven generic knowledge
```

A visually strong sample is not automatically a rule. Tool count, cube count, bone count, or keyframe count is not a quality score.

## Evidence Levels

- `OBSERVATION` — directly visible in one or more samples.
- `PATTERN` — repeated across materially different samples.
- `CANDIDATE_RULE` — generalized pattern worth testing in LazyDesigner.
- `PROVEN_RULE` — survived cross-domain tests without reducing accepted quality or creating unnecessary complexity.

Only `PROVEN_RULE` is eligible for integration into canonical `Local` knowledge/policy. Runtime semantics require a separate implementation justification.

## Study Dimensions

1. Geometry decomposition — silhouette, component boundaries, detail hierarchy, complexity control.
2. Rig structure — parent/child ownership, transform groups, functional bones, helpers, anchors, pivots.
3. Animation planning — clip inventory, transitions, persistent states, variations, timing, interpolation, secondary motion.
4. Texture planning — UV allocation, texel priority, material separation, detail density.
5. Correction intelligence — identify the causal owner of mismatch and correct the minimum necessary structure.
6. Negative patterns — naming ambiguity, unnecessary hierarchy, duplicated assets, implementation-specific coupling.

## External-Corpus Boundary

Do not commit external model, texture, animation, sound, script, or other copyrighted asset payloads here unless their redistribution rights are independently established and redistribution is actually necessary.

Prefer derived facts, measurements, diagrams expressed from scratch, and generic principles.

Implementation-specific Java/Forge/TACZ behavior is outside LazyDesigner's Bedrock asset-authoring semantics. It may supply abstract authoring lessons only.

## Context Rule

Reference intelligence must remain retrieval-oriented. Do not inject the entire corpus or all extracted studies into routine authoring context. Load only the smallest relevant proven knowledge for the current task.

## First Corpus

`Daffa's Arsenal 3.7.1.1` is the first external study corpus. Initial representative studies: HK416, Taurus, RPD, and MG338.

See `daffas-arsenal-study.md` for the baseline audit and candidate principles.
