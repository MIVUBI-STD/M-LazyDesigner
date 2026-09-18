# Advanced Truck Simulator — Vehicle / Mechanical Modelling Study

Status: `OBSERVATION` / `PATTERN` extraction only. Analysis-only external corpus.

## Scope

Only geometry, hierarchy, pivots, locators/attachments, animation clips/controllers, and visual mechanical relationships are considered.

Mission/UI/script/function systems are ignored.

## Representative Geometry

### Truck

Representative truck geometry contains approximately:

- 34 bones;
- 149 cubes;
- shallow hierarchy around major mechanical owners.

Observed semantic owners include:

- root truck body;
- steering;
- left/right doors;
- front wheel group;
- individual front/rear wheels;
- other mechanical/presentation subassemblies.

### Trailer 1

Representative simple trailer:

- 6 bones;
- 50 cubes;
- root trailer owner;
- shared wheel group;
- four individual wheel owners.

This is a clean example of many cubes sharing a small number of mechanical transform owners.

### Trailer 2

Representative grain/offload trailer:

- 24 bones;
- 65 cubes;
- hierarchy depth around 14;
- trailer body;
- trailer bed;
- rear gate;
- a chained grain/content structure;
- wheel group and wheel owners;
- a non-visible `GrainOffloadLocator`.

This is strong evidence that deep hierarchy can be justified by a specific deformation/presentation sequence, but is not a vehicle-wide quality target.

## Upgrade / Variant Geometry

Observed truck upgrade families such as:

- bumper;
- exhaust;
- lamps;
- mirrors;
- spikes;
- livery layers.

They are authored as modular geometry branches beneath the same truck semantic root.

### Modelling lesson

```text
base vehicle
+
optional modular visual assembly
```

is preferable to duplicating the entire vehicle geometry for every visual upgrade when the core form is unchanged.

This strengthens a generic variant rule:

> isolate the smallest geometry branch that materially changes.

## Mechanical Animation Ownership

Observed animation families include:

- wheel rotation;
- steering;
- whole-truck presentation rotation;
- trailer rotation;
- long load/offload choreography;
- persistent unloaded states.

Wheel animation explicitly targets wheel owners. Steering targets front wheel owners plus steering wheel/steering owner.

### Candidate principle

```text
wheel spin
→ wheel articulation owner

steering angle
→ steering-related articulation owners

body orientation
→ root vehicle owner
```

Do not distribute a rigid-body transform across unrelated child cubes when one semantic owner explains it.

## Load / Offload Choreography

Long trailer/load animations involve many semantic owners: cargo groups, trailer bed/gate, hook/grabber parts, pipes, content segments, and locators.

This reinforces:

- long choreography has broader owner scope;
- clip complexity follows required interaction, not asset category;
- locators may participate in visual choreography without visible geometry;
- persistent loaded/unloaded representation can be separated from transition choreography.

## Locator Evidence

`GrainOffloadLocator` is a clear non-visible transform identity embedded in the trailer hierarchy.

This directly supports existing LazyDesigner policy:

> non-visible attachment/effect/reference position is Locator/ATTACHMENT intent, not a placeholder cube.

## Wheel Group Pattern

Shared parent wheel groups own common placement while individual wheels own local spinning/steering.

Generic abstraction:

```text
shared assembly placement
→ parent owner

independent repeated articulation
→ child owners
```

This is useful for:

- wheels;
- propellers;
- paired doors;
- repeated pistons;
- mechanical arms.

## Candidate Rules

### V1 — Mechanical owner follows mechanism

Status: `CANDIDATE_RULE`.

Vehicle hierarchy should isolate only subassemblies with real independent transform/state/attachment responsibility.

### V2 — Visual upgrade isolation

Status: `CANDIDATE_RULE`.

When an upgrade changes only a local assembly, author that assembly as a modular branch rather than duplicating unrelated base geometry.

### V3 — Shared-parent / repeated-child articulation

Status: `PATTERN`.

Use a shared semantic parent for repeated components that share assembly placement, while preserving child owners only where each component requires local articulation.

## Current Verdict

Advanced Truck Simulator materially strengthens LazyDesigner knowledge for:

- vehicle/mechanical decomposition;
- wheel/door/steering ownership;
- locators;
- modular visual upgrades;
- long mechanical choreography;
- clearance/pivot reasoning.

No mission, UI, script, function, or gameplay architecture is admitted into this study.
