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

Installed source 4cd2fd06895a7a99c3d382c97ba27c5f856cf23f: exact-SHA verify:full, Desktop verify:source (52 Rust tests), canonical package/Desktop build and managed install PASS. Desktop 0.1.0, Blockbench 5.2.0, Runtime b436485f. Evidence: mcp/.cache/local-acceptance/4cd2fd06/; same disposable data d824b35c. Package smoke uses an isolated endpoint; a live default Runtime correctly stages install instead of overwriting it.

Prior executable fcf66179 and harness 6afc8989 have exact-SHA full gates and all 12 main native steps PASS, indexed by fcf66179/acceptance-summary.json. This is historical bounded coverage, not twelve fresh passes on 4cd2fd06. Original LIFT and saved fixture files remain preserved. Technical proof is not visual approval.

Current Desktop/native Open and Continue PASS with the new plugin. Automatic app/plugin updates remain OFF. Native foreign-title focus PASS: Notepad Blockbench.txt remained open while the actual Blockbench window became foreground; no title-based target selection. Proof: foreign-title-focus.json.

Current native PASS: minimized 128s (Runtime age <3.1s, navigation <5.2s), persistence prepare/native reopen and two-Gateway project affinity. Proof: minimized-heartbeat.json and verify-*-live.log under 4cd2fd06.

Prior recovery PASS on fcf66179: foreign-profile isolation, close/open, AUTHORING↔Animation, reload, disable/enable and Gateway detach/attach. Two issues subsequently reproduced and corrected: pending read-only status IPC retained healthy actions indefinitely; renderer timers let Runtime/navigation health expire while backgrounded. Current source uses bounded status waits and safe native timers with teardown coverage.

Prior supplemental native PASS on fcf66179: discovery/input guards, Bedrock JSON/PNG delivery and overwrite protection with unchanged file hashes. Export updates in-memory project metadata through native lifecycle; it does not rewrite the saved .bbmodel.

Built frontend MOCKED IPC PASS: hanging probes and full refresh expire, actions lock, successful full refresh recovers. Previous rejection/Support/six-focus-result checks retained. Native IPC failure injection and Windows foreground denial remain NOT_EXECUTED; no production fault seam added.

No reference: Golden F deferred by user; independent checks continued. Six efficiency pairs NOT_EXECUTED, visual acceptance UNVERIFIED, tokens null; LIFT excluded. verify:astra-usage-ready proves preparation only. Background timer expiry now reproduced; earlier Desktop disappearance remains unexplained.

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
