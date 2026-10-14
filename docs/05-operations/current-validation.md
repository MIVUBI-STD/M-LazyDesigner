# LazyDesigner Current Validation

This file owns **current proof interpretation only**. Workflow: `docs/01-product/flow.md`; source: `docs/04-system/implementation-map.md`; continuation: `next-action.md`; local/live procedure: `local-acceptance-runbook.md`.

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

Installed source fcf6617982d94a4e5ddb8162956a00f0c0d99d55: exact-SHA verify:full, Desktop verify:source (52 Rust tests), build/install PASS. Harness 6afc89893f640a093b24f946289e96f6e65bda70: exact-SHA bun run verify:full PASS; three UV-diagnostic verifier calls fixed, shipped code unchanged. Desktop 0.1.0, Blockbench 5.2.0; Runtime de0efeb7. Evidence: mcp/.cache/local-acceptance/fcf66179/acceptance-summary.json; data d824b35c.

All 12 native steps PASS: project affinity, Geometry, Texturing, Animation, Particle, persistence prepare/reopen, surface-gap, template, UV-density prepare/reopen, texture-runtime. Targeting/history/playback, thin UVs, variant isolation, stale revisions and reopen equality proven. Texturing first failure retained; clean repeat PASS after harness correction. Technical proof is not visual approval.

Packaged Control contexts load; profiles/references included. Native foreign snapshot isolation PASS; user completed fresh-profile permissions. Automatic app/plugin updates OFF on primary disposable profile. Normal close/Desktop Open PASS, version unchanged, automatic Desktop status updates.

Gateway35728 survives close/open, AUTHORING↔Animation, reload and disable/enable. Project/counts/two PNG hashes preserved; expired lease clears active state, keeps recent navigation. Separate detach/attach PASS: same Runtime/project, Desktop Ready → AI connected. Recovery JSONs indexed by acceptance-summary.json; fixture checkpoints preserved, original LIFT unchanged.

Supplemental native PASS: four-tool discovery/schema guards, unknown capability/invalid operation/missing Cube/search-limit rejection without geometry change; Bedrock JSON (two Cubes), PNG 32×32, overwrite rejection with unchanged file hashes. Proof: gateway-negative-contracts.json, native-export-delivery.json. Native export updates the in-memory project name/export path; original .bbmodel preserved.

Built Desktop frontend with isolated MOCKED IPC PASS: repeated probe rejection, failed full refresh from healthy/stale state, action lockout until full refresh succeeds, Support availability, six focus-result messages. Proof: desktop-ui-*.json; native Windows denial/IPC failure NOT_EXECUTED. No production seam added.

User has no reference: Golden F deferred; other functional checks continued. Six efficiency pairs NOT_EXECUTED pending their quality/input gates; visual acceptance UNVERIFIED, tokens null. LIFT excluded from benchmarks. verify:astra-usage-ready proves preparation only. Prior stale lease/Desktop disappearance unexplained; latest bounded recovery passed.

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

Read current `Local` SHA/checks before claiming current-head PASS; only completed matching exact-SHA proof qualifies.

## Exact-SHA source acceptance

All normal verification workflows are manual-only. A `Local` push does not create executable acceptance evidence. `MCP Verify` checks the selected exact `github.sha`, executes `bun run verify:full`, then produces a read-only identified build artifact on a successful run. It does not run live Blockbench acceptance.

Narrow claims can use the appropriate targeted script. The affected-execution planner remains available locally/on demand; the old push-specific affected/full CI decision path is retired. A successful `verify:repository` plus `verify:mcp` on one SHA is composite source evidence, not an executed `verify:full`.

### Optional Head Proof

`Head Proof` is manual-only. It classifies the selected commit relative to its parent. A docs-only head classification means only that executable source did not change relative to its parent. Head Proof is source-equivalence evidence, never a fresh compiler/test/build, native or visual PASS. Source-impacting heads continue to require exact-SHA executable verification; docs-only head evidence never substitutes for that proof.

Compatibility requires `liveValidatedBuilds` matching editor version and bundle identity; none is recorded at this source HEAD. Historical native tests do not validate newer builds.
The existing Control path distinguishes missing Reference Package as
`NEEDS_ORIENTATION` (not `READY`) without denying Runtime queries.
Benchmark-only tracing includes known-precondition rejects; it is not
evidence of reduced Codex tokens. Source/static changes here are not
matching-Bun or live-Blockbench PASS.

## Current source contracts 
Local source declares machine-local Runtime authorization on native HTTPS and known-missing prerequisite enforcement for the four-tool Gateway path. Matching source and bounded native transport/execution proof are recorded above; this does not certify every capability/input.



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

Gateway owns client stability, reconnect, project/phase affinity, catalog freshness, serialized dispatch and recovery. Runtime executes in Blockbench.

Unknown mutation outcome is never automatically replayed.

### Protocol / compatibility

Current source retains modern MCP SDK v2 handling plus the bounded legacy JSON
compatibility path. Compatibility-bound `blockit_*`, `BLOCKIT_*` and related
persisted identifiers remain intentional until a separately dependency-mapped
migration.

Do not infer current-head protocol PASS from historical evidence.

## Last reusable proven source baseline

The Windows checkpoint is the reusable source baseline; older evidence does not transfer. Remaining proof: native IPC/focus fault cases, visual acceptance and real cost-to-accepted-result telemetry. Follow the existing local acceptance runbook.

## Proof boundary

Do not strengthen source/static claims into local/live/visual claims without matching evidence from the exact current source SHA.

Source-equivalence, prepared harnesses, static fixtures and historical results do not prove current-source execution. Do not combine proof from different SHAs.
