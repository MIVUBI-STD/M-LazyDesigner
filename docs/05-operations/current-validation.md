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

`Head Proof` is manual-only. It classifies the selected commit relative to its parent. A docs-only classification is source-equivalence evidence, never a fresh compiler/test/build, native or visual PASS.

### Default-branch registration

At the 2026-10-10 audit, `main` was the default branch with only `mcp-verify.yml` in `.github/workflows/`; `Local` had ten workflows. GitHub requires default-branch registration of a manual workflow. A Local-only YAML file is not proof of manual dispatch availability, and does not authorize editing `main` or repository settings.

## Current source contracts

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

A previous exact source baseline was recorded at:

```text
Local SHA: 7d3abf40238373461085fac179fcbbc07a7da300
Head Proof: PASS
MCP Verify: PASS
MCP Conformance: PASS
Managed Distribution: PASS
```

That evidence is historical. It does not transfer to changed source SHAs.

## Historical local/live evidence

Historical Windows/Blockbench acceptance exists for earlier source/build
identities and remains useful only as prior evidence that the tested workflows
once functioned in a real environment. It does not prove the current `Local`
head.

Current local/live residue includes installed build identity, Runtime rebuild
and reconnect behavior, native Undo/Redo/persistence, app close/open recovery,
visual/reference acceptance, interrupted-mutation recovery and real
cost-to-accepted-result telemetry.

Use `docs/05-operations/local-acceptance-runbook.md` when that residue is
reactivated.

## Proof boundary

Do not strengthen source/static claims into local/live/visual claims without matching evidence from the exact current source SHA.

Do not combine evidence from different SHAs. Do not upgrade source-equivalence,
prepared harnesses, generated artifacts, static fixtures, or historical live
results into proof that the current source actually executed in that
environment.
