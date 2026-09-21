# Semantic Rig / Pivot Engine

Status: SOURCE FOUNDATION
Updated: 2026-09-21
Branch: Local

## Goal

Move rig planning from manually authored pivots/bones toward semantic geometry relationships:

```text
geometry instances
+ explicit joint/chain intent
+ anchor semantics
+ optional end target
+ recipe symmetry
→ deterministic bone plan
→ optional FABRIK solve
→ existing add_group batch
```

## Current source foundation

- geometry-derived MIN/CENTER/MAX pivots;
- explicit JOINT intent;
- multi-part CHAIN intent;
- optional FABRIK target solve while preserving segment lengths;
- recipe-owned rig symmetry mirroring;
- deterministic rig diff;
- compilation into the existing `add_group(groups=[...])` batch contract.

No new public tool is registered.

## Boundaries

The engine never guesses that a semantic group is an arm, leg, door or hinge merely from its name. Joint/chain intent must be explicit or come from a future approved reference/authoring recipe field.

Native Group creation, transferOrigin, IK controller behavior, animation compatibility and visual acceptance remain owned by the existing Blockbench runtime/tool surfaces.

## Next source work

- add explicit HINGE/SLIDER/ROTATOR templates only where they reduce repeated mechanical calculations;
- compile optional native IK-controller plans through the existing `bone_rigging` owner;
- add affected-only rig planning tied to Parametric compiled diff;
- benchmark intent payload and correction scope against explicit bone-by-bone authoring.
