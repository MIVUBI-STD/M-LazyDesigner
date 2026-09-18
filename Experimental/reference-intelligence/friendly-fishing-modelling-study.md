# Friendly Fishing — Creature / Held-Object Modelling Study

Status: `OBSERVATION` / `PATTERN` extraction only. Analysis-only external corpus.

## Scope

Only creature geometry, rig hierarchy, animation, attachables, rods/held objects, and related presentation are considered.

Recipes, worldgen, structures, gameplay systems, and content progression are ignored.

## Representative Creature Geometry

Observed examples:

| Asset | Bones | Cubes | Max hierarchy depth |
| --- | ---: | ---: | ---: |
| Angler fish | 9 | 15 | 2 |
| Barracuda | 15 | 16 | 6 |
| Blob fish | 9 | 7 | 5 |
| Crab | 21 | 18 | 5 |
| Fish 0 | 20 | 19 | 7 |
| Fish 1 | 16 | 24 | 6 |
| Piranha | 10 | 12 | 5 |
| Whale | 14 | 13 | 8 |

The range demonstrates that similar creature families can legitimately use materially different hierarchy depth according to body segmentation, fins, jaw state, tail structure, and articulation.

## Fish Chain Pattern

Representative fish rigs commonly separate:

- front/body mass;
- rear body;
- tail;
- tail fin;
- left/right fins;
- optional mouth/head;
- special appendages such as angler illicium.

This provides a compact organic chain:

```text
front body
→ rear body
→ tail
→ tail fin
```

with side appendages attached at the appropriate segment.

## Distributed Swimming Motion

Fish swim animations distribute oscillation across body segments with phase differences.

Representative pattern from Fish 0:

- front body has small yaw oscillation;
- rear body has stronger opposite oscillation;
- tail continues the motion;
- tail fin increases terminal movement;
- fins use smaller periodic rotations.

Barracuda adds different phase offsets across body-back and tail.

### Generic modelling/animation lesson

This strongly confirms Mowzie-derived organic reasoning:

> continuous organic motion should be distributed across a meaningful chain rather than forcing all motion into the terminal segment.

## Motion Amplitude Along a Chain

A useful recurrent pattern is:

```text
proximal body
→ lower amplitude

rear body
→ stronger response

tail
→ continued response

terminal fin
→ highest/readable terminal motion
```

This is not a fixed numerical rule. It is evidence that amplitude can increase toward a flexible distal segment when the motion requires it.

## State / Form Variants

Barracuda geometry separates closed/open mouth structures and bite animation addresses those owners directly.

Generic lesson:

```text
materially different visible form
→ state variant owner can be justified
```

This supports the existing `STATE` responsibility candidate.

## Paired Fins

Left/right fins share structural role but can use mirrored signs/directions.

This reinforces:

> paired anatomy shares topology/role, not necessarily identical transform values.

## Rod / Held-Object Presentation

The super-rod animation surface contains distinct:

- first-person wield presentation;
- third-person wield presentation;
- non-player third-person presentation;
- cast/reel state clips;
- fishing-line segment transforms;
- bobber relationships.

The line is represented as an ordered set of repeated segments whose rotation/position/scale changes according to the overall line relation.

### Modelling lesson

A held object can contain:

```text
rigid primary object
+
attachment/presentation transform
+
secondary segmented structure
+
terminal object
```

For a fishing rod:

```text
rod
→ line root
→ repeated line segments
→ bobber
```

This is a strong example of combining `ATTACHMENT + ARTICULATION/FOLLOW` without inflating the rigid rod itself.

## First-Person / Third-Person Split

The same rod uses different presentation transforms for first-person and third-person views.

This independently converges with Actions & Stuff:

> presentation context can change transform/clip selection without requiring unrelated base geometry.

## Candidate Rules

### F1 — Organic chain follows body continuity

Status: `PATTERN`.

Segment body chains according to actual bending responsibility; distribute motion over the chain.

### F2 — Distal motion may amplify

Status: `CANDIDATE_RULE`.

When reference/motion requires follow-through, distal segments may use greater or phase-shifted motion than proximal segments. Do not apply this automatically.

### F3 — Held-object secondary structures remain separate

Status: `CANDIDATE_RULE`.

Keep rigid held-object geometry distinct from secondary flexible/segmented structures when they have different motion responsibility.

### F4 — View-context presentation reuses semantic asset

Status: `PATTERN`.

First/third-person differences should normally change presentation transforms/animation selection rather than create unrelated asset hierarchies.

## Case-Level Audit — Fish Family Root / Locator Contract

Several representative fish geometries share a stable outer hierarchy:

```text
root
└─ root2
   └─ root3
      └─ visible body chain
```

Representative examples:

- Barracuda: 15 bones / 16 cubes / depth 6;
- Piranha: 10 bones / 12 cubes / depth 5;
- Whale: 14 bones / 13 cubes / depth 8;
- Fish template 0: 20 bones / 19 cubes / depth 7;
- Fish template 1: 16 bones / 24 cubes / depth 6.

The root layer often carries non-visible locators such as:

- `offset.lure`;
- `offset.caught`;
- `lead` on head/body owners;
- whale-specific `blow_hole` and baleen-related locators.

### Strong modelling conclusion

A reusable creature-family contract can preserve a small set of stable **presentation/attachment locators** while allowing internal anatomy to vary by species.

```text
family-level attachment contract
→ stable locator semantics

species-specific form
→ variable geometry / articulation depth
```

This is useful evidence for family consistency without forcing identical rigs.

## Case-Level Audit — Barracuda Mouth State

Barracuda separates:

```text
head
├─ mouth_closed
└─ mouth_open0
   └─ mouth_open1
```

All mouth variants share the same head parent and local pivot region.

This is direct evidence for the `STATE` responsibility:

> materially different visible mouth form may justify local variant owners while preserving the same parent anatomy.

Do not duplicate the full fish rig for a mouth-state change.

## Case-Level Audit — One-Sided Surface Carriers

Fish templates frequently separate a transform owner from a `_one_sided` child containing visible cubes:

Examples:

```text
tail
└─ tail_one_sided

leftFin
└─ leftFin_one_sided

rightFin
└─ rightFin_one_sided
```

In Fish 0, several articulation owners contain zero cubes while the visible one-sided surface lives in the child.

Safe modelling conclusion:

> transform ownership and visible surface-carrier ownership may be separated when render/surface requirements justify it.

This should not become a default extra hierarchy layer; use it only when the rendering/geometry representation actually requires separation.

## Case-Level Audit — Whale Long-Body Chain

Whale uses:

```text
body_pivot
└─ body_front
   └─ body_back
      └─ tail0
         └─ tail1
            └─ tailFin
```

The large body therefore preserves several ordered articulation points rather than using one giant tail rotation.

This reinforces organic chain continuity at a larger scale.

## Case-Level Audit — Super Rod Rig vs Visible Geometry

The supplied super-rod set exposes a particularly useful separation.

### Rig-only geometry

`geometry.super_rod_rig.mnp_ci`:

- 4 bones;
- 0 cubes;
- depth 3.

Structure:

```text
root
└─ fishing_rod0
   └─ fishing_rod1
      └─ rod_line1
```

This is a pure transform/helper skeleton with no visible geometry.

### Third-person visible geometry

`geometry.tp_super_rod.mnp_ci`:

- 29 bones;
- 30 cubes;
- depth 7;
- rigid rod body;
- reel parts;
- rod-line roots;
- bobber;
- line helper structures.

### Strong modelling conclusion

```text
presentation rig
can exist independently from
visible geometry payload
```

This is strong evidence that non-visible owner structure can be reusable across presentation variants.

## Case-Level Audit — Fishing Line Segmentation

The super-rod package contains many line-segment geometry variants for both first-person and third-person presentation.

The full rod animation set separates:

- wield first-person;
- wield third-person;
- third-person non-player;
- first-person fishing line;
- third-person line root rotation;
- third-person fishing line;
- charge;
- cast;
- casted;
- reel add;
- stuck reel add;
- sway;
- flail.

Fishing-line animations address ordered line owners such as:

```text
line_root0
line_root1
line0..line9
line_bobber0
line_bobber1
```

while cast/reel animation addresses rod and bobber owners separately.

### Modelling conclusion

Flexible secondary structures can have their own ordered segmentation and motion responsibility while remaining attached to a rigid primary object.

This is a strong `ATTACHMENT + FOLLOW + ARTICULATION` example.

## Case-Level Audit — Rod Animation Controller

The super-rod animation controller has four semantic states:

```text
default
charge
cast
casted
```

Within those states, first-person sway/flail/charge/cast/reel clips are selected conditionally.

Safe authoring conclusion:

> controller state composition should select among already-capable rig owners; it should not drive hierarchy growth by itself.

This independently reinforces the Actions & Stuff controller-vs-rig separation.

## Case-Level Pattern — Family Locators + Variable Anatomy

Status: `PATTERN`.

Across fish examples:

```text
stable attachment/presentation locator semantics
+
species-specific anatomy depth and silhouette
```

can coexist cleanly.

This suggests future LazyDesigner family authoring may reuse locator contracts without imposing one fixed geometry topology.

## Current Verdict

Friendly Fishing materially strengthens knowledge for:

- compact aquatic creature rigs;
- organic chain motion;
- mouth/state variants;
- paired appendage symmetry;
- held-object presentation;
- secondary segmented structures.

No non-modelling gameplay/content architecture is admitted.
