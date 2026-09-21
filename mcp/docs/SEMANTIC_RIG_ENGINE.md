# Semantic Rig / Pivot Engine

Status: REMOTE SOURCE BOUNDED / LIVE PROOF PENDING
Updated: 2026-09-21
Branch: Local

## Goal

Move rig planning from manually authored pivots/bones toward explicit semantic geometry relationships:

```text
geometry instances
+ explicit joint/chain/mechanical intent
+ anchor semantics
+ optional FABRIK target
+ recipe symmetry
→ deterministic bone plan
→ existing add_group / bone_rigging ownership
```

## Current source foundation

- geometry-derived MIN/CENTER/MAX pivots for unrotated source geometry;
- explicit JOINT and CHAIN intents;
- optional FABRIK target solve while preserving segment lengths;
- explicit HINGE / ROTATOR / SLIDER templates;
- recipe-owned rig symmetry mirroring;
- affected rig scope derived from source-instance ownership;
- native IK-controller intent compilation through existing `bone_rigging`;
- compilation into the existing `add_group(groups=[...])` batch contract;
- existing/external parent identities are delegated to the canonical `add_group` preflight rather than reimplemented;
- no new public tool.

## Hardening rules

- rotated source geometry fails closed for geometry-derived pivots until transformed-anchor semantics are explicitly defined;
- no semantic type is guessed from Group/instance names;
- no second rig executor or persistent rig database;
- do not keep standalone diff/planning helpers without an execution consumer.

## Proof boundary

Native Group creation, transferOrigin, IK controller behavior, animation compatibility, Undo/Redo, save/reopen and visual acceptance remain LOCAL_CODE/LIVE_BLOCKBENCH proof.
