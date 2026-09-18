# Cross-Domain Responsibility Vocabulary — Static Stress Test

Status: REMOTE_GITHUB static reasoning test on branch `Ref`.

Purpose: test whether the six-responsibility vocabulary (`FORM | ARTICULATION | ATTACHMENT | STATE | FOLLOW | CONTROL`) improves causal authoring decisions without creating unnecessary hierarchy or verbose classification.

## Test Rule

For each task, classify only responsibilities that materially change construction. The vocabulary fails if it adds owners that the existing Geometry Standard would not need.

## Scenario Matrix

| Scenario | Minimal responsibilities | Expected structure | Over-rigging guard | Result |
| --- | --- | --- | --- | --- |
| Static shelf / table | FORM | one shallow semantic owner; several Cubes allowed | no per-piece bones | PASS |
| Toolbox with opening lid | FORM + ARTICULATION | body owner + lid owner with hinge pivot | no helper/controller unless required | PASS |
| Sliding machine panel | FORM + ARTICULATION | body + panel; translation intent, no fake hinge | no pivot complexity beyond needed translation ownership | PASS |
| Prop with effect/equipment point | FORM + ATTACHMENT | visible body + Locator/anchor | no hidden placeholder Cube | PASS |
| Humanoid NPC with held item | FORM + ARTICULATION + ATTACHMENT | anatomical chain + hand attachment | attachment not fused into hand geometry | PASS |
| Humanoid open/closed hand presentation | FORM + ARTICULATION + STATE | shared arm chain + material hand-state variant where form truly changes | no duplicate state geometry if appearance is equivalent | PASS |
| Creature neck/head look | FORM + ARTICULATION | distributed joint chain allowed | do not force all look rotation into head | PASS |
| Tail / beard / feather follow-through | FORM + ARTICULATION + FOLLOW | ordered chain only as deep as motion requires | no identical timing requirement across repeated segments | PASS |
| Garment following legs | FORM + FOLLOW(CORRECTIVE), optional ARTICULATION | garment owner depends on primary anatomy relationship | no independent choreography unless evidence requires it | PASS |
| Mechanical state with persistent changed form | FORM + ARTICULATION + STATE | mechanical owner + state-specific pose/variant only where materially different | no clip/geometry duplication from state labels alone | PASS |
| Complex animation helper | CONTROL only when named downstream consumer exists | non-visual control/helper permitted | speculative helpers prohibited | PASS |
| Color break on otherwise identical surface | FORM only; representation likely Texture | same owner | color difference cannot create new bone | PASS |

## Correction Stress Cases

### C1 — Model silhouette wrong but hierarchy is valid

Diagnosis: `FORM` / Representation Choice. Do not add ARTICULATION or CONTROL. Result: PASS.

### C2 — Door rotates around wrong point

Diagnosis: `ARTICULATION` + pivot/parent. Do not add geometry unless form itself is wrong. Result: PASS.

### C3 — Held object sits in wrong location

Diagnosis: `ATTACHMENT`. Correct locator/anchor relationship before changing hand geometry. Result: PASS.

### C4 — Cloth clips through leg during pose

Diagnosis: `FOLLOW(CORRECTIVE)` and articulation relationship. Do not add random keyframes/cubes first. Result: PASS.

### C5 — Repeated appendages move robotically

Diagnosis: `FOLLOW(SECONDARY)` / chain distribution; phase/amplitude/timing may differ. Do not add unrelated geometry. Result: PASS.

### C6 — Static furniture has many nested groups

Diagnosis: responsibility audit finds only `FORM`; collapse unnecessary ownership while preserving geometry. Result: PASS.

## Ambiguity / Failure Checks

### A1 — FORM can be too broad

Risk: every object trivially has FORM, so the tag alone provides little value.

Mitigation: FORM should not normally be written for every Cube. Use the vocabulary only when deciding owner separation or correction cause.

### A2 — FOLLOW can overlap ARTICULATION

Risk: flexible chains need both joint ownership and secondary/corrective relationship.

Decision: allow composition. `ARTICULATION` answers how a segment can move; `FOLLOW` answers why its motion depends on another source.

### A3 — STATE can overlap CONTROL

Decision: `STATE` describes materially different authored form/pose/presentation; `CONTROL` describes a non-visual mechanism that coordinates downstream behavior. They are not substitutes.

### A4 — Vocabulary could become verbose

Guard: never require a full role inventory for simple tasks. A static prop can be reasoned as one sentence: `single FORM owner unless an independent movement/attachment/state requirement appears`.

## Comparison With Existing Geometry Standard

The stress test found no contradiction with current canonical concepts:

- minimum geometry required for correct 3D form;
- transform ownership before rotation;
- Group/Bone-owned transform only for shared semantic relationship;
- hierarchy not created for depth/node count;
- Locator intent for non-visible attachment/effect points;
- semantic naming;
- visual evidence required for quality claims.

The vocabulary adds value mainly as a **causal diagnostic shorthand** across mechanical and organic domains. It should not replace existing Representation Choice or Geometry Standard rules.

## Static Verdict

`STATICALLY_VALIDATED_CANDIDATE`

Passed all scenario/correction cases without requiring a new schema or extra owner. The principal remaining risk is context verbosity, not semantic conflict.

Promotion remains blocked on a current-quality LazyDesigner-owned authoring test that measures correction clarity / accepted-result cost.

## Hot-Path Form If Ever Promoted

`Owner reason: FORM | ARTICULATION | ATTACHMENT | STATE | FOLLOW | CONTROL.`

`Create another owner only when the required responsibility cannot be satisfied cleanly by an existing owner. Color/detail difference alone is not an ownership reason.`