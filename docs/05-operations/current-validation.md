# LazyDesigner Current Validation

Updated: 2026-09-12

This file owns **current proof interpretation only**. Product workflow belongs in `docs/01-product/flow.md`; reference preparation in `docs/02-reference/`; source ownership in `docs/04-system/implementation-map.md`; continuation in `docs/05-operations/next-action.md`.

## Current Source Architecture

```text
ChatGPT Reference Preparation
→ Reference Package
→ LazyDesigner Control
→ Codex
→ Gateway
→ Runtime
→ Plugin
→ Blockbench
```

Canonical Control source: `mcp/gateway/control/`. Navigator active source path: removed.

The current source contract is Bedrock-first and keeps one ownership chain. Geometry and Texturing share AUTHORING; Animation is the only separate authoring Runtime surface.

## Source-Proven Contracts

### Control

```text
ASSET_AUTHORING / SYSTEM_DEVELOPMENT intake
Reference Package + Active Workspace projection
GEOMETRY_CONTEXT / TEXTURE_CONTEXT / ANIMATION_CONTEXT
exactly-one-profile Geometry loading
content-addressed context handles
stage-scoped readiness and bounded invalidation
control_delta continuation
```

Control selects context and lifecycle state; it is not a second Runtime, recovery engine, semantic database, or persistent authored-state database.

The normal authoring packet is intentionally compact. It carries decision/readiness/reference/workspace identities and does not duplicate complete Geometry/Texture/Animation semantic documents inside `stage_context`.

### Gateway

The public AI-client surface remains exactly:

```text
status
search_capabilities
describe_capability
invoke_capability
```

Current source contains:

```text
persistent Gateway process boundary
demand-driven Runtime reconnect
bounded reconnect backoff
Runtime signature/catalog invalidation
catalog fast-path for discovery
serialized Runtime mutations
fail-closed project affinity
phase affinity
structured recovery semantics
OUTCOME_UNKNOWN with no mutation replay
normalized public status
canonical declarative capability effects
```

Plugin reload, Runtime rebuild, authoring phase change, or temporary Runtime loss are designed to recover below the persistent Gateway. Only replacing the Gateway process itself requires client reconnection. This behavior is **source-designed but not live-proven in the current phase**.

Catalog invalidation after phase changes remains intentionally conservative until same-AUTHORING-surface transport reuse is covered by local Gateway/Runtime tests. The Runtime receipt already distinguishes `surface_changed=false` for Geometry↔Texturing from true AUTHORING↔Animation handoff.

### Runtime

Current ownership is split explicitly:

```text
server/net.ts                         Runtime HTTP/MCP transport + operation serialization
server/runtime/registration.ts       registration/profile/surface ownership
server/runtime/consolidatedRoutes.ts consolidated route descriptors
server/runtime/consolidatedTools.ts  routing-only wrappers
server/runtime/phaseControl.ts       authoring-focus + AUTHORING↔Animation control capability
server/runtime/bootstrap.ts          exactly-once Runtime initialization
server/runtime/extensions.ts         ordered Runtime extension composition
server/runtime/textureRuntimeContracts.ts   Texture contract enrichment
server/runtime/animationRuntimeContracts.ts Animation contract enrichment
server/tools/**                       domain Tool implementations
```

`switch_authoring_phase` applies the registered Runtime phase/surface handler before returning its Gateway handoff receipt. Geometry↔Texturing remains one shared AUTHORING surface; Animation remains the only foreign authoring surface.

Runtime phase/profile changes use granular registration/surface state rather than creating a second workflow engine.

### Plugin / Blockbench Boundary

```text
mcp/index.ts                         plugin orchestration only
mcp/plugin/runtimeHost.ts           native network + listener lifecycle
mcp/plugin/blockbenchIntegration.ts settings/UI/prompts/resources integration
mcp/plugin/devSync.ts               development reload watcher
```

Setup/teardown ownership is explicit and defensive against duplicate setup/reload.

### Tools — Zero Capability Loss

Tool cleanup is **routing/metadata/contract hardening only**.

Source guards preserve:

```text
original executor definitions
original runtime schemas/refinements/defaults
validation before execution
native Blockbench behavior
all consolidated branches
domain intelligence for Geometry / Texture / Animation / Particle
```

Consolidated capabilities delegate to retained original executors. Unknown branches fail instead of silently falling back to another operation.

Family baselines guard Geometry/Element, Texture/Material, Animation, Particle, Inspection and Export surfaces. Consolidated validation-preservation guards cover Inspection, Material, Animation Timeline, and Material Instances rather than Animation Timeline alone. No implementation algorithm was intentionally simplified for context/tool-count reduction.

### Validation / QA / Gates

Canonical handoff readiness: `mcp/lib/authoringReadiness.ts`.

```text
USER_APPROVED
or
AUTONOMOUS_VERIFIED
```

Animation handoff requires UV Layout PASS, no blockers and a saved checkpoint plus the appropriate approval/authorized-verification evidence.

