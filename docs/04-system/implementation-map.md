# LazyDesigner Implementation Map

Updated: 2026-09-12

This file maps **current source ownership only**. Product workflow belongs in `docs/01-product/flow.md`; AI context loading in `docs/04-system/ai-context-loading.md`; continuation/proof in `docs/05-operations/`.

## Architecture

```text
ChatGPT Reference Preparation
→ Reference Package
→ LazyDesigner Control
→ Codex
→ Gateway
→ Runtime
→ Plugin
→ Blockbench native APIs
```

There is one authoring system. Supporting docs/Skills/QA may project or interpret state; they do not create alternate Runtime, routing, or authored-state systems.

## Canonical Skills

### Reference Preparation

```text
.agents/skills/lazydesigner-reference-preparation/SKILL.md
.agents/skills/lazydesigner-prompt-compiler/SKILL.md
.agents/skills/lazydesigner-particle-reference-authoring/SKILL.md
```

### Asset Authoring

```text
Geometry / hierarchy / pivots / UV → lazydesigner-modelling
Texture / Painter / PBR            → lazydesigner-texturing
Animation / effects/controllers    → lazydesigner-animation
routing/context selection          → LazyDesigner Control
```

Semantic stage and Runtime surface are intentionally separate concepts:

```text
semantic stage  GEOMETRY  → Runtime surface AUTHORING
semantic stage  TEXTURING → Runtime surface AUTHORING
semantic stage  ANIMATION → Runtime surface ANIMATION
```

`mcp/lib/authoringPhase.ts` is the single mapping owner. Geometry↔Texturing is a semantic-owner/focus change inside the same AUTHORING surface; only AUTHORING↔Animation is a true Runtime surface boundary.

### Product Development

```text
MCP public/protocol contracts       → lazydesigner-mcp-development
Blockbench/runtime/plugin mechanics → lazydesigner-blockbench-development
complex cross-owner design          → lazydesigner-development-brief
```

Clear bounded development changes go directly to the exact source owner.

## Control

Canonical source: `mcp/gateway/control/`.

```text
referencePackage.ts   compact Reference Package projection
workspace.ts          Active Workspace projection
contextProjection.ts  GEOMETRY/TEXTURE/ANIMATION stage projection
packet.ts             task packet/readiness/context delivery
registry.ts           content-addressed context handles + source ownership
delta.ts              post-operation invalidation/control delta
developmentIntent.ts  bounded SYSTEM_DEVELOPMENT routing
snapshot.ts           Gateway/Runtime orientation
capabilities.ts       capability decoration
index.ts              canonical Control exports
```

Control owns selection, projection and lifecycle orientation. It does not own Tool schemas, Runtime execution, live authored state, Skill prose or build execution.

For a capability without an exact `SOURCE_BY_CAPABILITY` mapping, Control falls back to `mcp/server/runtime/registration.ts` as the Runtime **surface owner** plus the matching specialist. It must not route development ownership to the legacy `mcp/server/tools.ts` compatibility facade or guess an implementation file.

## Gateway

Public AI-client surface is fixed:

```text
status
search_capabilities
describe_capability
invoke_capability
```

Owners:

```text
mcp/gateway/index.ts              stable public boundary + Control wiring
mcp/gateway/backend.ts            Runtime adapter/catalog/queue/project affinity
mcp/gateway/connectionManager.ts  demand-driven Runtime connection lifecycle
mcp/gateway/runtimeSession.ts     Runtime session/generation counters
mcp/gateway/reconnectPolicy.ts    bounded reconnect backoff
mcp/gateway/contract.ts           capability/search/result public projections
mcp/gateway/capabilityEffects.ts  declarative effect application
mcp/gateway/controlReceipt.ts     project/phase receipt derivation
mcp/gateway/recovery.ts           structured recovery semantics
mcp/gateway/statusProjection.ts   normalized public status
mcp/gateway/localCapabilities.ts  bounded read-only local provider registry
mcp/gateway/projectAffinity.ts    project/phase affinity headers/contracts
```

Gateway owns client stability and Runtime recovery. It does not own Blockbench mutation implementations or authoring workflow reasoning.

## Runtime

Runtime is the capability registry/validator/executor boundary.

```text
mcp/server/net.ts
→ stateless HTTP/MCP transport
→ request serialization / runtime-generation safety
→ project + phase affinity enforcement

mcp/server/runtime/registration.ts
→ registration profile
→ family ownership
→ canonical phase surface descriptor/cache

mcp/server/runtime/consolidatedRoutes.ts
→ family + discriminator + branch→executor descriptors

mcp/server/runtime/consolidatedTools.ts
→ routing-only public wrappers
→ retained original executors remain canonical implementation

mcp/server/runtime/phaseControl.ts
→ semantic focus change + AUTHORING↔Animation Runtime handoff receipt

mcp/server/runtime/bootstrap.ts
→ exactly-once Runtime intelligence wiring

mcp/server/tools/**
→ authored Geometry / Texture / Animation / Particle / inspection / export implementations
```

Representative focused owners:

```text
manage_locator / manage_null_object
→ mcp/server/tools/locators.ts

manage_material_instances
→ material instances owner under mcp/server/tools/**

manage_animation_controller
→ animation controller owner under mcp/server/tools/**
```

`mcp/server/tools.ts` remains a thin compatibility facade/bootstrap boundary; it is not the owner of Runtime state anymore.

