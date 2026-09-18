# LazyDesigner Modelling Profile — HUMANOID

Updated: 2026-09-18

This profile is a **decision-support layer** for humanoid Minecraft Bedrock modelling. It complements `lazydesigner-modelling`; it does not replace the approved reference, dictate fixed anatomy, or prescribe Cube counts/coordinates.

Use this profile for human-like characters, NPCs, stylized humanoids, armored characters, and other bipedal forms whose body structure is substantially humanoid.

## 1. Core Objective

Preserve the character's identity, proportion, silhouette, clothing/accessory hierarchy, and motion-readiness while keeping the model native to Blockbench/Minecraft Bedrock.

```text
reference evidence
→ humanoid semantic structure
→ motion-ready hierarchy
→ buildable geometry
→ cross-view verification
```

Do not force anatomical realism when the approved reference is intentionally stylized.

## 2. Primary Semantic Regions

Resolve only regions materially supported by the reference:

```text
head
neck
upper_torso
lower_torso / pelvis
left_upper_arm
left_lower_arm
left_hand
right_upper_arm
right_lower_arm
right_hand
left_upper_leg
left_lower_leg
left_foot
right_upper_leg
right_lower_leg
right_foot
```

Optional reference-supported regions may include:

```text
hair
hat / helmet
face attachments
shoulder armor
chest armor
coat / robe / skirt
belt / pouch
backpack
weapon / tool
cape / scarf
other accessories
```

These names are semantic identities, not mandatory bones or Cubes.

## 3. Proportion Contract

Before detail, resolve the whole-body proportion system:

```text
overall height
head-to-body relationship
shoulder width
chest / waist / pelvis relationship
arm length and thickness
leg length and thickness
hand / foot scale
stance width
dominant silhouette landmarks
```

Judge proportions across the whole figure, not part-by-part in isolation.

Do not silently normalize stylized proportions toward realistic human anatomy.

Examples of intentional stylization that must be preserved when reference-supported:

```text
large head
short limbs
broad shoulders
long coat silhouette
oversized gloves/boots
compact torso
asymmetric equipment
```

## 4. Body Segmentation

Segmentation should follow meaningful form and motion ownership.

A body region should be separated when at least one is true:

```text
it rotates independently
it has a materially different orientation
it requires joint clearance
it carries a distinct identity-bearing silhouette
it supports a separate accessory / attachment
```

Do not split a continuous rigid region merely to increase detail.

Do not merge separately moving regions merely to reduce part count.

## 5. Joint / Overlap Strategy

The highest-risk humanoid areas are:

```text
neck
shoulders
elbows
wrists
waist / pelvis
hips
knees
ankles
```

For any joint that will animate, preserve:

```text
parent-child relationship
pivot region
neighboring volume overlap
expected bend/rotation direction
clearance at representative extremes
coverage so the joint does not open into a visible hole
```

Avoid the common failure where limbs are separated by visible empty gaps in neutral pose just to make the rig easier.

Prefer controlled overlap/coverage that remains readable during motion.

## 6. Shoulder / Hip Construction

Shoulder and hip junctions deserve explicit attention because they strongly affect perceived stiffness.

### Shoulder

Check:

```text
arm attachment height
arm thickness relative to torso
shoulder overlap
armor/clothing ownership
rotation clearance
```

Do not attach the arm as a floating rectangular limb with an exposed void at the shoulder unless the design explicitly requires it.

### Hip

Check:

```text
pelvis width
leg root spacing
upper-leg overlap into pelvis region
skirt/coat interaction
forward/backward swing clearance
```

Do not create a large exposed crotch/hip gap solely to preserve leg rotation.

## 7. Knees / Elbows

For segmented limbs:

```text
upper segment
joint neighborhood
lower segment
```

must read as one continuous anatomical/mechanical assembly.

At bends, prioritize:

```text
continuous silhouette
minimal visible opening
no impossible intersection
no detached lower segment
```

Reference style may justify blocky joint articulation; it does not justify accidental holes.

## 8. Head / Face

Head geometry owns silhouette and real volume.

Texture may own:

```text
eyes
brows
mouth lines
skin markings
flat facial details
```

Geometry should own details only when they materially affect:

```text
silhouette
volume
layering
attachment
motion
```

Examples that may justify Geometry when reference-supported:

```text
nose volume
muzzle
helmet visor
large ears
horns
hair mass
beard mass
```

Do not overbuild tiny facial marks with micro-Cubes.

## 9. Clothing / Layering

Classify visible clothing by structural consequence:

```text
SURFACE_ONLY
→ Texture

LAYERED_VOLUME
→ Geometry / layered surface

MOTION_BEARING
→ separate semantic assembly when animation requires it
```

Examples:

```text
shirt color/pattern       → usually TEXTURE
jacket thickness/lapel    → Geometry when silhouette-relevant
belt marking              → Texture unless actual volume matters
coat tail / skirt         → Geometry when it changes silhouette or motion
helmet                    → Geometry when dimensional
```

Avoid using Texture to hide a missing silhouette layer.

