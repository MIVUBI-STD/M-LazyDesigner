# Server Tool Ownership

`server/tools` contains Runtime tool implementations. Existing root files are a legacy flat layout; new shared/domain implementation should move toward explicit domain owners without changing MCP capability names.

## Migration rule

- Keep public capability names and executor behavior unchanged.
- Move reusable domain internals into a domain directory such as `animation/`, `texture/`, `particle/`, or `geometry/`.
- Update production imports to the canonical domain path.
- Retain a root compatibility re-export only when an existing import path may still be consumed externally or by older internal code.
- Add migrated wrappers to the repository ownership test so compatibility paths cannot regain implementation logic.

Canonical animation domain:

```text
server/tools/animation/create.ts            create executor
server/tools/animation/keyframes.ts          keyframe executor
server/tools/animation/timeline.ts           timeline executor
server/tools/animation/controller.ts         controller executor
server/tools/animation/rigging.ts            rigging executor
server/tools/animation/batch.ts              batch executor
server/tools/animation/shared.ts             shared helpers
server/tools/animation/controllerState.ts    controller state helpers
server/tools/animation/effectState.ts        effect state helpers
server/tools/animation/*Schema.ts            independent input contracts
server/tools/animation/controllerPlanner.ts  runtime-independent mutation planning
server/tools/animation/inspectionSchema.ts   inspection contract

matching root migration paths                compatibility re-export only
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
server/tools/paint/primitives.ts           primitive executor
server/tools/paint/brush.ts                brush executor
server/tools/paint/settings.ts             settings executor
server/tools/paint/selectionLayers.ts      selection/layer executor
server/tools/paint/shared.ts               shared paint helpers
server/tools/paint/layerState.ts           canonical layer-state helpers
server/tools/paint/selectionLayerSchema.ts canonical selection/layer input contract

matching root migration paths              compatibility re-export only
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
server/tools/texture/create.ts         create executor + native mutation
server/tools/texture/read.ts           read executor
server/tools/texture/assignment.ts     assignment executor
server/tools/texture/materials.ts      material executor
server/tools/texture/atlas.ts          atlas/audit owner
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


Current animation batch planning owner:

```text
lib/animation/batchPlanning.ts
  selection filtering
  mirror/smooth eligibility
  reverse time bounds
  planned-time validation

server/tools/animation/batch.ts
  Timeline sampling
  native keyframe mutation
  Undo
  preview/update
  receipts
```


Current paint selection planning owner:

```text
lib/texture/selectionPlanning.ts
  rectangle geometry predicate
  ellipse geometry predicate

server/tools/paint/selectionLayers.ts
  selection matrix mutation
  Undo
  UVEditor refresh
  layer execution/receipts
```


Current material state/membership ownership:

```text
server/tools/texture/materialState.ts
  PBR material lookup/validation
  runtime texture-state projection
  material-group lookup
  membership change application

lib/texture/pbrMaterialMembership.ts
  exclusive PBR membership planning
  normal/height conflict rules
  no-op/change planning

server/tools/texture/materials.ts
  Undo
  native material refresh
  semantic history
  receipts
```


## Element domain

```text
server/tools/element.ts               facade / registrar aggregation
server/tools/element/discovery.ts     discovery executor
server/tools/element/hierarchy.ts     hierarchy/group executor
server/tools/element/mutation.ts      rename/remove/duplicate executor
server/tools/element/shared.ts        shared element helpers

matching root migration paths         compatibility re-export only
```

New Element implementation belongs under `server/tools/element/`, not at the tools root.
