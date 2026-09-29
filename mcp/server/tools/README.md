# Server Tool Ownership

`server/tools` contains Runtime tool implementations. Existing root files are a legacy flat layout; new shared/domain implementation should move toward explicit domain owners without changing MCP capability names.

## Migration rule

- Keep public capability names and executor behavior unchanged.
- Move reusable domain internals into a domain directory such as `animation/`, `texture/`, `particle/`, or `geometry/`.
- Update production imports to the canonical domain path.
- Retain a root compatibility re-export only when an existing import path may still be consumed externally or by older internal code.
- Add migrated wrappers to the repository ownership test so compatibility paths cannot regain implementation logic.

Current migrated animation internals:

```text
server/tools/animation/shared.ts           canonical shared helpers
server/tools/animation/controllerState.ts  canonical controller state helpers
server/tools/animation/effectState.ts      canonical effect state helpers
server/tools/animation/batchSchema.ts        canonical batch/copy-paste input contracts
server/tools/animation/controllerSchema.ts   canonical controller input contract
server/tools/animation/keyframeSchema.ts      canonical keyframe/graph input contracts
server/tools/animation/timelineSchema.ts      canonical timeline input contract
server/tools/animation/controllerPlanner.ts  runtime-independent mutation planning
server/tools/animation/inspectionSchema.ts   canonical inspection input contract

matching root paths                         compatibility re-export only
```

Do not introduce a second routing/registry layer here. Registration remains owned by `server/runtime/registration.ts`; tool modules own implementation only.


## Runtime augmentation boundary

Tool implementation and Runtime augmentation are separate owners.

```text
server/tools/*                         base tool implementation / registration
server/tools/<domain>/*                reusable tool-domain internals
server/runtime/extensions/<domain>/*   post-registration Runtime augmentation
server/runtime/extensions.ts           extension composition order
```

Do not place new `*-native-intelligence` or post-registration wrapper logic in `server/tools`.


Current migrated paint internals:

```text
server/tools/paint/shared.ts      canonical paint helpers
server/tools/paint/layerState.ts           canonical layer-state helpers
server/tools/paint/selectionLayerSchema.ts canonical selection/layer input contract

matching root paths               compatibility re-export only
```


## Tool contract split

Large executors should not own schemas that are consumed independently by Runtime extensions. Prefer:

```text
<domain>/...Schema.ts   input/contract definition
root tool executor      registration + native mutation
runtime/extensions/*    post-registration augmentation consuming the schema directly
```

This prevents Runtime extensions from importing a large executor only to reuse its Zod contract.


Current migrated texture contract:

```text
server/tools/texture/createSchema.ts    canonical create_texture input contract
server/tools/texture/materialSchema.ts  canonical material input contracts
server/tools/texture/materialState.ts   canonical material lookup/state projection
server/tools/texture-create.ts         executor + native mutation
server/runtime/textureRuntimeContracts.ts consumes schema directly
```


## Planning boundary

Complex tools should keep deterministic mutation planning outside the native executor when practical.

```text
schema  → validates request shape
planner → mutates an in-memory plan using injected Runtime dependencies
executor→ resolves Blockbench objects, opens Undo, applies plan, emits receipt
```

The planner must not directly access Blockbench process globals, Undo, Gateway, or Runtime composition.
