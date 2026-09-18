# Compact Modelling Decision Rules — Research vs Geometry Standard

Status: `REMOTE_GITHUB` synthesis on branch `Ref`. Not canonical policy.

## Purpose

Reduce all current modelling research into the smallest decision set that adds value beyond `docs/03-authoring/modelling/standard.md`.

This document explicitly prevents research from becoming a second modelling standard.

## Authority

Canonical policy remains:

`docs/03-authoring/modelling/standard.md`

External/reference research may only:

- confirm an existing rule;
- refine an ambiguous decision;
- add a narrowly scoped candidate where the current standard does not already express the concept.

## A. Already Covered by Geometry Standard — Do Not Duplicate

### A1 — Minimum sufficient geometry

Research evidence:
- simple furniture corpus;
- compact animated props;
- fish rigs;
- vehicle assemblies.

Already canonical:

> Use the minimum geometry required to preserve correct 3D form, not the minimum Cube count.

Decision: `NO_NEW_RULE`.

### A2 — Element/Cube count is independent from owner/bone count

Research evidence:
- 50-Cube trailer with only 6 bones;
- static props with several elements under one owner;
- presentation rigs with zero visible cubes.

Already canonical:

- Cube-owned vs Group/Bone-owned transform;
- hierarchy exists for transform ownership/articulation/attachment/useful organization;
- hierarchy must not be created for depth/node count.

Decision: `NO_NEW_RULE`.

### A3 — Pivot follows transform intent

Research evidence:
- truck steering/wheels;
- mechanical weapons;
- organic joints;
- trailer gate/bed.

Already canonical:

> A meaningful pivot serves rotation center, joint/articulation, attachment, or parent/group transform.

Decision: `NO_NEW_RULE`.

### A4 — Locator instead of placeholder Cube

Research evidence:
- GrainOffloadLocator;
- fish lure/caught/lead locators;
- held/worn presentation.

Already canonical:

> A required non-visible effect, hold, or attachment point that needs transform identity but no visible volume is Locator intent.

Decision: `NO_NEW_RULE`.

### A5 — Geometry vs Texture

Research evidence:
- Orca flat details;
- simple furniture;
- Actions & Stuff presentation variants.

Already canonical:

> Use Geometry for required 3D behavior; Texture for surface information.

Decision: `NO_NEW_RULE`.

### A6 — Deep hierarchy is conditional, not a quality signal

Research evidence:
- grain offload depth-14 chain;
- Mowzie organic chains;
- simple one-bone props.

Already canonical:

- hierarchy only for transform/articulation/attachment/useful organization;
- do not create hierarchy solely to increase depth or node count.

Decision: `NO_NEW_RULE`.

## B. Candidate Refinements That Add Useful Precision

These are the only research findings that appear to add material precision beyond the current Geometry Standard.

### B1 — Stable semantic ownership should outlive clip growth

Evidence:
- Actions & Stuff player/humanoid motion library;
- Advanced Movement ~200 player clips;
- Friendly Fishing creature/rod animation families.

Candidate decision rule:

```text
new clip/action
→ reuse existing semantic transform owners first
→ add owner only if the motion exposes a missing articulation / attachment / deformation responsibility
```

Why this is not already fully explicit:

The Geometry Standard defines transform ownership, but does not directly state that **animation-library growth is not evidence for hierarchy growth**.

Status: `CANDIDATE_REFINEMENT`.

### B2 — Three independent complexity budgets

Research convergence:

```text
GEOMETRY / RIG BUDGET
→ form + transform capability

CLIP BUDGET
→ authored motions / poses

CONTROLLER BUDGET
→ temporal/state composition
```

Candidate rule:

> Growth in one budget is not sufficient reason to grow either of the other two.

Why useful:

It gives the AI a compact anti-overdevelopment check before adding bones, clips, or controller states.

Status: `CANDIDATE_REFINEMENT`.

### B3 — Presentation context should preserve base semantic ownership

Evidence:
- first-person vs third-person bow/crossbow;
- super-rod first/third-person presentation;
- coupled vs uncoupled trailer topology.

Candidate rule:

```text
same semantic asset
+ different presentation context
→ preserve base ownership where possible
→ vary transform / clip / local geometry branch only where materially needed
```

Why useful:

The current standard covers transform ownership but not presentation-context reuse explicitly.

Status: `CANDIDATE_REFINEMENT`.

### B4 — Local visual/state variants should isolate the smallest changed branch

