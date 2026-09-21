# LazyDesigner UV Authoring Engine

Status: SOURCE FOUNDATION IN PROGRESS  
Updated: 2026-09-21  
Branch: `Local`

## Purpose

Replace coordinate-first UV authoring with a maintainable intent-driven UV subsystem for Minecraft Bedrock / Blockbench.

The target interaction is:

```text
authoring intent / constraints
→ deterministic UV plan
→ dry-run metrics
→ atomic native apply
→ audit / lock
```

AI and UI should normally express intent. They should not calculate raw UV coordinates unless an explicit low-level correction is required.

## Architecture Boundary

```text
Blockbench project state
        ↓ adapter
UvLayoutSnapshot (plain data)
        ↓
Island extraction
        ↓
Constraint + density planning
        ↓
Packing backend candidates
        ↓
Scorer / stable-layout policy
        ↓
UvLayoutPlan (plain data)
        ↓ adapter / transaction
Blockbench Undo + native UV state
        ↓
existing UV audit / visual verification
```

The UV Core MUST NOT store Blockbench `Cube`, `Texture`, `Project`, canvas, or UI objects.

Runtime/native ownership remains at the adapter/apply boundary.

## Source Layout

Current / intended ownership:

```text
mcp/lib/uv/
├── contracts.ts
├── islands.ts
├── density.ts
├── constraints.ts
├── packing/
│   ├── types.ts
│   ├── maxRects.ts
│   ├── scorer.ts
│   └── planner.ts
├── stacking.ts              future
├── orientation.ts           future
├── receipt.ts               future
├── invalidation.ts          future
└── adapters/
    ├── blockbenchCubeUv.ts  future
    └── blockbenchTemplate.ts future
```

Legacy owners remain authoritative until the adapter/apply stage is explicitly integrated:

- `mcp/lib/boxUvLayout.ts`
- `mcp/lib/uvPhysicalEvidence.ts`
- `mcp/server/tools/texture-atlas.ts`
- `mcp/server/tools/texture-create.ts`
- `manage_cubes` native UV fields

Do not silently redirect current production mutations to the new planner before atomic apply + rollback + receipt tests exist.

## Data Model

### UvIsland

An island owns:

- stable ID;
- source Cube identity;
- one Box-UV region or one explicit face region;
- current UV rectangle;
- physical area and density basis;
- declarative constraints.

### Constraints

Constraint policy is independent from packing:

```text
locked
rotation allowed / step
density PRESERVE / NORMALIZE / CUSTOM
stack_group
lock_group
semantic_group
mirror_policy
unique_detail
padding_pixels
priority
```

Conflicting rules fail closed. Packer order must never decide semantic intent.

### Versioning

Every applied future plan/receipt must retain:

```text
planner_version
packing_backend
packing_backend_version
constraint schema/version
```

Changing a backend implementation must not silently rewrite established project layouts.

## Density Contract

Density is expressed in physical pixels per model unit.

Logical UV and bitmap size remain distinct:

```text
logical 128 × bitmap 256
→ 2 physical pixels per logical UV unit
```

The density layer:

- measures current U/V density;
- reports anisotropy;
- supports PRESERVE / NORMALIZE / CUSTOM;
- proposes island sizes only;
- does not choose placement.

Box UV uses its native logical footprint as the density basis so Bedrock template semantics remain stable.

## Packing Backend

### maxrects_v1

Primary source implementation uses a small deterministic TypeScript MaxRects-style backend.

Reasons:

- Bedrock Cube UV is rectangle-dominant;
- no native/WASM dependency;
- deterministic CI fixtures;
- 90-degree rotation can be constraint-controlled;
- backend can be replaced without changing UV intent;
- readable and maintainable in the current Bun/TypeScript stack.

The backend owns placement only. It MUST NOT decide:

- semantic groups;
- stacking permission;
- mirroring;
- logo/text uniqueness;
- texel-density policy;
- lock policy.

### Blockbench native

Native `TextureGenerator.generateTemplate` remains:

- Bedrock compatibility path;
- existing production fallback;
- regression/reference oracle;
- template rebuild owner until new atomic apply is proven.

Do not vendor/copy Blockbench internal source into UV Core.

### xatlas

General mesh unwrap remains a future optional adapter only.

