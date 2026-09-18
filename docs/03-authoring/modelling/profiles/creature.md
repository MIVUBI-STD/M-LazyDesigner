# LazyDesigner Modelling Profile — CREATURE

Updated: 2026-09-18

Use this profile for non-humanoid animals, monsters, fantasy creatures, quadrupeds, multi-limbed creatures, winged creatures, serpentine forms, and other articulated biological subjects whose topology differs materially from a humanoid.

This profile supplements `lazydesigner-modelling`; it does not replace approved reference evidence, the canonical Geometry standard, or animation-specific Skills. It provides decision vocabulary only. Never treat it as a preset anatomy or fixed rig.

## Primary Objective

Preserve the creature's recognizable body plan, locomotion logic, articulation, and identity-critical appendages while keeping the structure suitable for Minecraft Bedrock / Blockbench authoring and downstream animation.

```text
reference body plan
→ semantic anatomy
→ articulation / overlap
→ motion-ready hierarchy
→ geometry
```

Do not normalize every creature into a generic quadruped or humanoid skeleton.

## 1. Body-Plan Resolution

Before modelling, identify only source-supported semantic regions that materially affect construction:

```text
head / cranial mass
neck or head-to-torso connection
thorax / torso / primary body mass
pelvis / rear body mass when distinct
front limb cohort
rear limb cohort
additional limb cohort when present
tail / segmented posterior appendage
wing / fin / membrane assembly
jaw / mouth assembly
horns / antlers / ears / crest / antennae
special appendages
```

Regions may merge when the reference shows one continuous form. Do not create anatomical segmentation merely because a real animal would have it.

## 2. Body Axis / Spine Intent

Establish the dominant body axis before limb placement.

Consider:

```text
horizontal
vertical
arched
sloped
serpentine
segmented
UNRESOLVED
```

The body axis controls relative placement of head, torso, pelvis, limbs, tail, and major attachments. A visually incorrect axis can make every downstream proportion appear wrong even when individual part sizes are close.

For elongated or flexible bodies, use only enough semantic segments to preserve silhouette and intended motion. Do not approximate curvature with dense micro-cube chains when a smaller number of meaningful articulated segments is sufficient.

## 3. Limb Topology

Do not assume humanoid limb topology.

For each limb cohort, resolve when visible:

```text
attachment region
proximal segment
distal segment
terminal contact part
bend direction
resting orientation
motion participation
```

Terminal parts may be paws, hooves, claws, talons, fins, feet, hands, tentacle tips, or another source-supported form.

Repeated limbs should be represented as semantic cohorts when structurally equivalent, while preserving intentional asymmetry.

## 4. Ground Contact / Locomotion Stance

For grounded creatures, verify:

```text
which limbs bear weight
contact footprint
body height above ground
limb spread
front/rear stance relationship
body-axis angle
```

Do not judge limb placement only from the front view. Side and top evidence often determine gait stance and depth spacing.

A neutral standing pose should be stable and readable, but do not force all limbs into perfectly mirrored alignment if the approved reference uses a natural offset stance.

## 5. Joint Overlap / Coverage

Motion readiness must not create visible holes.

Important joint neighborhoods may include:

```text
neck/head
shoulder/front-limb root
hip/rear-limb root
elbow-like joint
knee/hock-like joint
wrist/ankle
jaw
wing root
wing fold joints
tail base
```

Preserve sufficient neighboring-volume overlap so expected movement does not immediately expose background through the creature.

```text
mobility
≠ detached-looking anatomy
```

Do not add large gaps purely to make joints easier to rotate.

## 6. Tail / Flexible Appendages

A tail, trunk, tentacle, long ear, whisker assembly, neck, or similar flexible feature should be segmented only when the reference or animation requirement justifies independent motion.

For a segmented flexible appendage, establish:

```text
root attachment
segment progression
bend direction
thickness/taper progression
terminal shape
expected motion range
```

Segment count follows visible form and motion need, not a fixed template.

A rigid decorative tail may remain one rigid assembly if that best matches the target.

For flexible chains, preserve ordered articulation and allow phase/amplitude differences along the chain when motion requires them; do not add unrelated owners merely to make motion look more complex.

Related creature assets may share semantic attachment/Locator contracts while using different body topology, hierarchy depth, segment counts, or pivots. Reuse family attachment semantics; do not force family anatomy into one fixed rig.

## 7. Wings / Fins / Membranes

Resolve whether a wing/fin is primarily:

```text
rigid mass
segmented articulated structure
plane-like surface
alpha/cutout carrier
mixed structure
```

For articulated wings, preserve:

```text
root attachment
major segment hierarchy
fold direction
outer extent
clearance against torso
membrane/feather ownership
```

Do not model every feather or membrane subdivision as geometry when texture or plane-like representation preserves the intended result better.

## 8. Head / Jaw / Face