## Shared Runtime Libraries

```text
mcp/lib/capabilityMetadata.ts  canonical tier/search aliases/declarative effects
mcp/lib/authoringPhase.ts      semantic stage classification + AUTHORING/ANIMATION surface mapping
mcp/lib/authoringReadiness.ts  canonical Animation handoff readiness
mcp/lib/validationVerdict.ts   conservative Validator gate projection
mcp/lib/factories.ts           Tool/Resource/Prompt registration + canonical validation/result compaction
mcp/lib/runtimeLifecycle.ts    runtime generation/lifecycle safety helpers
```

Domain intelligence helpers under `mcp/lib/**` remain supporting implementation for the owning Tool family; they are not alternate public capabilities.

## Plugin / Blockbench Integration

```text
mcp/index.ts
→ plugin orchestration only

mcp/plugin/runtimeHost.ts
→ native network permission
→ Runtime listener bind/start/close/config ownership

mcp/plugin/blockbenchIntegration.ts
→ i18n/settings/UI/prompts/reference-resource integration
→ corresponding teardown

mcp/plugin/reload.ts
→ single native LazyDesigner plugin reload owner
→ shared by human recovery UI and development sync

mcp/plugin/devSync.ts
→ development file watcher/build identity only
→ delegates reload to the shared plugin reload owner
```

Native network/listener/UI/settings/reload ownership must not migrate back into `mcp/index.ts`. Human recovery and development sync must not create separate reload paths.

## Tool Capability Rule

Consolidation means:

```text
public capability
→ declarative route
→ original retained executor
→ original validation/native intelligence
```

It does **not** mean replacing several implementations with a weaker generic implementation. Capability/intelligence reduction is not an efficiency strategy.

## Validation / QA / Gates

```text
quality intelligence
→ bounded diagnostic evidence only
→ `server/tools/quality-intelligence.ts`: hygiene / rig graph / color / optimization / root-motion / animation-quality diagnostics
→ `server/tools/quality-evidence-runtime.ts`: deterministic surface-integrity / physical-UV / motion-craft evidence
→ both augment existing canonical read tools through `server/runtime/bootstrap.ts`
→ neither creates a second public capability catalog, approval system, or quality score

Blockbench Validator
→ BLOCKED | REVIEW_REQUIRED | VALIDATOR_CLEAR
→ never visual/user approval

Control readiness
→ workspace/reference lifecycle orientation
→ never handoff authorization by itself

mcp/lib/authoringReadiness.ts
→ USER_APPROVED | AUTONOMOUS_VERIFIED
→ actual AUTHORING↔Animation readiness contract
```

Visual/reference PASS remains evidence-based and separate from technical success.

## Context / Knowledge

Canonical context owners:

```text
docs/04-system/ai-context-loading.md
docs/04-system/authoring-stage-context.md
docs/04-system/control/context-projection.md
docs/04-system/skill-taxonomy.md
```

Normal asset work loads one active specialist. Geometry may additionally load exactly one selected primary modelling profile. Shared Stage Context is a reusable semantic contract, not a Skill/router/manager.

## Reference Package

One canonical machine-readable package:

```text
REFERENCE.json
schema = lazydesigner-reference-v1
asset.kind = MODEL | PARTICLE
```

Reference Preparation owns reference facts; Control projects the compact active-stage subset. The package never becomes a live Runtime-state database.

## Particle Ownership

Particle is Animation-specialist asset support, not a fourth authoring phase.

```text
inspect_particle / manage_particle
→ mcp/server/tools/particle.ts

particle bitmap authoring
→ existing Texturing capabilities

particle timing/locator binding
→ manage_animation_effects
```

No parallel Particle paint/save pipeline is allowed.

## Animation Controller Ownership

```text
inspect_animation
→ read-only Animation/Controller inspection

manage_animation_controller
→ one controller mutation surface

animation-controller-native-intelligence.ts
animation-runtime-resource-intelligence.ts
→ bounded intelligence extensions wired by server/runtime/bootstrap.ts
```

These extensions do not create additional controller tools/profiles.

## Workspace / Persistence

```text
workspace/active/<asset>/README.md
→ durable human-readable current asset continuation
```

Workspace state is not Runtime connection/session state and is not duplicated inside Control.

## Build / Verification / Distribution

```text
mcp/build/**         generated docs/prompt/build tooling
mcp/scripts/**       verification/measurement/deploy harnesses
mcp/distribution/**  managed distribution
mcp/prompts/**       canonical Runtime prompt source + manifest
mcp/tests/**         contract/integration regressions
```

Completed one-shot retirement/finalization workflows and migration scripts do not remain in the active repository surface. Generated API/prompt outputs are generator-owned and must not be hand-edited.

## Compatibility Boundary

Compatibility-bound BlockIT identifiers remain intentionally stable until separately dependency-mapped:

```text
package/server/plugin IDs
bundle filename blockit_mcp.js
BBPlugin id blockit_mcp
BLOCKIT_* environment variables
x-blockit-* affinity headers
persisted setting IDs
build/provenance identities coupled to them
```

Do not interpret these as a second product architecture and do not bulk-rename them.

## Proof Boundary

Source ownership and contracts can be established remotely. Installed Runtime freshness, persistent-Gateway recovery, native Blockbench mutation behavior, playback/persistence, visual fidelity and measured whole-task efficiency require matching local/live evidence.
