# LazyDesigner Modelling Profile — MECHANICAL

Updated: 2026-09-18

This profile is a **lightweight modelling knowledge layer** for machinery and mechanical assemblies where kinematics, rigid-part relationships, linkages, clearances, and transform ownership materially affect construction.

It supplements `lazydesigner-modelling`; it does not replace the approved reference, canonical Geometry rules, Runtime ToolSpecs, or animation specialist.

## Scope

Use `MECHANICAL` when the object's identity depends primarily on mechanical assemblies rather than vehicle identity or ordinary prop/furniture structure.

Typical examples:

```text
industrial machine
robotic arm
press / lift
crane mechanism
gearbox-like exposed assembly
conveyor component
mechanical door system
engine-like machinery
articulated tool or apparatus
```

Do not choose `MECHANICAL` merely because an object contains one hinge, wheel, handle, or moving part. Prefer `PROP_FURNITURE` or `VEHICLE` when those profiles better describe the whole asset.

## Core Principle

```text
REFERENCE EVIDENCE
→ SEMANTIC ASSEMBLIES
→ MOTION / CONTACT RELATIONSHIPS
→ TRANSFORM OWNERSHIP
→ GEOMETRY
```

Never infer a real-world mechanism that is not visible or required. Mechanical plausibility supports the reference; it does not override it.

## 1. Semantic Assembly Inventory

Before detailed Geometry, identify only assemblies that materially affect shape, attachment, movement, or identity.

Useful vocabulary:

```text
FRAME
HOUSING
BASE
ARM
LINK
SLIDER
SHAFT
AXLE
HINGE
ROTARY_MEMBER
LINEAR_MEMBER
PLATFORM
PANEL
TOOL_HEAD
GRIPPER
PISTON-LIKE_MEMBER
CABLE_OR_HOSE_CARRIER
GUARD
SUPPORT
```

These are semantic roles, not mandatory parts.

For each material assembly, resolve when evidence allows:

```text
id / semantic name
parent assembly
contact / attachment target
rigid or articulated
motion type
axis or travel direction
clearance requirement
symmetry / repetition
geometry-vs-texture ownership
evidence state
```

## 2. Structural Order

Default reasoning order for a nontrivial mechanism:

```text
overall envelope
→ fixed frame / base
→ major rigid assemblies
→ articulated chain or sliding path
→ attachment/contact interfaces
→ motion clearance
→ guards / panels / housings
→ secondary mechanical detail
→ surface-only detail
```

Do not start with bolts, vents, grooves, cables, or decorative machinery detail before the primary assembly relationships are coherent.

## 3. Transform Ownership

Mechanical assemblies often fail when rotation/translation is assigned to the wrong element.

Determine transform ownership before exact coordinates:

```text
shared assembly rotation
→ Group/Bone-owned

local rigid decorative angle
→ Cube-owned when appropriate

hinged member
→ pivot belongs to the hinge relationship

rotary shaft / wheel / rotor
→ pivot follows the supported rotation axis

sliding component
→ hierarchy must preserve the intended travel direction and parent relationship
```

Do not create extra pivots simply because an element could theoretically move.

Use a shared assembly parent when several repeated components share placement but require their own local articulation. A non-visible parent is valid when it owns only transform organization.

The same visible mechanical owner may participate in multiple motion channels when the pivot/parent relationship is still correct; do not duplicate geometry merely to separate clip responsibilities.

Local mechanism states or upgrade assemblies should isolate only the smallest changed branch when the surrounding base mechanism remains unchanged.

## 4. Motion Vocabulary

Use the smallest motion model supported by the reference/requirement:

```text
RIGID_FIXED
ROTATE
HINGE
SLIDE
TELESCOPIC
LINKED_ROTATION
LINKED_TRANSLATION
COMPOUND_ARTICULATION
FLEXIBLE_GUIDED
UNRESOLVED
```

This vocabulary describes the relationship; it does not prescribe animation keyframes.

If motion is not required and does not materially affect Geometry, keep the assembly rigid instead of inventing articulation.

## 5. Linkage Reasoning

When multiple moving members are visibly linked:

```text
parent motion
→ connection point
→ child motion
→ required overlap/contact
→ allowed clearance
```

Preserve the visible connection throughout plausible movement.

Do not fake linkage continuity using floating members or arbitrary intersections that only look correct from one view.

For unclear hidden linkage:

```text
VISIBLE / SUPPORTED
→ model supported relationship

NOT VISIBLE + NOT REQUIRED
→ leave internal mechanism unresolved/omitted

NOT VISIBLE + REQUIRED FOR IDENTITY OR MOTION
→ BLOCK dependent construction or request decision-changing evidence
```

## 6. Hinges / Axes / Shafts

For a meaningful hinge or rotary assembly, preserve:

```text
axis direction
pivot region
parent side
child side
attachment continuity
clearance through expected motion
```

A visually round part does not automatically imply rotation.

A visible axle/shaft should connect the assemblies it visibly belongs to; do not leave it as an isolated decorative cylinder/cuboid unless the reference supports that reading.

## 7. Sliding / Telescopic Assemblies

For sliding or telescopic parts, resolve:

```text
travel direction
stationary guide
moving member
minimum overlap
extension limit when visible/relevant
collision / clearance envelope
```

Do not expose impossible gaps or disconnect nested members simply to make movement easier.

## 8. Clearance and Collision Reasoning

Mechanical Geometry should be checked at meaningful motion relationships, not only at the neutral pose.

Material checks include:

```text
member-to-frame clearance
linkage self-intersection
hinge sweep
slider travel
rotor/wheel sweep
opening/closing panel clearance
tool-head operating envelope
```

Do not create large visual gaps merely to guarantee clearance. Prefer correct pivot placement, hierarchy, or bounded local adjustment.

## 9. Supports and Load-Bearing Readability

When the reference visibly communicates structural support, maintain:

```text
base contact
support-to-frame attachment
platform support
suspended assembly attachment
load-bearing arms / brackets
```

The model need not simulate engineering forces, but visibly load-bearing parts should not float or terminate without the support relationship shown in the reference.

## 10. Repetition and Symmetry

Mechanical assets commonly contain repeated cohorts:

```text
paired rails
multiple pistons
roller rows
parallel arms
repeated supports
fan/rotor blades
gear-like visual cohorts
```

Treat repeated parts as semantic cohorts when they share shape and transform intent.

Derive the relationship once, then build coherently. Do not independently improvise every repeated component.

Symmetry is evidence-driven. Preserve intentional asymmetry such as one-sided control boxes, service panels, hoses, tools, guards, or attachments.

## 11. Geometry vs Texture

Use Geometry when the feature materially affects:

```text
silhouette
volume
contact
opening
layering
motion
clearance
attachment
```

Use Texture for surface-only information such as:

```text
panel lines
painted indicators
small fastener marks
warning stripes
surface labels
fine grooves
minor wear
```

Do not create micro-Cubes for every bolt, rivet, vent line, or seam.

## 12. Housings / Guards / Panels

A housing or guard may be:

```text
SOLID_CUBOID
LAYERED_SURFACE
PLANE_LIKE
PLANAR_CUTOUT_CARRIER
SEGMENTED_FORM
```

depending on visible depth and silhouette.

Preserve openings and access gaps that materially define the machine. Do not close an exposed mechanism simply because a solid box is easier to build.

## 13. Cable / Hose / Flexible Elements

Only model cables/hoses when they materially affect identity, silhouette, attachment, or motion readability.

For important flexible elements:

```text
root attachment
path intent
terminal attachment
minimum necessary segmentation
motion participation
```

Do not approximate long flexible paths with excessive unit-scale Cube clutter.

If a cable/hose is texture-scale detail, reserve it for Texture or omit it with reason.

## 14. Reference Priorities

Useful evidence depends on the mechanism:

```text
FRONT / LEFT / TOP
→ overall assembly, depth, spacing, motion-axis reading

BACK
→ rear linkage, drive/support structure, asymmetry

FRONT-LEFT 3/4
→ layered relationship and connection readability

STRUCTURAL_DETAIL
→ hinge, linkage, slider, shaft, attachment, tool head, guide

RIG_DEFORMATION
→ only when articulation/clearance materially affects downstream motion

ANIMATION_KEYFRAME
→ only when sequence or coupled motion cannot be inferred safely from structure alone
```

Do not request a detail sheet for mechanisms already clear in the main approved reference.

## 15. Mechanical Reference Package Expectations

For material mechanical assemblies, the Reference Package should preferably expose semantic relationships such as:

```text
part id
role
parent/contact
motion participation
motion type
axis/travel intent
clearance requirement
symmetry/repetition
evidence state
```

Example:

```json
{
  "id": "upper_arm",
  "role": "GEOMETRY",
  "parent": "base_turret",
  "contact": "shoulder_hinge",
  "motion": "HINGE",
  "axis_intent": "source-supported hinge axis",
  "clearance": "must clear base housing",
  "evidence": "SUPPORTED"
}
```

This is semantic guidance only. Exact Blockbench coordinates, rotation values, Cube counts, and keyframes remain Codex authoring decisions.

## 16. Verification Priority

For a mechanical asset, verify in this order unless the reference requires another order:

```text
1. overall identity / envelope
2. fixed-frame and primary assembly topology
3. part count and repeated cohorts
4. attachment/contact relationships
5. axis / transform ownership
6. motion clearance for required articulated parts
7. openings / exposed-mechanism readability
8. secondary mechanical detail
9. texture/material detail
```

A visually detailed machine with incorrect linkage, attachment, or axis structure is not a Geometry PASS.

## 17. Common Failure Modes

Reject or correct these when material:

```text
invented hidden mechanism
floating linkage
shaft/axle disconnected from its assembly
hinge pivot placed for convenience rather than visible relationship
slider with no guide/overlap
articulated member intersecting its frame through expected motion
large artificial clearance gaps
forced symmetry hiding source asymmetry
micro-cube bolt/vent clutter
surface panel lines built as unnecessary Geometry
mechanical detail added before primary assembly topology is correct
```

## 18. Boundary with Other Profiles

Use `VEHICLE` when vehicle stance/body/running gear is the dominant modelling problem, even if machinery is present.

Use `PROP_FURNITURE` when the object is primarily a static/interactive prop and mechanical behavior is secondary.

Use `MECHANICAL` when mechanism topology and articulation are central to how the object must be constructed.

Do not stack profiles by default. If a vehicle contains a crane arm, `VEHICLE` can remain primary while only the relevant mechanical relationship is supplied as targeted technical guidance.

## Completion

The MECHANICAL profile has done its job when Codex can identify:

```text
what assemblies must exist
what attaches to what
which parts move and how
where transform ownership belongs
what clearances are materially required
what remains fixed
what belongs to Geometry vs Texture
what mechanical uncertainty remains blocking
```

Then return to the canonical `lazydesigner-modelling` workflow for actual authoring and verification.
