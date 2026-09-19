# LazyDesigner Current Validation

Updated: 2026-09-19

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
semantic freshness receipt with stale/fresh/unknown scopes
control_delta continuation
```

Control selects context and lifecycle state; it is not a second Runtime, recovery engine, semantic database, or persistent authored-state database.

Post-operation Control deltas now retain the compatibility-level authoring-domain invalidation summary while also projecting semantic freshness scopes for Geometry structure, UV mapping, Texture appearance, material/render state, Animation motion/controller/effects, and Particle state. Successful bounded effects can therefore preserve unrelated scopes without a reassurance reread; failed/uncertain mutations report freshness as unknown instead of pretending unchanged state. Runtime result evidence also keeps authored state fresh for Animation selection/playback/timeline-view/clipboard-copy operations, no-op Animation loop requests that already match the current mode, Particle preparation that performs neither a file write nor native preview, Material Instance list/get reads, Render Profile inspect, Render Profile compile-only operations with no output write, and Material save persistence that does not alter already-authored material semantics. Persistence-only Material save still marks the workspace projection changed while preserving semantic freshness. Incomplete mixed read/write receipts remain conservative. For successful capabilities that are normally classified as mutations, a source-proven `NO_CHANGE` receipt narrows post-operation verification to `receipt_only`. Complete real-mutation receipts now also qualify for `receipt_only` when they carry the final affected authored state: Animation Effects returns final effect entries or explicit removals; Animation Controller returns only final affected state subgraphs with transitions, animation links, sounds and particles plus explicit created/removed identities; PBR Material create/configure/assign-channel returns compact final channel/config state; imported texture-set materials return their final material/channel/config state; TextureGroup creation returns final group plus texture assignments; Material Instance set/bulk-set/clear returns exact final Cube/face/material changes. Legacy or incomplete shapes retain canonical focused-read guidance. Geometry hot-path receipts now also remove redundant reads for Locator/Null Object mutations and bounded Group add/modify/reparent results. Subtree translation remains focused-read because descendant final state is summarized only. Cube simplify dry-run/unchanged is state-neutral and receipt-only; actual Cube and animation-motion changes remain visual because semantic completeness does not constitute visual/reference acceptance. Visual evidence can now be bounded by `control_delta.verification_scope`: exact changed Cube UUIDs plus rendered bounds (directly consumable by existing `capture_model_views` explicit framing), affected Animation bone/time range with start/mid/end review samples, or Paint Transaction texture/affected-rect/revision. Paint Transaction also returns the exact post-mutation affected-region PNG in the same mutation response, so bounded texture corrections do not require an immediate full-atlas reread. This narrows observation cost without weakening visual acceptance. Retained mutations that previously inherited `not_applicable` verification now carry explicit semantics: geometry duplication and visual texture edits remain visual; rigging/material-import/group mutations require focused state verification unless a complete receipt proves continuation state.

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
bounded queue-wait / operation-duration observability through Gateway status
deterministic Gateway fault contracts for queue saturation, interrupted reads/mutations, and runtime-signature invalidation
fail-closed project affinity
phase affinity
structured recovery semantics
OUTCOME_UNKNOWN with no mutation replay
normalized public status
canonical declarative capability effects
producer-side affinity receipt schemas for project creation and phase handoff
```

Plugin reload, Runtime rebuild, authoring phase change, or temporary Runtime loss are designed to recover below the persistent Gateway. Only replacing the Gateway process itself requires client reconnection. This behavior is **source-designed but not live-proven in the current phase**.

Catalog invalidation after phase changes remains intentionally conservative until same-AUTHORING-surface transport reuse is covered by local Gateway/Runtime tests. The Runtime receipt already distinguishes `surface_changed=false` for Geometry↔Texturing from true AUTHORING↔Animation handoff.

### Protocol / Transport

Current source is on the MCP TypeScript SDK v2 split packages and has exact-head source proof for both protocol eras on the same Runtime endpoint:

