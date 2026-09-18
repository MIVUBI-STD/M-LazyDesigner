# LazyDesigner Modelling Profiles

Updated: 2026-09-11

This directory contains lightweight asset-class reasoning profiles used with `lazydesigner-modelling`. Profiles do not replace the approved reference, Reference Package, modelling core, or Runtime ToolSpecs.

## Canonical Profiles

```text
PROP_FURNITURE
VEHICLE
HUMANOID
CREATURE
MECHANICAL
PLANT_FOLIAGE
GENERIC
```

Use exactly one primary profile for a modelling decision unless a genuinely hybrid asset needs one narrowly scoped secondary relationship. Do not stack profiles by default.

## Selection Rule

Choose the profile by the asset's **dominant modelling problem**, not by incidental features.

| Primary profile | Choose when the dominant problem is |
| --- | --- |
| `PROP_FURNITURE` | rigid object construction, supports, storage/openings, panels, furniture/prop interaction |
| `VEHICLE` | transport body, stance, running/landing system, cabin/cockpit, vehicle articulation |
| `HUMANOID` | human-like body proportions, limbs, clothing/accessories, humanoid articulation |
| `CREATURE` | non-humanoid body plan, limb topology, tail/wing/jaw or other biological articulation |
| `MECHANICAL` | mechanism topology, linkage, axes, transform ownership, clearance |
| `PLANT_FOLIAGE` | vegetation/foliage silhouette, stem/branch/cluster structure, thin/alpha-dominant representation decisions |
| `GENERIC` | no specific profile materially improves the current decision without adding unsupported assumptions |

## Boundary Examples

```text
cabinet with hinged door
→ PROP_FURNITURE

vending machine with one service door
→ PROP_FURNITURE

robotic arm
→ MECHANICAL

forklift
→ VEHICLE

excavator
→ VEHICLE primary; mechanical arm relationship may be targeted secondary guidance

humanoid robot
→ HUMANOID when body/rig topology is humanoid
→ MECHANICAL when mechanism topology is the actual modelling problem

fantasy creature with membrane wings
→ CREATURE primary; local thin-carrier representation may be used without switching profile

potted plant
→ choose by dominant modelling target:
   plant is primary → PLANT_FOLIAGE
   pot/display furniture is primary → PROP_FURNITURE
```

## Hybrid Rule

A secondary profile may contribute only the exact relationship missing from the primary profile.

Example:

```text
primary: VEHICLE
secondary guidance: MECHANICAL only for crane-arm linkage
```

Do not load or merge the full secondary profile unless the modelling task actually changes owner. The approved reference and semantic part contract remain the source of truth.

## Profile Correction

Profile classification is reversible and is not asset state.

If later evidence shows another profile is materially better:

```text
current profile
→ reclassify profile
→ preserve valid reference/workspace state
→ continue with the better decision vocabulary
```

Do not restart the asset or invalidate accepted work solely because the profile label changes.

## Shared Rules

All profiles share these invariants:

```text
reference/user requirements remain authority
no fixed Cube counts or coordinates from profile knowledge
no invented hidden structure
semantic parts only when decision-critical
simplest representation preserving identity/buildability
geometry owns material 3D form; texture owns surface-only detail
motion ownership follows actual requirement/evidence
stable semantic ownership should survive clip/controller/presentation growth unless capability is missing
rig, clip, and controller complexity are separate budgets
local state/presentation variants isolate the smallest changed branch
moving Locator semantics should inherit animation from the correct parent Group/Bone; direct Locator keyframing is not assumed
family-level attachment semantics may stay stable without forcing identical topology
largest structural difference first
blocking vs non-blocking unknowns remain explicit
```

## Control / Codex Contract

LazyDesigner Control should resolve the primary profile before delivering modelling context to Codex. Codex receives the modelling core plus only the selected profile and any narrowly justified secondary guidance.

```text
Control
→ task + reference readiness
→ primary profile
→ lazydesigner-modelling
→ selected profile
→ Codex
```

This is a context-selection mechanism, not a second modelling workflow.

## Files

```text
prop-furniture.md
vehicle.md
humanoid.md
creature.md
mechanical.md
plant-foliage.md
generic.md
```
