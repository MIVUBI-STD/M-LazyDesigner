# LazyDesigner Current Validation

This file owns **current proof interpretation only**. Product workflow belongs in
`docs/01-product/flow.md`; source ownership in
`docs/04-system/implementation-map.md`; continuation in
`docs/05-operations/next-action.md`; local/live procedure in
`docs/05-operations/local-acceptance-runbook.md`.

## Current authority

Branch authority: `Local`.

Current source architecture:

```text
ChatGPT Reference Preparation
→ Reference Package
→ LazyDesigner Control
→ Codex
→ persistent Gateway
→ Runtime
→ Plugin
→ Blockbench
```

Geometry and Texturing share the AUTHORING Runtime surface. Animation is the
separate ANIMATION surface. Canonical Control source is
`mcp/gateway/control/`. The retired Navigator source remains removed.

## Windows checkpoint — 2026-10-14

Tested executable: Local `77e52fc5f22b4324ffaa4877f3dd2564615d46b9`. Exact-SHA `bun run verify:full`, Desktop `verify:source` (52 Rust tests), build/install PASS. Bun 1.3.14 baseline, Node 24.14.1, Rust 1.98.1. Evidence: `mcp/.cache/local-acceptance/77e52fc5/`; data `d824b35c`, same account. Desktop 0.1.0, Blockbench 5.2.0; Runtime bundle hash unchanged.

Earlier ae096f7c native proof, unchanged owners: one panel, no bounded console flashes; lease beyond TTL (34/48s); Desktop restart preserves Runtime/model; Plugin file reveals folder.

Prior flow PASS: search/keyboard at both sizes, A↔B, Smart Open preserving tabs/edits, Modified/save, Save As, close/recent, missing/restored Continue. Disposable copies only.

Prior integrity PASS: modified Open refused; no overwrite/forced close; online repair refused; offline missing repair restores hash. Fault copies outside plugins.

Prior focus PASS: background/minimized restore, one tab; ambiguous fallback; missing-after-render refuses model change. Evidence: ae096f7c/focus-missing-model.json.

Pin/Continue PASS after runner stop: older pin first in Recent, newer pin-newer reopened alone. Normal close deferred by updater. Evidence: ae096f7c/integrity-pin-continue.json. Brief stale lease unresolved; 36s minimized reproduction stayed fresh.

New native PASS: two userData profiles refuse setup, neither plugin changed (ae096f7c/profile-isolation/setup-refusal.json). Malformed installed.json originally offered setup; fixed build shows Action required, launch disabled (Tab skips to Support), Refresh/diagnostics available; bytes restored. Evidence: 77e52fc5/metadata-fault.json; logs `mcp/.cache/localtest-observation-complete-*.log`.

Remaining: IPC probe failure, foreign snapshot producer, endpoint/focus matrix, normal close, Gateway/authoring/persistence/visual. No native sign-off, validated compatibility or token savings. Docs-only recording preserves executable SHA.

## Current proof matrix

| Surface | Canonical proof | Status authority |
| --- | --- | --- |
| Repository policy / ownership | `Repository Verify` / `verify:repository` | manual exact-SHA execution when available |
| Executable MCP source | `MCP Verify` | manual exact-SHA execution when available |
| Typecheck / Runtime regressions | `MCP Verify` / `verify:full` | manual exact-SHA execution when available |
| Build + provenance artifact | full `MCP Verify` | exact-SHA workflow + artifact provenance |
| Local executable checkout | `LOCAL_CODE` runbook | matching local execution evidence |
| Installed/native Blockbench behavior | `LIVE_BLOCKBENCH` runbook | matching live execution evidence |
| Visual/reference acceptance | live bounded review | matching live review evidence |

This document does **not** mirror volatile workflow status. Read the current
`Local` SHA and its GitHub Actions/check results directly before making a PASS,
FAIL, MISSING, or historical-evidence claim. Only completed proof attached to
that same exact source SHA is current-head evidence.

## Exact-SHA source acceptance

All normal verification workflows are manual-only. A `Local` push does not create executable acceptance evidence. `MCP Verify` checks the selected exact `github.sha`, executes `bun run verify:full`, then produces a read-only identified build artifact on a successful run. It does not run live Blockbench acceptance.

Narrow claims can use the appropriate targeted script. The affected-execution planner remains available locally/on demand; the old push-specific affected/full CI decision path is retired. A successful `verify:repository` plus `verify:mcp` on one SHA is composite source evidence, not an executed `verify:full`.

