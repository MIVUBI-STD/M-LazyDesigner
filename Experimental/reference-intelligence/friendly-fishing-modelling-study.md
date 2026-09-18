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

## Current Verdict

Friendly Fishing materially strengthens knowledge for:

- compact aquatic creature rigs;
- organic chain motion;
- mouth/state variants;
- paired appendage symmetry;
- held-object presentation;
- secondary segmented structures.

No non-modelling gameplay/content architecture is admitted.