Evidence:
- truck bumper/livery/cargo branches;
- bow/crossbow geometry variants;
- Mowzie hand-state variants;
- barracuda mouth state.

Candidate rule:

```text
materially changed local form
→ isolate local variant branch

unchanged base form
→ reuse base geometry / semantic ownership
```

This is a direct anti-duplication refinement.

Status: `CANDIDATE_REFINEMENT`.

### B5 — Locator/attachment owners may be animated

Evidence:
- GrainOffloadLocator participates in offload animation.

Candidate clarification:

> Locator/ATTACHMENT intent is non-visible transform ownership; it is not necessarily static.

Why useful:

The Geometry Standard defines Locator intent but does not explicitly state that Locators may participate in animation.

Status: `CANDIDATE_CLARIFICATION`.

### B6 — Family-level attachment contracts may outlive anatomy variation

Evidence:
- Friendly Fishing fish family shares lure/caught/lead locator semantics while species topology varies materially.

Candidate reasoning:

```text
family-level attachment semantics
may remain stable
while geometry / articulation topology varies per asset
```

This is useful for AI generation of related asset families without forcing identical rigs.

Status: `CANDIDATE_REFINEMENT`.

## C. Research Vocabulary — Keep as Reasoning Aid, Not Canonical Schema

Current vocabulary:

```text
FORM
ARTICULATION
ATTACHMENT
STATE
FOLLOW
CONTROL
```

Comparison with Geometry Standard:

- `FORM` overlaps Semantic Form / Representation Choice;
- `ARTICULATION` overlaps Group/Bone transform ownership and Pivot/Origin;
- `ATTACHMENT` overlaps Attachment/Contact + Functional Anchors/Locators;
- `STATE` is mainly a variant/presentation reasoning aid;
- `FOLLOW` adds useful organic/secondary-motion reasoning but belongs primarily to animation planning;
- `CONTROL` describes non-visible animation/control ownership.

Decision:

> Do not introduce these six words as a required stored schema.

Use them only as transient causal shorthand when owner separation is ambiguous.

Status: `REASONING_AID_ONLY`.

## D. Do Not Promote

### D1 — Fixed Cube/Bone counts

Rejected.

### D2 — Fixed hierarchy depth targets

Rejected.

### D3 — One owner per visible part

Rejected.

### D4 — New hierarchy for every animation/action

Rejected.

### D5 — Duplicate full model for local state/presentation variant

Rejected unless the entire form genuinely changes.

### D6 — Fixed phase/amplitude curve for organic chains

Rejected; evidence supports variation, not universal numbers.

### D7 — External opaque/hashed naming

Rejected as authoring semantics.

### D8 — Second model-spec/compiler/workflow

Rejected.

## Compact Decision Sequence

When authoring or correcting a model:

```text
1. What 3D form must exist?
2. What is the lowest-complexity representation that preserves it?
3. Which transform owners are actually required?
4. Does an existing owner already cover the new motion/state/presentation need?
5. If not, what exact missing responsibility justifies a new owner?
6. Is the change local? If yes, isolate the smallest changed branch.
7. Is this a rig problem, clip problem, or controller problem?
8. Correct only the causal layer.
```

## Proposed Hot-Path Refinement

If native validation later succeeds, the entire research contribution can likely compress to:

```text
Reuse stable semantic owners across clip/controller/presentation growth.
Add hierarchy only for missing transform/attachment/deformation capability.
Treat rig, clip, and controller complexity as independent budgets.
Isolate local state/presentation variants to the smallest changed branch.
Locators may be animated when they own a moving attachment/reference transform.
```

This should be preferred over loading the full research corpus.

## Validation Required Before Local Promotion

Use a current-quality LazyDesigner-owned asset and compare baseline vs candidate rules on:

- accepted visual/reference quality;
- unnecessary owner growth;
- correction rounds;
- repeated same-cause failures;
- pivot/parent diagnosis clarity;
- animation editability;
- context/tool cost.

No `Local` change is authorized from this static synthesis alone.

## Verdict

Most external research confirms the existing Geometry Standard rather than replacing it.

The genuinely additive candidates are limited to:

1. stable semantic ownership across clip growth;
2. independent rig/clip/controller complexity budgets;
3. base-ownership reuse across presentation contexts;
4. smallest-changed-branch variant isolation;
5. animated Locator clarification;
6. stable family attachment contracts across variable anatomy.

This is the maximum useful refinement set currently supported without overdeveloping policy.