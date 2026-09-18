# LazyDesigner Next Action

Updated: 2026-09-19  
Branch: `Local` only.

This file owns **current implementation continuation only**. Product workflow belongs in `docs/01-product/flow.md`; source/context ownership in `docs/04-system/`; proof interpretation in `docs/05-operations/current-validation.md`.

Canonical Control source: `mcp/gateway/control/`. The former Navigator source is retired.

## Current State

Current REMOTE_GITHUB architecture is source-hardened across Control, Gateway, Runtime, Plugin, retained Tool capability, validation, context loading, and repository contracts.

Exact-head baseline remains:

```text
generated freshness PASS
Runtime/Gateway typecheck PASS
Runtime regression PASS
authoring contracts PASS
surface/phase measurement PASS
compatibility build + exact-SHA artifact PASS
modern MCP 2026 negotiation/list/call PASS
legacy 2025 JSON initialize/list/call PASS
```

Core invariants:

- Gateway exposes only `status`, `search_capabilities`, `describe_capability`, and `invoke_capability`.
- Gateway is the persistent AI-client boundary; Runtime/plugin recovery happens beneath it.
- Runtime owns capability registration, authoring surfaces, execution serialization, project/phase affinity, and Runtime result contracts.
- Tool consolidation is routing-only; original executors, validation, native behavior, and domain intelligence remain retained.
- Geometry↔Texturing share AUTHORING; Animation is the separate authoring Runtime surface.
- Control is a thin routing/context layer, not a second Runtime, state database, dependency graph, or workflow engine.
- Normal authoring loads one active specialist and reuses unchanged content-addressed context.
- Technical validation never creates visual PASS or user approval.
- No capability/intelligence reduction is allowed merely for tool-count or context savings.

## Current High-End Continuation

The freshness/invalidation pass is now implemented in source:

```text
semantic freshness receipt            → implemented
Texture vs Material invalidation split → implemented
Animation motion/controller/effects    → implemented
Particle freshness isolation           → implemented
failed mutation freshness              → fail-closed as UNKNOWN
```

`control_delta` now keeps compatibility-level `invalidates.authoring_domains` while also reporting semantic freshness scopes:

```text
GEOMETRY_STRUCTURE
UV_MAPPING
TEXTURE_APPEARANCE
MATERIAL_RENDER
ANIMATION_MOTION
ANIMATION_CONTROLLER
ANIMATION_EFFECTS
PARTICLE_SYSTEM
```

Each receipt classifies scope state as `stale`, `fresh`, or `unknown` with one basis:

```text
NO_CHANGE
PRECISE_EFFECT
CONSERVATIVE_EFFECT
UNKNOWN_OUTCOME
```

This allows unrelated state to remain reusable without blanket rereads while preserving fail-closed behavior after uncertain mutation outcomes.

### Remaining REMOTE_GITHUB refinement

Do not create another state system. Only refine the existing effect receipt when current Runtime results contain narrower evidence than capability-level semantics.

Priority:

```text
inspect existing Texture / Animation / Particle result shapes
→ reuse existing changed/effect fields where trustworthy
→ narrow stale scopes only when source evidence supports it
→ keep conservative fallback for ambiguous receipts
→ add regression coverage only for materially distinct failure modes
```

Do not add new revision databases, dependency graphs, mutation journals, planners, routers, or public Gateway tools.

## Deferred A/B Decision

Keep the current four-tool Gateway unchanged.

The alternative:

```text
4 meta-tools
vs
hybrid direct hot-path + long-tail catalog
```

must be decided by the existing Golden Tasks, not architectural preference.

Golden Tasks remain `UNMEASURED` until matching live runs capture accepted quality plus:

```text
status/search/describe calls
identity inspections
visual capture batches
mutation calls
correction rounds
redundant readbacks
runtime/tool errors
total calls to accepted result
human acceptance
```

Do not introduce a hybrid surface before equivalent Golden Task measurements exist.

## LOCAL_CODE Residue

Local proof should use a clean checkout matching the current `Local` SHA.

Relevant checks:

```text
targeted Control/Gateway tests
Runtime + Gateway typecheck
authoring contract suite when affected
surface/phase measurement when affected
```

Phase transport proof still worth measuring later:

```text
Geometry → Texturing
→ Runtime focus changes
→ AUTHORING tool set remains identical
→ determine whether Gateway catalog can remain warm

AUTHORING → Animation
→ Runtime applies Animation surface
→ Gateway refreshes catalog

Animation → AUTHORING
→ Runtime restores AUTHORING surface
→ Gateway refreshes catalog
```

Only relax Geometry↔Texturing catalog invalidation after this proof. Do not optimize it by assumption.

Transport ownership reduction is lower priority. Do not add a third transport path or expand the temporary legacy compatibility path.

## LIVE_BLOCKBENCH Residue

Prove the native boundaries that source/static work cannot establish:

```text
persistent Gateway survives Runtime/plugin reload
Runtime rebuild recovery
Blockbench close → open recovery
AUTHORING ↔ Animation catalog handoff
Geometry ↔ Texturing focus change preserves the shared surface
project affinity / rebind behavior
interrupted mutation → inspect-before-retry recovery
Geometry / Texturing / Animation / Particle execution
Undo / playback / persistence / export behavior
representative accepted-result quality + efficiency
```

Measure **Cost to Accepted Result** without lowering accepted quality.

## Stop Rules

- no second Control/router/profile/state system;
- no dependency graph or persistent revision database without demonstrated need;
- no direct/hybrid Gateway surface before Golden Task evidence;
- no capability/intelligence reduction for context savings;
- no mutation auto-retry after unknown outcome;
- no hand-edited generated API/prompt output;
- no all-profile/all-stage loading as reassurance;
- no bulk compatibility-identifier migration;
- no local/live PASS claims without matching proof.

## Proof Boundary

REMOTE_GITHUB proves only source/static/CI-verifiable contracts on the exact SHA. Installed Runtime behavior, native Blockbench behavior, visual quality, and measured end-to-end usage remain higher-context proof.
