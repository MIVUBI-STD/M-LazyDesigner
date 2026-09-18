# Native Validation Matrix — Compact Modelling Refinements

Status: `REMOTE_GITHUB` test design on branch `Ref`. No native execution claimed.

## Purpose

Define the smallest native Blockbench validation needed to decide whether the six compact modelling refinements should be promoted into canonical LazyDesigner guidance.

This matrix reuses existing LazyDesigner validation, quality benchmark dimensions, and Cost-to-Accepted-Result observations. It does **not** create a new scoring system, benchmark framework, or workflow engine.

## Candidates Under Test

R1 — stable semantic ownership should outlive clip growth.
R2 — rig, clip, and controller complexity are independent budgets.
R3 — presentation context should preserve base semantic ownership where possible.
R4 — local visual/state variants should isolate the smallest changed branch.
R5 — Locator/ATTACHMENT owners may be animated.
R6 — family-level attachment contracts may remain stable while anatomy varies.

## Test Authority

Use existing canonical sources:

- `docs/03-authoring/modelling/standard.md`;
- `docs/03-authoring/validation/visual.md`;
- `mcp/tests/fixtures/quality-benchmark-cases.json`;
- current LazyDesigner Runtime / Blockbench evidence on the exact tested source SHA.

Quality remains categorical:

```text
PASS
FAIL
UNVERIFIED
```

No aggregate score.

## Experimental Design

For each selected asset task, run two comparable passes against the **same approved reference and same requested scope**:

### Baseline

Use current canonical LazyDesigner guidance only.

### Candidate

Use the same canonical guidance plus only the relevant compact refinement(s).

Do not change:

- reference package;
- requested dimensions;
- target style;
- required animation scope;
- approval standard;
- Runtime/tool capability;
- visual validation criteria.

The candidate pass must not receive stronger reference evidence than baseline.

## Minimum Asset Set

Use current-quality LazyDesigner-owned assets. Do not use deprecated/subpar fixtures.

### T1 — Static / articulated prop

Benchmark profile: `PROP_FURNITURE` or `MECHANICAL` depending on motion.

Purpose:
- verify R4 does not create speculative variant hierarchy;
- verify simple structure remains shallow when no new responsibility exists.

Required characteristics:
- one stable base form;
- at least one optional/local form variant OR one articulated local part;
- no need for a large animation library.

### T2 — Mechanical / vehicle-style asset

Benchmark profile: `VEHICLE` or `MECHANICAL`.

Purpose:
- validate R1, R2, R3, R4, R5;
- exercise pivot/clearance/attachment relationships.

Required characteristics:
- repeated articulated parts such as wheels/doors/mechanisms;
- at least one local visual variant;
- at least one moving attachment/reference point or locator if possible;
- multiple clips or states without requiring unrelated hierarchy.

### T3 — Character / humanoid

Benchmark profile: `CHARACTER_MOB`.

Purpose:
- validate R1, R2, R3, R4;
- ensure stable anatomy survives clip/presentation growth without under-rigging.

Required characteristics:
- several materially different actions;
- held/worn or view-context presentation if available;
- at least one state-local visible form difference if available.

### T4 — Organic / creature family pair

Benchmark profile: `ORGANIC_CURVED` or `CHARACTER_MOB`.

Purpose:
- validate R1, R2, R6;
- test stable attachment semantics across variable anatomy.

Required characteristics:
- two related assets/family members;
- shared attachment/locator need;
- materially different body topology, proportions, or articulation depth.

## Refinement-by-Refinement Matrix

| Refinement | Primary test | Existing quality evidence | Efficiency / structure observation | Promotion signal | Reject / narrow signal |
| --- | --- | --- | --- | --- | --- |
| R1 stable ownership across clip growth | T2/T3/T4 | motion_ready_structure, pivot_rig_suitability, joint_gap_control, clearance_contact, reference_pose_fidelity | owner/bone growth, correction rounds, repeated same-cause failures | equal/better visual + fewer unnecessary owners or clearer correction | required motion becomes awkward, clipped, or needs later hierarchy rebuild |
| R2 independent rig/clip/controller budgets | T2/T3 | geometry + animation dimensions remain separately valid | unnecessary owner/clip/controller growth, tool calls to accepted result | complexity only grows in causal layer | candidate causes missing capability or shifts needed complexity into brittle workarounds |
| R3 presentation-context base reuse | T2/T3 | cross_view_proportion, attachment_contact, reference_pose_fidelity, clearance_contact | duplicate hierarchy/geometry avoided, correction clarity | same semantic base survives context with local transforms/branches | presentation context materially needs different topology/pivot frame and reuse causes regressions |
| R4 smallest changed branch | T1/T2/T3 | required_part_completeness, wrong_part_count, surface_integrity, reference_unsupported_invention | duplicated base geometry, branch count, correction rounds | local variant remains local with equal/better quality | fragmentation increases or variant branch cannot preserve required whole-form relationship |
| R5 animated Locator | T2 | attachment_contact, broken_attachment, pivot_rig_suitability, clearance_contact | placeholder-cube avoidance, locator correction clarity | moving reference/attachment works without visible dummy geometry | locator cannot express required transform or produces unclear/unsafe authoring |
| R6 family attachment contract | T4 | silhouette, cross_view_proportion, required_part_completeness, curve_segmentation_quality | duplicated locator semantics, topology overconstraint | locator semantics reuse while anatomy stays asset-specific | shared contract forces bad pivot/topology or unsupported invention |