### Optional Head Proof

`Head Proof` is manual-only. It classifies the selected commit relative to its parent. A docs-only head classification means only that executable source did not change relative to its parent. Head Proof is source-equivalence evidence, never a fresh compiler/test/build, native or visual PASS. Source-impacting heads continue to require exact-SHA executable verification; docs-only head evidence never substitutes for that proof.

Current compatibility authority: the historical Blockbench 5.2.0 native
test does not confer `validated` on newer LazyDesigner builds. Only
`liveValidatedBuilds` entries matching the exact editor version and
current bundle identity can do so; none is recorded at this source HEAD.
The existing Control path distinguishes missing Reference Package as
`NEEDS_ORIENTATION` (not `READY`) without denying Runtime queries.
Benchmark-only tracing includes known-precondition rejects; it is not
evidence of reduced Codex tokens. Source/static changes here are not
matching-Bun or live-Blockbench PASS.

## Current source contracts 
Local source now declares an additional machine-local Runtime authorization credential on the native HTTPS listener and known-missing prerequisite enforcement for the normal four-tool Gateway invocation path. This has source regression proof at the Windows checkpoint above; native transport and Blockbench execution remain unproven.



### Control

Current source implements:

```text
ASSET_AUTHORING / SYSTEM_DEVELOPMENT intake
bounded context selection
content-addressed context handles
bounded development projection
semantic freshness scopes
fail-closed unknown mutation outcomes
control_delta continuation
receipt-bounded verification
```

Freshness scopes are:

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

Current source guards canonical capability ownership and mutation-policy
coverage against silent drift. Direct authored mutations cannot default to
`NO_CHANGE`. Receipt-proven state-neutral actions may preserve authored
freshness. Incomplete or uncertain mutation receipts remain conservative.

Stable mutation hot paths now share typed receipt contracts between Runtime
producers and Control for Material, Material Instances, Animation Effects,
Animation Controller, Particle writes, Render Profile writes, Locator/Null,
Group mutations, Remove Element, Bone Rigging and TextureGroup creation.
Producer/consumer receipt drift therefore fails at the shared schema boundary
instead of relying on duplicate handwritten shape recognition.

UV layout changes invalidate UV mapping and Texture appearance while preserving
unrelated evidence. Project creation remains conservative across all authored evidence. Undo/Redo
uses ephemeral semantic history metadata keyed by the native Undo entry object.
When every traversed entry has known metadata, Control invalidates only the
recorded freshness scopes and authoring domains; metadata-only/checkpoint
history can preserve authored freshness. Missing metadata fails closed to
all-scope conservative invalidation. No semantic history database is persisted.

### Development Intelligence

Repository-development intent routing, capability source ownership, changed-path impact and affected-execution planning are canonically owned by `mcp/gateway/development/`. Control may project bounded development results into status, but it is not the source-owner registry.

### Receipt / verification boundary

Complete final-state receipts may replace reassurance reads only when their
shared semantics are sufficient for deterministic continuation. Incomplete
receipts retain focused-read or visual verification.

Actual visual Geometry/Texture/Animation mutation remains visual even when its
structural receipt is complete. Semantic completeness is not visual/reference
acceptance.

### Gateway / Runtime

The public AI-client Gateway surface remains exactly:

```text
status
search_capabilities
describe_capability
invoke_capability
```

The persistent Gateway owns client stability, Runtime reconnect, project/phase
affinity, catalog invalidation, serialized mutation dispatch and structured
recovery. Runtime owns Blockbench execution.

Unknown mutation outcome is never automatically replayed.

### Protocol / compatibility

Current source retains modern MCP SDK v2 handling plus the bounded legacy JSON
compatibility path. Compatibility-bound `blockit_*`, `BLOCKIT_*` and related
persisted identifiers remain intentional until a separately dependency-mapped
migration.

Do not infer current-head protocol PASS from historical evidence.

## Last reusable proven source baseline

The Windows checkpoint above is the reusable source baseline; older evidence does not transfer. Remaining native proof includes Runtime reconnect, Undo/Redo/persistence, playback, close/open recovery, visual acceptance and real cost-to-accepted-result telemetry. Follow the existing local acceptance runbook.

## Proof boundary

Do not strengthen source/static claims into local/live/visual claims without matching evidence from the exact current source SHA.

Do not combine evidence from different SHAs. Do not upgrade source-equivalence,
prepared harnesses, generated artifacts, static fixtures, or historical live
results into proof that the current source actually executed in that
environment.