Do not integrate xatlas until:

- Cube-centric U0-U8 is stable;
- Blockbench Mesh authoring demonstrates a real accepted-result gap;
- native/WASM/build maintenance cost is justified.

## Stable Packing Modes

Source planner currently defines:

```text
REPACK_ALL
ADD_ONLY
AFFECTED_ONLY
REPACK_SELECTED
```

Behavior:

- locked islands are fixed obstacles;
- ADD_ONLY keeps all existing islands fixed;
- affected/selected modes move only explicit island IDs;
- missing IDs fail closed;
- rotation is retained in placement metadata;
- physical-pixel padding is converted to logical UV units before packing.

Global rebuild is not the default answer to a small model update.

## Scoring

Packing quality is multi-dimensional. Do not reduce it to occupancy only.

Current score contract separates:

```text
valid
hard_violations
occupancy_ratio
density_error
movement_cost
fragmentation
semantic_spread
```

Some fields remain zero/placeholders until their owning planners land. They must not be interpreted as measured quality yet.

Priority order:

1. zero hard violations;
2. declared density/rotation/lock constraints;
3. minimum destructive movement;
4. packing efficiency / fragmentation;
5. semantic locality when implemented.

## Implementation Status

```text
U0 core contracts + versioned plan types     SOURCE IMPLEMENTED
U1 deterministic island extraction           SOURCE IMPLEMENTED
U2 physical-pixel / density planner           SOURCE IMPLEMENTED
U3 declarative constraints + conflict guard  SOURCE IMPLEMENTED
U4 deterministic MaxRects planner/scorer     SOURCE IMPLEMENTED
U5 stable incremental packing modes           SOURCE IMPLEMENTED
U6 evidence-driven stack proposals             SOURCE IMPLEMENTED
U7 Blockbench adapter + atomic apply/receipt  NEXT
U8 native compatibility / invalidation proof AFTER U7
U9 optional mesh/xatlas investigation         DEFERRED
```

Current U0-U5 code is read-only planning infrastructure. It does not replace native UV mutation yet.

## U6 — Stack / Symmetry

SOURCE IMPLEMENTED as proposal/evidence logic only. Candidate discovery remains separate from application.

Evidence may include:

- matching physical dimensions;
- matching face topology;
- mirrored counterparts;
- repeated semantic components.

Reject automatic stacking when:

- `unique_detail=true`;
- mirror policy forbids it;
- identity/text/logo intent is unique;
- directional artwork requires independent pixels.

Output must be proposals with evidence, not automatic hidden overlap.

## U7 — Native Apply

Required before production integration:

1. snapshot exact source UV state;
2. verify plan still targets the same source state;
3. translate island placement/orientation into native Box/per-face UV;
4. one scoped Undo transaction;
5. rollback on any partial failure;
6. emit changed island/face receipt;
7. rerun existing global UV audit;
8. invalidate downstream texture/seam/variant/PBR evidence only for affected mapping scope.

No second public Gateway surface is required merely for UV.

## U8 — Compatibility

Prove:

- Box UV state survives save/reopen;
- per-face mapping survives save/reopen;
- Undo/Redo restores exact UV state;
- native template generation remains compatible;
- logical/physical pixel mapping remains integral;
- downstream texture invalidation is precise;
- established layouts do not change because a planner backend version changed.

## Stop Rules

Do not:

- place MaxRects logic inside `manage_cubes`;
- let packer infer semantic intent;
- create a UV coordinate-generating AI prompt as the primary workflow;
- add GPU/WASM/workers before CPU evidence requires them;
- integrate xatlas just because it exists;
- copy Blockbench GPL internals;
- mutate existing styled UV globally when an incremental plan can preserve it;
- claim visual UV quality from occupancy or audit numbers alone.

## Proof Boundary

REMOTE_GITHUB can prove:

- pure planner determinism;
- constraint behavior;
- packing validity;
- density math;
- source-level rollback contracts once implemented;
- static integration ownership.

LOCAL_CODE is required for:

- representative packing benchmark;
- memory/GC measurements;
- backend heuristic comparison when performance matters.

LIVE_BLOCKBENCH is required for:

- native UV apply;
- Undo/Redo;
- save/reopen;
- template compatibility;
- visual seam/orientation/texture acceptance.
