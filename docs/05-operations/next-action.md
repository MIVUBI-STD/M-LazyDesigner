# LazyDesigner Next Action

Updated: 2026-09-19  
Branch: `Local` only.

This file owns **current implementation continuation only**. Product workflow belongs in `docs/01-product/flow.md`; source/context ownership in `docs/04-system/`; proof interpretation in `docs/05-operations/current-validation.md`.

Canonical Control source: `mcp/gateway/control/`. The former `mcp/gateway/navigator/` source is removed with no alias; `Experimental/blockit-navigator/` is historical documentation only.

## Current State

Current REMOTE_GITHUB architecture is source-hardened across Control, Gateway, Runtime, Plugin, retained Tool capability, validation, context loading, and repository contracts.

Remote handoff baseline (not the current local working-tree verdict):

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

Complete receipt coverage is recorded in `current-validation.md`. Subtree translation remains focused-read because descendant state is summarized only; Cube simplify dry-run/unchanged is state-neutral.

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

## Current Desktop / Distribution Remote Baseline

Current REMOTE_GITHUB Desktop Control Plane work is source-complete for the agreed scope.

Proof chain:

```text
Distribution source baseline
5cdf7342f29d3a76281a4d2fc10e74b018371807
→ MCP Verify PASS
→ Managed Distribution PASS
→ Repository Verify PASS
→ Head Proof PASS

Desktop executable/package baseline
be02af2d2f2316a12f3954c5568c41d0defe222e
→ Desktop Verify PASS
→ Repository Verify PASS
→ Head Proof PASS

Desktop release/version contract
42328480b2c52e5c2e94cf0b65cf015192d27db2
→ Repository Verify PASS
→ Head Proof PASS
→ manual draft-only release workflow added
→ no tag/release published
→ no Desktop self-updater added
```

Remote-complete Desktop capabilities:

```text
Tauri/Svelte/Rust Desktop shell
exact-SHA managed bootstrap bundle
silent NSIS install/bootstrap smoke
Blockbench discovery/version/compatibility projection
explicit Open Blockbench
native Blockbench plugin-file handoff
Gateway supervision without Gateway ownership theft
Runtime/managed health
typed unknown-state fail-closed projection
managed update / repair / recover
Runtime TLS provision + explicit renewal
PowerShell syntax fail-fast
installer checksum + build provenance
draft Desktop release/version contract
```

The Desktop version remains `0.1.0` across package/Cargo/Tauri until an intentional release bump. `Update managed components` is not Desktop self-update. A future self-update mechanism requires a separate signed update-channel decision and is not current residue.

Desktop pre-local preparation now also covers one-click readiness orchestration, bounded self-healing, lightweight connection watching, explicit readiness outcomes, development-only UI state fixtures, multi-profile Blockbench userData fail-closed handling, and a bounded local operation log. Do not add further Desktop product features before local/native acceptance exposes a concrete gap.

## LOCAL_CODE / LIVE_BLOCKBENCH Handoff — ACTIVE

Local acceptance is now activated. Use `docs/05-operations/local-acceptance-runbook.md` as the single execution runbook.

Earlier authoring/local-acceptance baseline:

```text
SHA 7d3abf40238373461085fac179fcbbc07a7da300
Head Proof PASS
MCP Verify PASS
MCP Conformance PASS
Managed Distribution PASS
```

This older baseline is retained only for the existing native authoring evidence below. The current Desktop/Distribution remote baseline is recorded above.

Version 2.1 (`v2.1`, Local source release) uses authorized HTTPS loopback; `verify:full` passes 1,201 tests. Both blockers fixed: native Dirent-based export retains symlink/consent guards; texture harness uses current UUID/name identity. Build `c73fc8…` passes existing-file save/reopen and texture-runtime tests; earlier native/affinity/reload tests passed on `f5c65c…`. Codex config now selects the updated Gateway; a fresh stdio client using that config passes online/catalog/identity checks. Next: reconnect the existing Codex MCP process once. App-restart/interrupted-mutation recovery and visual quality remain unverified. See `current-validation.md`; disposable tabs remain, production assets untouched.

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

Transport ownership and source-proven modern/legacy/conformance contracts are recorded in `current-validation.md`. Preserve SDK auto JSON/SSE selection, incremental streaming, generation fencing, legacy JSON compatibility, and isolated conformance fixtures; production registration/catalog remain unchanged.

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
