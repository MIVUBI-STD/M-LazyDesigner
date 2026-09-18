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

## Case-Level Audit — Truck 1

Representative `geometry.truck1`:

- 34 bones;
- 149 cubes;
- maximum hierarchy depth 3;
- 5 non-visual owners;
- one semantic root: `Truck`.

Important ownership examples:

```text
Truck
├─ steering
├─ Doors
│  ├─ Door
│  └─ Door2
├─ Front_wheels
│  ├─ Front_wheel_1
│  └─ Front_wheel_2
├─ Rear
│  └─ Rear_wheels
│     ├─ Rear_wheel_1
│     ├─ Rear_wheel_2
│     ├─ Rear_wheel_3
│     └─ Rear_wheel_4
└─ other rigid visual assemblies
```

The wheel groups contain **zero visible cubes**; the individual wheel owners contain the wheel geometry.

### Strong modelling conclusion

This is a clean example of two distinct responsibilities:

```text
shared assembly placement
→ non-visual parent owner

local repeated articulation
→ visible child owners
```

The parent is justified by transform organization, not visible volume.

## Case-Level Audit — Wheel / Steering Animation

Observed truck wheel animation targets only the individual wheel owners:

```text
Front_wheel_1
Front_wheel_2
Rear_wheel_1..4
```

Each spins around its local X rotation.

Steering animation targets:

```text
Front_wheel_1
Front_wheel_2
steering
```

The two front wheel owners receive steering yaw, while the steering-wheel owner receives its own rotation.

### Modelling implication

Do not merge:

```text
wheel spin
steering angle
steering-wheel motion
```

into one arbitrary owner when the mechanism contains separate transform responsibilities.

The same visible wheel may participate in more than one animation channel without needing another geometry duplicate.

## Case-Level Audit — Trailer 1

Representative `geometry.trailer1`:

- 6 bones;
- 50 cubes;
- hierarchy depth 2;
- only one non-visible grouping owner.

Structure:

```text
Trailer
└─ Trailer_wheels
   ├─ Trailer_wheel_1
   ├─ Trailer_wheel_2
   ├─ Trailer_wheel_3
   └─ Trailer_wheel_4
```

This is strong Minimum Sufficient Structure evidence:

> a multi-part mechanical object can remain extremely shallow when only the wheels need independent articulation.

## Case-Level Audit — Trailer 2 / Grain Chain

Representative grain trailer:

- 24 bones;
- 65 cubes;
- hierarchy depth 14;
- 4 non-visible owners.

Key structure:

```text
Trailer
├─ Trailer_Bak
│  ├─ Trailer_Klep
│  ├─ Grain_Plane
│  └─ Grain
│     └─ Grain1
│        └─ Grain2
│           ...
│              └─ Grain12
├─ Trailer_wheels
│  └─ four wheel owners
└─ GrainOffloadLocator
```

The depth-14 grain hierarchy is not generic vehicle structure; it is specific to staged content deformation/presentation during loading/offloading.

### Animation evidence

`animation.grain.offload`:

- rotates the trailer gate toward roughly 90 degrees;
- rotates the trailer bed;
- changes the grain plane;
- progressively scales `Grain12 ... Grain1` segments down over time;
- animates `GrainOffloadLocator`;
- hides unrelated hook/grabber/pipe presentation owners when necessary.

### Strong modelling conclusion

Deep hierarchy is justified here by a **specific ordered visual choreography**.

Therefore:

```text
deep hierarchy
is justified by
ordered transform/state dependency
not by
asset complexity or professionalism
```

This is a useful positive counterpart to the anti-overrigging rule.

## Case-Level Audit — Locator

`GrainOffloadLocator`:

- contains no visible cubes;
- owns a named locator `unload`;
- participates directly in the offload animation.

This is especially strong evidence for:

```text
ATTACHMENT / reference transform
can itself be animated
without visible geometry
```

The LazyDesigner Locator concept should therefore not be treated as static-only.

## Case-Level Audit — Modular Visual Upgrades

Representative bumper upgrade:

```text
Truck
└─ Upgrade_1
   └─ Bumper_Upgrade_1
```

- 3 bones;
- 2 visible cubes;
- base `Truck` owner remains empty in the upgrade geometry branch.

Representative livery:

```text
Truck
└─ Livery_1
```

- 2 bones;
- 4 cubes.

### Strong modelling conclusion

Visual variants can preserve the same base semantic root while contributing only the changed branch.

This directly reinforces:

> isolate the smallest changed branch; do not duplicate unchanged base geometry.

## Coupled / Uncoupled Geometry

The coupled grain-trailer geometry preserves the same semantic bone topology as the uncoupled trailer while changing world-relative pivot positions.

Safe conclusion:

> coupling/presentation context can preserve rig topology while changing placement/frame-of-reference.

This parallels first-/third-person presentation findings from Actions & Stuff and Friendly Fishing: **context change does not automatically imply new semantic hierarchy**.

## Current Verdict

Advanced Truck Simulator materially strengthens LazyDesigner knowledge for:

- vehicle/mechanical decomposition;
- wheel/door/steering ownership;
- locators;
- modular visual upgrades;
- long mechanical choreography;
- clearance/pivot reasoning.

No mission, UI, script, function, or gameplay architecture is admitted into this study.