Separate head features only when they affect silhouette, articulation, or identity.

Potential semantic parts:

```text
head
muzzle / snout
upper jaw
lower jaw
nose/beak
cheek mass
ears
horns/antlers
crest
eyes or eye-region geometry when actually dimensional
```

If the jaw is animated, the pivot relationship must preserve cheek/neck coverage and mouth closure. An open-jaw test must not expose unintended gaps through the side of the head.

Small facial markings and flat eye details normally belong to Texture unless they materially change silhouette or volume.

## 9. Horns / Antlers / Ears / Appendages

Treat identity-critical appendages as semantic parts rather than decorative afterthoughts.

Verify:

```text
root location
orientation
length/proportion
taper
symmetry/asymmetry
whether independently movable
```

Curved antlers/horns should use meaningful directional segments rather than dense voxel stepping.

Thin ears, fins, frills, whiskers, feathers, or membranes may use plane-like/cutout representation when appropriate.

## 10. Geometry vs Texture Ownership

Use Geometry for:

```text
body silhouette
volume
limb structure
joint coverage
muzzle/jaw volume
horn/ear/tail/wing silhouette
major layered surfaces
required openings
```

Use Texture for:

```text
fur pattern
scales/spots/stripes
small feather markings
facial markings
minor wrinkles
color transitions
flat claws/teeth detail when silhouette does not require geometry
```

Use `PLANT_FOLIAGE`-style thin-carrier reasoning only for local alpha-dominant appendages when that representation is materially useful; do not switch the whole creature profile because one ear, fin, feather layer, or membrane is thin.

## 11. Motion Participation

Each important semantic part should be classified when animation matters:

```text
RIGID
ARTICULATED
FLEXIBLE_CHAIN
SECONDARY_MOTION
NONPARTICIPATING
UNRESOLVED
```

Examples:

```text
head → ARTICULATED
tail → FLEXIBLE_CHAIN
horn → NONPARTICIPATING
large ear → SECONDARY_MOTION
jaw → ARTICULATED
```

These are reference-backed classifications, not mandatory animation instructions.

## 12. Reference Priorities

High-value evidence for CREATURE usually includes:

```text
FRONT      → width, facial symmetry/asymmetry, limb spread
LEFT       → body axis, limb bend, head/neck, tail profile
BACK       → rear-limb/tail attachment, rear asymmetry
TOP        → body depth, limb spacing, wing spread, head width
3/4        → attachment and overlapping volume readability
```

Additional detail views are justified for:

```text
jaw
wing root
paw/hoof/claw
complex horn/antler
joint overlap
hidden tail attachment
```

Do not request extra views that cannot change the next modelling decision.

## 13. Rig-Readiness Guidance

When animation is required, verify before Geometry approval:

```text
semantic movable hierarchy exists
pivot regions are plausible
joint overlap is sufficient
limb/body clearance is plausible
jaw/wing/tail attachments are not floating
expected motion does not depend on hidden unsupported geometry
```

The profile does not author animation keyframes. Animation construction remains owned by `lazydesigner-animation`.

## 14. Creature-Specific Verification Order

Prioritize defects in this order when applicable:

```text
wrong body plan / missing limb or appendage
→ wrong head/body/tail topology
→ wrong body axis / major silhouette
→ wrong limb placement / stance / ground contact
→ broken joint coverage / floating attachment
→ wrong appendage proportion/orientation
→ secondary geometric detail
```

A visually recognizable front view does not pass a creature if side/top evidence shows impossible limb depth, broken tail attachment, or floating wings.

## 15. Common Failure Modes

Reject or correct:

```text
humanoid skeleton forced onto non-humanoid anatomy
generic quadruped normalization that changes identity
front/rear limbs merged or swapped
incorrect limb depth spacing
floating jaw, wing, horn, ear, or tail
large visible joint gaps
rig-friendly cuts that destroy body continuity
tail/neck/wing segmented into excessive micro-parts
wrong body-axis slope
feet/paws not contacting the intended ground plane
thin membranes overbuilt with cubes
texture used to fake missing structural volume
unsupported hidden anatomy invented from species assumptions
```

## 16. Reference-Package Expectations

A strong CREATURE package should expose only relevant structured facts, for example:

```text
profile: CREATURE
semantic_parts:
  - torso
  - head
  - front_leg_left
  - front_leg_right
  - rear_leg_left
  - rear_leg_right
  - tail_base
  - tail_mid
  - tail_tip

articulation:
  - joint: neck
  - joint: front_leg_root
  - joint: rear_leg_root
  - joint: tail_base

unknowns:
  blocking: []
  non_blocking: []
```

Do not invent standard animal anatomy absent from the approved reference.

## Completion

The CREATURE profile has done its job when Codex can identify the intended body plan, semantic assemblies, ground/attachment relationships, articulation risks, and geometry-vs-texture ownership without receiving a fixed creature template.
