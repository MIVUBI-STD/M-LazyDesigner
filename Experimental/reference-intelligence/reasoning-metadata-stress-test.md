# Compact Reference Reasoning Metadata — Static Stress Test

Status: REMOTE_GITHUB static reasoning test on branch `Ref`.

Purpose: test Orca-derived compact metadata ideas without introducing a second model-spec workflow.

Candidate metadata:

- construction-changing uncertainty;
- identity-critical feature ownership;
- risk-derived review targets.

## Test Principle

Metadata is useful only if it changes the next authoring or review decision. Do not create exhaustive inventories.

## Scenario Matrix

| Scenario | Uncertainty | Identity-critical feature | Review target | Result |
| --- | --- | --- | --- | --- |
| Single front/3-4 prop with hidden rear support | rear depth/support relation = CONSTRUCTION_CHANGING if it affects silhouette/contact | characteristic front silhouette | side/back only if needed to resolve support | PASS |
| Symmetric furniture with hidden far leg | usually NONBLOCKING if symmetry and contact evidence are strong | overall proportion / silhouette | source-matched + side; no mandatory five-view set | PASS |
| Humanoid with partially hidden held object | hand-object attachment may be CONSTRUCTION_CHANGING | hand pose + held-object relationship | affected hand/3-4 view | PASS |
| Creature with obscured tail root | tail attachment/topology can be CONSTRUCTION_CHANGING | tail silhouette / root location | rear/side or additional source if identity depends on it | PASS |
| Texture marking hidden on far side | NONBLOCKING unless marking defines identity | marking ownership = TEXTURE | corresponding side close-up only if acceptance requires bilateral identity | PASS |
| Mechanical hinge partially hidden | pivot axis relation = CONSTRUCTION_CHANGING | moving-panel clearance / hinge behavior | motion extreme + side view | PASS |
| Simple table with no meaningful uncertainty | none material | silhouette/proportion | minimum necessary source-matched view | PASS |

## Failure Guards

### Do not duplicate existing Reference Package

These fields must remain an optional compact projection of existing reference evidence. No separate `model-spec.json`, no new persistent database, no new authoring route.

### Do not block on harmless uncertainty

Unseen information is blocking only when it can materially change topology, articulation, dimensions, identity, or required acceptance evidence.

### Do not create identity-feature checklists for every detail

Track only the smallest set whose loss would materially reduce recognizability or requested fidelity.

### Do not prescribe fixed review views

Review targets derive from the diagnosed risk/difference. Existing Minimum Necessary Evidence remains authoritative.

## Static Verdict

`STATICALLY_VALIDATED_CANDIDATE`

The metadata survives static cross-domain scenarios and fits existing LazyDesigner architecture without a second workflow.

Remaining proof requirement:

- test on a current-quality LazyDesigner-owned task;
- compare correction cycles / causal diagnosis clarity with and without the compact metadata;
- verify context growth stays negligible;
- verify no decrease in accepted visual quality.

## Candidate Compact Projection

When materially useful only:

`uncertainty: target + issue + construction consequence`

`identity-critical feature: owner = GEOMETRY | TEXTURE | ANIMATION | MIXED`

`review target: smallest evidence that can prove/disprove the risky relation`