Canonical Validator projection: `mcp/lib/validationVerdict.ts`.

```text
BLOCKED
REVIEW_REQUIRED
VALIDATOR_CLEAR
```

`VALIDATOR_CLEAR` remains technical evidence only:

```text
approval_claim = false
visual_pass_claim = false
```

Quality-intelligence augmentation remains evidence-only and cannot create approval or phase authorization. Control lifecycle `READY` also does not replace `switch_authoring_phase` readiness.

### Skills / Knowledge / Context

Canonical semantic owners remain:

```text
docs/04-system/ai-context-loading.md
docs/04-system/authoring-stage-context.md
docs/04-system/control/context-projection.md
```

Normal authoring hot path loads one active specialist and only the stage-relevant Control projection. Geometry may additionally load exactly one selected modelling profile. `authoring-stage-context.md` is the canonical cross-stage semantic owner but is **conditional context**, loaded only for a material cross-stage/approval/freshness/convergence/handoff ambiguity rather than duplicated on every authoring turn.

Reference Preparation compiles confirmed user intent before generation and does not pass raw conversation transcript or prompt history as the Codex handoff package.

### Development Source Ownership

Control development routing points public consolidated capabilities at their actual Runtime public owners:

```text
inspect_elements
manage_material
manage_material_instances
manage_animation_timeline
→ mcp/server/runtime/consolidatedTools.ts

switch_authoring_phase
→ mcp/server/runtime/phaseControl.ts
```

This prevents bounded SYSTEM_DEVELOPMENT work from defaulting to the compatibility `mcp/server/tools.ts` facade when the public route is owned elsewhere.

## Compatibility Boundary

Current product-facing identity is LazyDesigner. These compatibility-bound values remain intentionally unchanged until a separately dependency-mapped migration:

```text
package/server/plugin IDs
blockit_mcp.js
blockit_mcp
blockit-gateway
BLOCKIT_* environment variables
x-blockit-* affinity headers
persisted setting identifiers
build/provenance identities coupled to them
```

Legacy-looking compatibility identifiers are not evidence of stale architecture by themselves.

## Historical Native Evidence

Historical BlockIT native/runtime proof predates the current LazyDesigner hardening. It must **not** be used as proof that the current `Local` source is installed, type-correct, live, or behaviorally accepted.

## Current Proof Ceiling

REMOTE_GITHUB verification has been exercised during the current synchronization pass and has already exposed stale contracts that are being corrected. A terminal `verify:full` PASS is not yet claimed until the exact synchronized head completes successfully.

The current head has **not been typechecked/executed locally** or proven live in Blockbench.

Safe current claims:

```text
Control/Gateway/Runtime/Plugin ownership         implemented in source
single-owner authoring context flow              implemented + regression-guarded in source
Runtime phase-handler application                implemented + source-guarded
persistent-Gateway recovery architecture        implemented in source
zero-loss Tool routing contracts                implemented + regression-guarded in source
canonical QA/readiness separation               implemented + regression-guarded in source
stage-context/context-loading economy            implemented/guarded in source
Reference Package compact projection            implemented in source
compatibility boundaries                         documented in source
```

Still requiring terminal/current-head or higher-context proof:

```text
terminal verify:full on synchronized exact head
installed LazyDesigner Runtime freshness
live Gateway survival across reload/rebuild/close-open
native phase-switch transport behavior on the current build
same-AUTHORING-surface no-reconnect optimization
native project affinity/rebind behavior
Undo/playback/persistence/export execution
visual/reference acceptance
Minecraft in-game behavior
measured token/latency or whole-task usage savings
```

## Efficiency Interpretation

Authoring Efficiency means **Cost to Accepted Result**, not fewer tools or fewer lines. Source changes target repeated context loading, duplicate routing, unnecessary discovery/readback, phase bouncing, cache churn and recovery ambiguity while preserving accepted quality and capability.

Static character counts or source size alone cannot prove end-to-end usage improvement.

## Proof Rule

Do not strengthen source/static claims into local/live/visual claims without matching evidence from the exact current source SHA.


## Remote Quality / Representation Closure

Updated: 2026-09-18

REMOTE_GITHUB now has explicit representation-eligibility coverage for:

```text
SOLID_CUBOID
PLANE_LIKE
PLANAR_CUTOUT_CARRIER
LAYERED_SURFACE
SEGMENTED_FORM
TEXTURE
OMIT
```

The representation ladder is regression-locked to bounded one-level-at-a-time escalation, with `REDUNDANT_GEOMETRY` and minimum-sufficient-geometry rules preserved. The existing six synthetic benchmark cases cover rigid prop/furniture, vehicle, articulated character/mob, organic/curved form, mechanical assembly, and layered/cutout behavior. No seventh case is added because no uncovered material construction class was found in the current remote audit.

This closes remote/source coverage only. Measured visual quality, native playback/contact, save/reopen, and installed Blockbench behavior remain `LOCAL_CODE` / `LIVE_BLOCKBENCH` proof.