## 10. Accessories / Equipment

For equipment such as backpack, hat, weapon, tool, basket, scarf or shoulder gear, resolve:

```text
owner / attachment part
contact point
orientation
independent motion requirement
silhouette importance
symmetry/asymmetry
```

Do not float accessories near the body without a supported attachment relationship.

If an accessory is removable or independently animated, preserve that semantic separation.

## 11. Hands / Feet

Hands and feet should match the approved style, not a generic realistic template.

Use more segmentation only when it materially improves:

```text
identity
silhouette
holding function
animation requirement
```

For ordinary Minecraft-style hands, individual fingers are usually unnecessary unless specifically required by the reference/function.

For feet/boots, preserve:

```text
length
width
orientation
sole/ground contact
identity-bearing toe/heel silhouette
```

## 12. Symmetry / Asymmetry

Humanoids are often structurally bilateral but visually asymmetric.

Separate:

```text
structural symmetry
visual/material asymmetry
functional asymmetry
```

Examples:

```text
same arm anatomy + one shoulder pad
same leg geometry + one pouch
one hand carries tool
one sleeve rolled up
```

Do not mirror away identity-critical asymmetry.

## 13. Motion Participation

When animation is required, classify important parts:

```text
RIGID_STATIC
RIGID_ARTICULATED
FLEXIBLE_CHAIN
ATTACHED_PROP
SECONDARY_MOTION
```

Examples:

```text
torso               → RIGID_ARTICULATED
upper/lower limb     → RIGID_ARTICULATED
scarf / cape         → SECONDARY_MOTION or FLEXIBLE_CHAIN when required
backpack             → ATTACHED_PROP
held tool            → ATTACHED_PROP / articulated depending on action
```

Do not create speculative animation hierarchy where the reference/task does not require it.

Animation-library growth is not evidence for hierarchy growth. Reuse stable semantic anatomy across locomotion, actions, held/worn presentation, and first-/third-person contexts unless a new transform, attachment, or deformation capability is actually missing.

A local visible state such as hand/open-close, mouth/face accessory, clothing configuration, or held-item presentation should isolate the smallest changed branch rather than duplicate unrelated body hierarchy.

## 14. Reference Priorities

For humanoids, prioritize reference evidence in this order when applicable:

```text
FRONT
→ width, bilateral proportion, limb spacing, face identity

LEFT / side-supported evidence
→ chest/back depth, head projection, limb depth, backpack/equipment

BACK
→ rear clothing, backpack, hair, armor, asymmetry

TOP
→ shoulder width/depth, head footprint, accessory placement when useful

FRONT-LEFT 3/4
→ volume/layering clarification only
```

For articulated characters, add `RIG_DEFORMATION`, `POSE_ACTION`, or `ANIMATION_KEYFRAME` only when they materially reduce downstream uncertainty.

## 15. Geometry vs Texture Ownership

Use Geometry for:

```text
body volume
silhouette-changing hair/clothing
armor volume
large accessories
real openings/layers
motion-bearing parts
```

Use Texture for:

```text
skin color
fabric pattern
flat seams
facial markings
small logos
surface-only wear
```

Use `UNRESOLVED` when the reference does not establish whether a feature is dimensional.

## 16. Humanoid Verification Order

Verify in this order:

```text
1. whole-body silhouette
2. head/body proportion
3. shoulder / pelvis width
4. arm and leg length/thickness
5. stance / ground contact
6. joint attachment and overlap
7. clothing/accessory layering
8. identity asymmetry
9. secondary geometric details
```

Do not polish face pixels or accessory micro-detail while primary body proportion is still wrong.

## 17. Common Failure Modes

Reject or correct when material:

```text
floating limbs
large hip/crotch gaps
open knees/elbows during expected motion
head scale drift
incorrect limb length
arms/legs attached at wrong height
flattened clothing silhouette
accessories with no credible attachment
mirrored-away asymmetry
texture used to fake missing volume
excessive micro-Cube anatomy
joint clearance achieved by breaking body continuity
```

## 18. Reference Package Expectations

For a humanoid, the Reference Package should include only relevant evidence, typically:

```text
profile: HUMANOID
primary semantic regions
whole-body proportion cues
identity asymmetry
clothing/accessory ownership
motion participation
joint/pivot concerns when animated
blocking unknowns
critical views
```

When animation is required, articulation metadata should preferentially identify:

```text
joint
parent
child
motion_type
axis_intent
pivot_region
coverage_requirement
clearance_requirement
deformation_risk
```

Do not invent exact pivot coordinates from an image.

## 19. Completion Condition

The HUMANOID profile has done its job when Codex can answer, without guessing materially:

```text
what are the primary body regions?
what proportions define the character?
what is structurally attached to what?
which parts must move independently?
where are joint-coverage risks?
which clothing/accessories require actual geometry?
what asymmetry must be preserved?
which unknowns block the next modelling decision?
```

The approved reference remains the visual authority; this profile only makes the relevant humanoid decisions easier to identify and verify.
