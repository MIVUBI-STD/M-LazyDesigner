# LazyDesigner Next Action

Updated: 2026-09-19  
Branch: `Local` only.

This file owns **current implementation continuation only**. Product workflow belongs in `docs/01-product/flow.md`; source/context ownership in `docs/04-system/`; proof interpretation in `docs/05-operations/current-validation.md`.

Canonical Control source: `mcp/gateway/control/`. The former `mcp/gateway/navigator/` source is removed with no alias; `Experimental/blockit-navigator/` is historical documentation only.

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

No hand-editing generated docs/output. Generated prompt/API artifacts remain generator-owned.

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

Control freshness is source-implemented with semantic scopes for Geometry, UV, Texture, Material/Render, Animation motion/controller/effects, and Particle state. Receipts report `NO_CHANGE`, precise/conservative effects, or unknown outcomes; failed/ambiguous operations remain fail-closed.

Current receipt-economy rules:

```text
NO_CHANGE / read-only / compile-only / persistence-only
→ receipt_only

complete final affected-state receipt
→ receipt_only

partial mutation receipt
→ focused_read

Cube / animation-motion mutation
→ visual remains required
```

Complete mutation receipts now cover Animation Effects, affected Animation Controller state subgraphs, PBR Material create/configure/assign, Material Instance face changes, Locator/Null Object state, bounded Group add/modify, and reparent final parent. Subtree translation remains focused-read because descendant final state is summarized only. Cube simplify dry-run/unchanged is state-neutral.

Incomplete/legacy shapes stay conservative. Visual verification is now change-scoped where receipts prove targets: Cube mutations emit exact Cube UUIDs plus rendered target bounds consumable by existing `capture_model_views(framing=explicit)`; keyframe mutations emit animation/bone/time range plus bounded review sampling; paint transactions emit texture/rect/revision and attach the exact post-mutation affected-region PNG, avoiding a full-atlas reread for local corrections. Visual class is unchanged; only evidence scope is narrowed. Do not add dependency databases, planners, extra routers, or public Gateway tools.

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

Modern Streamable HTTP uses SDK `responseMode="auto"`: ordinary request/response stays JSON and related progress/log traffic may upgrade to SSE. The Node bridge pipes SSE incrementally and closes the request-owned handler only after stream completion/cancel. Finite MCP requests still force-close the socket; `subscriptions/listen` alone may remain long-lived. Legacy 2025 remains the bounded JSON-only compatibility shim. Official conformance runs the same LazyDesigner net/SDK transport against an isolated fixture surface. Core content/resource/prompt/completion fixtures plus scored progress and SEP-2322 input-required/requestState flows are owned only by that harness; production registration remains unchanged. Production Runtime catalog remains unchanged.

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
- no claim of Bun/typecheck/CI/local/live PASS until that proof actually ran.

## Proof Boundary

REMOTE_GITHUB proves only source/static/CI-verifiable contracts on the exact SHA. Installed Runtime behavior, native Blockbench behavior, visual quality, and measured end-to-end usage remain higher-context proof.
