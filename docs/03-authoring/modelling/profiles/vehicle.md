# LazyDesigner Modelling Profile — VEHICLE

Updated: 2026-09-18

This profile is a lightweight modelling knowledge layer for vehicle assets. It complements `lazydesigner-modelling` and the approved reference package. It is **not** a preset geometry recipe and must never override visible reference evidence or explicit user requirements.

## Scope

Use for vehicles where transport identity and vehicle-specific assemblies materially affect modelling decisions, including:

```text
cars
motorcycles
bicycles/carts
trains/rail vehicles
aircraft
boats/watercraft
construction/service vehicles
fantasy/sci-fi vehicles
```

Use `MECHANICAL` instead when mechanism/kinematics are the dominant identity and transport behavior is secondary.

## Core Interpretation Order

Resolve the vehicle in this order:

```text
overall envelope / stance
→ primary body/chassis
→ running/ground-contact system
→ cabin/cockpit/operator volume
→ front/rear identity
→ articulated/moving assemblies
→ secondary structural details
→ surface-only detail
```

Do not start with lights, grilles, trim, bolts, or other small features before the body, stance, wheel/track relationship, and major silhouette are correct.

## Semantic Assembly Vocabulary

Use only assemblies supported by the approved reference. Typical vehicle-level semantic parts may include:

```text
body / chassis
cab / cockpit
hood / bonnet
roof / canopy
front_module
rear_module
wheel_front_left / wheel_front_right
wheel_rear_left / wheel_rear_right
track_left / track_right
axle / bogie / suspension-visible cohort
bumper / fender / guard
windshield / window cohort
door / hatch / trunk / hood panel
seat / handlebar / steering wheel
rotor / propeller / wing / rudder
mast / crane arm / bucket / attachment
light cohort
exhaust / intake
```

Names are semantic identifiers, not instructions to create all listed parts.

## Vehicle Proportion Contract

Before detailed construction, resolve only the relationships that materially control recognition:

```text
width : height : length
wheelbase / axle spacing when visible
track width / left-right running-gear spacing
ground clearance
body-to-wheel/track proportion
cab/cockpit placement
front overhang / rear overhang
roofline or upper silhouette
major taper / slope / curvature direction
```

Never infer engineering dimensions from a photo unless explicitly provided. Use the approved whole-model dimensions as numeric authority and the reference for proportion distribution inside that envelope.

## Running / Ground-Contact System

For wheels, tracks, skids, floats, landing gear, or other support systems:

- preserve required count and cohort relationships;
- preserve ground-contact height and stance;
- check left/right symmetry only when the reference supports it;
- preserve visible wheel/track diameter-to-body relationship;
- preserve axle/track spacing when identity-critical;
- do not let running gear float, sink, or detach from its visible mounting relationship;
- do not create hidden axles/suspension as fact when the reference does not establish them.

If wheels or tracks animate, keep them as semantically separable motion participants with sensible rotation/pivot ownership.

## Front / Rear Identity

Vehicles often depend on orientation-specific identity. Explicitly resolve:

```text
front marker(s)
rear marker(s)
left/right asymmetry if any
operator/cockpit facing
lighting/bumper/grille arrangement
exhaust/intake placement
```

Do not mirror an asymmetric vehicle for convenience.

## Cabin / Cockpit / Openings

When present, preserve:

- window/opening silhouette;
- windshield rake or canopy form when visible;
- door/hatch boundaries that materially change geometry;
- seat/operator region only when visually supported;
- open vs closed cockpit state;
- negative spaces around frame/handlebar/cage structures.

A dark window is not automatically a cavity. Distinguish material/glass from actual opening using supporting views.

## Articulated and Moving Assemblies

Typical motion categories:

```text
ROTATE_CONTINUOUS   wheel / rotor / propeller
ROTATE_BOUNDED      steering / rudder / door / hatch
HINGE               door / ramp / hood / bucket
TRANSLATE           slider / piston / retractable panel
CHAINED_ARTICULATION arm / crane / excavator assembly
STATIC               fixed body/trim
```

For each material moving part, preserve:

```text
semantic parent
motion type
axis intent
pivot region
clearance
closed/open contact invariant when applicable
```