## Evidence Capture Per Pass

Use only existing instruments and the minimum evidence necessary for each claim.

### Structural snapshot

Record:

- exact source SHA / installed Runtime identity;
- Cube count;
- Group/Bone count;
- Locator count;
- hierarchy depth only as diagnostic, never quality score;
- semantic owner list for the affected area;
- clip count in requested scope;
- controller state count in requested scope;
- local variant branch count where applicable.

These are diagnostic observations, not PASS criteria.

### Visual evidence

Follow `docs/03-authoring/validation/visual.md`:

- actual approved reference image visible;
- fresh current-revision model evidence;
- correct view pairing;
- difference-first review;
- smallest view set that proves the current claim;
- recapture after material geometry/pivot/hierarchy mutation.

### Animation evidence

When relevant:

- representative neutral/start pose;
- one or more required motion extremes;
- playback evidence for pivot arc / clipping / detachment;
- contact/clearance evidence;
- return/loop/handoff evidence when required.

### Efficiency observations

Reuse existing benchmark observation names:

- `status_calls`;
- `search_capability_calls`;
- `describe_capability_calls`;
- `redundant_readbacks`;
- `visual_capture_batches`;
- `correction_rounds`;
- `repeated_same_cause_failures`;
- `tool_calls_to_accepted_result`.

Also record diagnostic owner changes:

- `owners_added`;
- `owners_removed`;
- `owners_reworked_after_animation_started`.

These three are experimental notes only and do not require changes to the canonical benchmark fixture.

## Acceptance Logic

A refinement is eligible for promotion only when:

```text
candidate visual result >= baseline accepted quality
AND
no new critical/major benchmark failure
AND
candidate does not increase unnecessary structural complexity
AND
candidate improves causal clarity or Cost to Accepted Result on at least one relevant test
AND
no material regression appears on another relevant asset class
```

Do not require every efficiency observation to improve.

Quality takes precedence over efficiency.

## Refinement-Specific Stop Conditions

### R1

Stop/reject if preserving the existing rig causes two repeated correction cycles around the same missing articulation/pivot capability. At that point the owner reuse assumption is false for the task.

### R2

Stop/reject if separating budgets causes the agent to ignore a genuine dependency, e.g. a clip requirement reveals a missing rig owner. Independent budgets are not isolated systems.

### R3

Stop/narrow if presentation context requires materially different topology or a different pivot frame that cannot be expressed cleanly as a local branch/transform.

### R4

Stop/reject if branch isolation fragments primary form ownership, duplicates contact logic, or creates more correction ambiguity than a coherent variant asset would.

### R5

Stop/reject if a Locator is being used to hide geometry that should be visible or if the current native tool/export path cannot preserve the required animated locator behavior.

### R6

Stop/narrow if shared locator semantics constrain species-specific anatomy or encourage unsupported symmetry/topology assumptions.

## Test Order

Run in this order to reduce wasted validation:

```text
1. T1 prop / local variant
   → primarily R4

2. T2 mechanical / vehicle
   → R1 R2 R3 R4 R5

3. T3 character
   → R1 R2 R3 R4

4. T4 related creature pair
   → R1 R2 R6
```

Reason:

- T1 is the cheapest guard against over-classification;
- T2 exercises the broadest set of ownership/pivot/variant relationships;
- T3 tests whether reuse under animation breadth harms deformation/pose quality;
- T4 should come last because family-contract claims require two accepted assets.

## Promotion Outcomes

Allowed outcomes per refinement:

```text
PROMOTE
NARROW
KEEP_EXPERIMENTAL
REJECT
```

### PROMOTE

Native evidence supports the compact rule across applicable tasks with no quality regression.

### NARROW

Useful only for a bounded asset/presentation condition.

### KEEP_EXPERIMENTAL

Evidence is insufficient, conflicting, or too small.

### REJECT

Adds complexity, harms quality, or provides no useful accepted-result benefit.

## Expected Canonical Change If Successful

Do not create six new policy sections.

If R1–R5 broadly pass, preferred canonical change is one compact paragraph near existing hierarchy / Locator guidance:

```text
Reuse stable semantic ownership across clip, controller, and presentation growth unless a new transform, attachment, or deformation capability is required. Treat rig, clip, and controller complexity as separate budgets. Keep local variants local. A Locator may participate in animation when it owns a moving attachment/reference transform.
```

R6 should remain conditional guidance unless repeated LazyDesigner-owned family authoring proves broad value.

## Remote Completion Boundary

This document completes the remote design work for validating the current research refinements.

REMOTE_GITHUB can verify:

- test design;
- compatibility with current benchmark dimensions;
- no duplicate validation framework;
- explicit promotion/rejection criteria.

REMOTE_GITHUB cannot execute the native experiment or claim its result.