```text
MCP 2026-07-28 modern client
→ version negotiation / server discovery
→ tools/list
→ tools/call

legacy 2025-era client
→ initialize
→ tools/list
→ tools/call
```

The modern path is owned by `createMcpHandler(..., { legacy: "reject", responseMode: "auto" })`. Modern MCP 2026 POST responses are forwarded in the SDK-selected representation (JSON or `text/event-stream`) instead of being rejected by LazyDesigner. The modern SDK handler uses `responseMode="auto"`: ordinary calls remain JSON while per-request progress/log messages can upgrade to SSE. The outer Node→Web bridge forwards SSE incrementally instead of buffering the stream to completion. Finite MCP requests still force the connection closed for deterministic request ownership; only `subscriptions/listen` may retain the client's long-lived connection semantics. The separate legacy compatibility transport remains JSON-only. The official conformance workflow uses the same `server/net.ts` transport but activates a process-local fixture surface containing only pinned-suite protocol fixtures. Fixture registration now requires both the dedicated harness environment opt-in and the process-local harness flag, so production cannot enter fixture mode through one accidental signal. It now includes core content/resources/prompts/completion, progress notifications through the SDK v2 request context, and SEP-2322 input-required/requestState flows backed by the SDK HMAC codec. Production registration is bypassed only in that harness. The temporary legacy compatibility leg keeps LazyDesigner's established request-owned JSON behavior with `WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })`; both legs construct the same canonical Runtime server/tool/resource/prompt surface.

Current source-proven transport properties include:

```text
loopback-only listener
modern MCP 2026-07-28 negotiation and tool invocation
legacy stateless JSON compatibility
Host/Origin validation
header/body size limits
ambiguous/malformed HTTP header rejection
serialized native tool mutation
project/phase affinity enforcement
generation-safe teardown with pre/post execution fencing
```

Node now owns HTTP framing in `server/net.ts`; LazyDesigner still owns a bounded Node→Web Request bridge plus Host/Origin/body-limit/affinity/generation policy around MCP dispatch. The remaining transport debt is narrower: the modern 2026 path is SDK-owned, while legacy 2025 JSON uses a temporary official-SDK stateless transport shim because server v2.0.0 does not apply `responseMode="json"` to its built-in legacy fallback. Do not add another transport path or custom legacy protocol parser. Remove the shim only when the supported SDK can preserve the required legacy JSON contract itself, or when that compatibility contract is intentionally retired.

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

Tool-family facades (`animation.ts`, `texture.ts`, `paint.ts`, `element.ts`) are compatibility/aggregation owners only; concrete implementation ownership lives in their focused sibling modules documented in `docs/04-system/implementation-map.md`.

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

## Local-Test Handoff Baseline

The source state handed to local testing is:

```text
Local SHA: 7d3abf40238373461085fac179fcbbc07a7da300
Head Proof: PASS
MCP Verify: PASS
MCP Conformance: PASS
Managed Distribution: PASS
```

This closes the remote/source acceptance partition for that exact SHA. Local testing should not repeat the repository audit; it should prove only LOCAL_CODE and LIVE_BLOCKBENCH residue through `docs/05-operations/local-acceptance-runbook.md`.

## Current Proof Ceiling

REMOTE_GITHUB verification has been exercised during the current synchronization pass and has already exposed stale contracts that were corrected. Source-changing verification heads are proven by the matching GitHub workflows through generated freshness, Runtime/Gateway typecheck, Runtime regression, authoring contracts, surface/phase measurement, build, provenance, and artifact upload.

A docs-only head must not be described as newly "exact-head verified" when no matching full workflow ran. The lightweight `Head Proof` workflow classifies each `Local` push as documentation-only or source-impacting. Documentation-only heads establish only that executable source did not change in that commit; they inherit no stronger runtime/local/live claim from wording alone. Source-impacting heads continue to require their normal verification workflows.

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