Do not invent mechanical linkage detail merely because a real vehicle would usually contain it.

Prefer a shared assembly parent when repeated parts share placement but need local articulation, for example a wheel cohort with independently rotating/steering wheel owners. The parent may be non-visible.

A wheel or other visible mechanical part may participate in more than one animation channel without requiring duplicate geometry or duplicate ownership when the same semantic owner remains correct.

Visual upgrades, cargo, livery-related geometry, or other local presentation variants should contribute only the smallest changed branch when the base vehicle form and articulation remain unchanged.

## Geometry vs Texture Ownership

Use Geometry for:

```text
major body silhouette
wheel/track volume
cab/cockpit volume
fenders/guards that affect silhouette
openings and negative-space boundaries
bumpers / exposed structural bars
movable doors/hatches/panels
rotor/propeller/wing geometry
large lights/intakes/exhausts when volumetric
```

Prefer Texture for:

```text
panel lines
paint graphics
logos/markings
grille pattern when surface-only
minor seams
small warning labels
flat light graphics when no volume is required
surface wear
```

Use plane/cutout representation only where the reference and alpha-owned silhouette justify it.

## Repeated and Symmetric Cohorts

Wheels, windows, seats, lights, track links, vents, and similar repeated elements should be treated as semantic cohorts when appropriate.

```text
resolve one cohort relationship
→ derive repeated placement consistently
→ preserve intentional asymmetry
```

Do not model repeated elements as unrelated guesses. Do not force symmetry where the reference shows asymmetry.

## Useful Reference Views

For whole-vehicle modelling, the most decision-critical views are commonly:

```text
FRONT      → width / front identity / wheel-track stance
LEFT       → length / wheelbase / profile / cab placement
BACK       → rear identity / taper / rear attachments
TOP        → footprint / width-length relationships / roof-cockpit layout
FRONT-LEFT 3/4 → supplemental volume / layering / attachment readability
```

Use only source-supported views. Additional structural detail should target occluded mechanisms or assemblies, not duplicate already-clear views.

## Vehicle-Specific Verification Priorities

Before detail polish, verify in this order:

```text
1. overall silhouette and stance
2. primary body/chassis proportion
3. wheel/track count, spacing and ground contact
4. front/rear orientation correctness
5. cabin/cockpit placement and openings
6. attachment topology
7. articulated-part pivots/clearance when relevant
8. repeated cohort consistency
9. secondary geometry
10. surface-only details
```

A visually correct grille does not compensate for the wrong wheelbase, stance, cabin position, or body silhouette.

## Common Failure Modes

Reject or correct these early:

```text
wrong wheel count or wheel/track spacing
vehicle floating above ground
body volume too narrow/wide/tall relative to reference
front/rear reversed or visually ambiguous
mirrored asymmetric details
wheels detached from body relationship
cockpit/cab placed incorrectly
openings filled with geometry
moving door/rotor/steering merged into fixed body
rotor/propeller pivot placed away from its visible axis
micro-cube over-detail before primary form is correct
surface markings represented as unnecessary geometry
hidden mechanical structure invented as fact
```

## Reference Package Handoff Expectations

When `profile = VEHICLE`, useful structured fields include, when supported:

```text
semantic parts
front/rear orientation
running-gear cohort
symmetry/asymmetry
primary attachment relationships
moving parts
motion type
pivot region
material regions
blocking unknowns
```

If wheel count, major attachment, orientation, or articulation is unresolved and it can change construction, keep it `BLOCKED` or `NEEDS_REVIEW`; do not let Codex invent it.

## Efficiency Rules

- Do not inspect or reason about every small component before a judgeable vehicle blockout exists.
- Build repeated cohorts coherently rather than one element at a time.
- Reuse fresh reference/model evidence for bounded corrections.
- Correct the largest structural difference first.
- Do not recapture every canonical view after a local edit; recapture affected views plus any view needed for regression risk.

## Completion Condition

The VEHICLE profile has done its job when Codex can identify the vehicle's primary body, stance/running system, orientation, key assemblies, motion-bearing parts, and material-vs-geometry responsibilities without relying on generic real-world assumptions.
