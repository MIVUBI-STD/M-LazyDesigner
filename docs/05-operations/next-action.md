# LazyDesigner Next Action

Updated: 2026-09-20  
Branch: `Local` only.

This file owns **current implementation continuation only**. Product workflow belongs in `docs/01-product/`; system ownership in `docs/04-system/`; proof history and interpretation in `docs/05-operations/current-validation.md`.

Canonical Control source: `mcp/gateway/control/`. The former `mcp/gateway/navigator/` source is removed with no alias.

## Current State

REMOTE_GITHUB architecture remains source-owned across Control, Gateway, Runtime, Plugin, Managed Distribution, Desktop, validation, and repository contracts.

Reusable verified authoring baseline:

```text
generated freshness PASS
Runtime/Gateway typecheck PASS
Runtime regression PASS
authoring contracts PASS
surface/phase measurement PASS
modern MCP 2026 negotiation/list/call PASS
legacy 2025 JSON initialize/list/call PASS
```

These are historical reusable baselines only. A changed exact SHA still requires its applicable verifier before the new source is called verified.

No hand-editing generated docs/output; generated prompt/API artifacts remain generator-owned.

Core invariants:

- Gateway exposes only `status`, `search_capabilities`, `describe_capability`, and `invoke_capability`.
- Gateway is the persistent AI-client boundary; Runtime/plugin recovery stays beneath it.
- Runtime owns execution, authoring surfaces, affinity, and native Blockbench interaction.
- Control remains a thin routing/context owner, not a second Runtime or state engine.
- Geometry↔Texturing share AUTHORING; Animation is the separate Runtime surface.
- Technical validation never creates visual PASS or user approval.
- Capability/intelligence may not be reduced merely for context or tool-count savings.

## Current Authoring Continuation

Receipt/freshness semantics are source-implemented across Geometry, UV, Texture, Material/Render, Animation, and Particle. Failed or ambiguous mutations remain fail-closed.

Evidence economy remains:

```text
NO_CHANGE / read-only / complete final receipt
→ receipt_only

partial mutation receipt
→ focused_read

Cube / animation-motion mutation
→ visual evidence still required
```

Change-scoped visual evidence is retained where the receipt proves exact targets. The deferred four-tool Gateway vs hybrid hot-path decision remains **UNMEASURED** until equivalent Golden Tasks measure accepted quality plus calls, corrections, redundant readbacks, errors, handoffs, and total cost to accepted result. Do not introduce the hybrid surface by preference.

## Desktop Control Plane

Desktop remains the machine/workstation controller only:

```text
Desktop intent
→ Rust readiness/product-state owner
→ canonical Managed Distribution when mutation is required
→ Blockbench + Runtime
→ MCP client-owned Gateway
```

Current source includes:

- one canonical `ensure_ready` launch/readiness path;
- safe missing-plugin repair and modified-plugin fail-closed handling;
- lightweight Blockbench/Runtime/Gateway/plugin watcher without managed-CLI heartbeat spawning;
- explicit READY / RUNTIME_READY / APPROVAL_REQUIRED / NEEDS_ATTENTION outcomes;
- bounded operation logging and diagnostics;
- Blockbench compatibility, custom `--userData`, TLS, rollback, repair, recover, update and installer trust boundaries;
- development-only deterministic UI fixtures.

Desktop must not start, restart, terminate, or own the stdio Gateway.

## Projects & Models — ACTIVE DEVELOPMENT

The agreed navigation model is:

```text
Project
→ one or more saved .bbmodel Models
```

Example:

```text
Furniture
→ Modern Chair.bbmodel
→ Sofa.bbmodel
→ Table.bbmodel
```

Current REMOTE_GITHUB source implements:

- Active Project + Active Model from Blockbench-owned state;
- recent saved `.bbmodel` projection;
- deterministic shallow grouping into Projects;
- project `See details` model list;
- Open Folder;
- Open Model through `ensure_ready`;
- Reveal model file;
- Copy path only on explicit action;
- missing-model state without drive scanning;
- path-free normal Overview UI;
- bounded local navigation snapshot rather than a second project database;
- generation-aware plugin navigation token plus bounded session lease;
- profile-bound snapshot identity derived from the managed Blockbench userData profile;
- stale Plugin sessions clear active/open/dirty without deleting Recent history;
- bounded open-model inventory plus active/dirty state from Blockbench;
- already-open models use native existing-tab selection and surface as `Switch`;
- `Modified` is shown only when unsaved changes affect a user decision.

Project grouping order:

```text
nearest bounded .lazydesigner-project.json marker
→ parent of Models/Model folder
→ direct .bbmodel parent folder
```

Normal UI shows project/model names and relevant actions only. Paths, UUIDs, revision metadata, and filesystem details remain hidden unless an explicit detail action needs them.

Quick Command / Command Palette and thumbnails are explicitly out of scope.

Already implemented: Pin, contextual search, Continue, and existing-only working-folder shortcuts.

Add no further navigation UI before lifecycle/native proof. `Add existing model` stays deferred unless native use proves a need. No file browser, drive indexer, tags/kanban, thumbnails, cloud project DB, or arbitrary nested hierarchy.

## Current Verification Boundary

Pre-profile lifecycle baseline `38c254bbe5c70720b6502d4e10e3d46526a113c5`: Repository Verify, Head Proof, Desktop source, Windows installer, and installer/bootstrap smoke PASS.

Profile binding changes after that baseline require their own exact-SHA verification. Fix the first failing owner only; do not redesign working architecture to satisfy stale assertions.

## LOCAL_CODE / LIVE_BLOCKBENCH Handoff — ACTIVE

Use `docs/05-operations/local-acceptance-runbook.md` as the single execution runbook.

LOCAL_CODE residue is limited to environment/toolchain proof not already accepted for the exact source SHA.

LIVE_BLOCKBENCH must prove:

```text
Projects & Models:
active project/model follows Blockbench tab changes
saved recent models survive Desktop restart
one Project correctly groups multiple .bbmodel files
Open Folder targets the correct Project
Open Model preserves Blockbench unsaved-work behavior
Reveal Model selects the correct file
missing model stays unavailable without filesystem crawling
path stays absent from normal UI

Lifecycle:
persistent Gateway survives Runtime/plugin reload
Blockbench close → open recovery
Runtime/plugin rebuild recovery
AUTHORING ↔ Animation catalog handoff
Geometry ↔ Texturing shared-surface behavior
project affinity / rebind behavior
interrupted mutation → inspect-before-retry recovery

Authoring:
Geometry / Texturing / Animation / Particle execution
Undo / playback / persistence / export behavior
representative accepted-result quality + efficiency
```

Measure **Cost to Accepted Result** only after accepted quality is maintained.

## Stop Rules

- no second Control/router/profile/state system;
- no duplicate Desktop project database when Blockbench/local project projection is sufficient;
- no dependency graph or persistent revision database without demonstrated need;
- no direct/hybrid Gateway surface before Golden Task evidence;
- no capability/intelligence reduction for context savings;
- no mutation auto-retry after unknown outcome;
- no hand-edited generated API/prompt output;
- no all-profile/all-stage loading as reassurance;
- no bulk compatibility-identifier migration;
- no claim of Bun/typecheck/CI/local/live PASS until that proof actually ran.

## Proof Boundary

REMOTE_GITHUB proves only source/static/CI-verifiable contracts on the exact SHA. Installed Runtime behavior, native Blockbench project navigation, native Undo/playback/persistence, visual quality, and measured end-to-end usage remain higher-context proof.
