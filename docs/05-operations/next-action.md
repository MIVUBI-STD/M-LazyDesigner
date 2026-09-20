# LazyDesigner Next Action

Updated: 2026-09-20
Branch: `Local` only.

This file owns **current implementation continuation only**. Product workflow belongs in `docs/01-product/`; system ownership in `docs/04-system/`; proof history in `docs/05-operations/current-validation.md`.

Canonical Control source: `mcp/gateway/control/`. The former `mcp/gateway/navigator/` source is removed with no alias.

## Current State

REMOTE_GITHUB remains the source authority across Desktop, Plugin, Runtime, Gateway, Control, Managed Distribution, validation, and repository contracts.

Reusable historical authoring baseline:

```text
generated freshness PASS
Runtime/Gateway typecheck PASS
Runtime regression PASS
authoring contracts PASS
modern MCP 2026 negotiation/list/call PASS
legacy 2025 JSON initialize/list/call PASS
```

These are historical baselines only. A changed exact SHA still requires its applicable verifier.

No hand-editing generated docs/output; generated prompt/API artifacts remain generator-owned.

Core invariants:

- Gateway exposes only `status`, `search_capabilities`, `describe_capability`, and `invoke_capability`.
- Gateway is the persistent AI-client boundary; Runtime/plugin recovery stays beneath it.
- Runtime owns execution and native Blockbench interaction.
- Desktop is the workstation controller, not a second Runtime/editor/project database.
- no second Control/router/profile/state system.

## Projects & Models — Current Implemented State

User model:

```text
Project
→ one or more saved .bbmodel Models
```

Implemented: Active Project/Model, Recent Projects, Open Folder, Open/Switch Model, Reveal, Copy Path, See details, contextual search, Continue, Pin, existing-only Models/References/Textures/Exports shortcuts, dirty `Modified` state, profile-bound navigation projection, generation/session-aware sync, and stale live-state invalidation.

Paths, UUIDs, revisions, and technical state stay hidden from normal UI. Quick Command, thumbnails, file browser, drive crawler, tags, cloud DB, and arbitrary nested hierarchy remain out of scope.

Project grouping fallback:

```text
nearest bounded .lazydesigner-project.json marker
→ parent of Models/Model
→ direct .bbmodel parent folder
```

## High-End Audit Remediation — NEXT TO DO

Do **not** add more user-facing features before this list is worked through.

Already hardened; do not redo without evidence:

1. Persistent Recent separated from ephemeral Active/Open/Dirty.
2. Stale Plugin sessions cannot retain live `Switch`/`Modified` after session loss.
3. Plugin navigation is generation/session aware.
4. Navigation snapshot is bound to the managed Blockbench userData profile.
5. Runtime readiness is bound to the owned/configured Runtime listener rather than hardcoded port-only readiness.

Current Local HEAD at this handoff:

```text
abe71afbe361ec02d379e6e15a23f8d22dfa40c0
test(desktop): align gateway probe wording
```

### 1. Stable Project identity

Current Project identity is still path-derived. Upgrade `.lazydesigner-project.json` into a minimal canonical manifest:

```text
schema
stable project UUID
display name
```

Requirements: Project move/rename must preserve identity and Pin; malformed/unsupported manifest must fail safely; manifest must not become a second project database; keep model membership filesystem/Blockbench-derived unless evidence proves otherwise. Audit migration/collision behavior before coding.

### 2. Correct Continue semantics

`Continue` must mean last actual work, not the first Project after display sorting.

```text
Pinned ordering ≠ Recent ordering ≠ Last opened model
```

Use canonical Blockbench recent/session evidence. Do not infer last work from Pin order.

### 3. Single-instance Desktop

Second LazyDesigner launch must focus the existing window. Goals: one watcher, one maintenance controller, one preferences writer, no duplicate notifications/actions. Do not add a background service just for this.

### 4. Split oversized owners without redesign

Current maintainability hotspots:

```text
apps/desktop/src-tauri/src/system_status.rs
apps/desktop/src/App.svelte
```

Refactor only by existing ownership. Rust targets: blockbench, runtime_health, readiness, project_navigation, managed. Svelte targets: Overview, ProjectNavigator, ProjectDetails, Support, bounded operation state. No new framework/router unless necessary.

### 5. Behavioral Project Navigator tests

Add behavior-focused tests, not mainly source-string assertions:

```text
two models in one Project
manifest root / fallback root
Project move with stable identity
corrupt/unsupported manifest
Blockbench close clears live state
Plugin reload/generation change
profile-scoped snapshot
Save / Save As
missing model
Pin persistence
Continue last-opened semantics
64 open / 128 recent bounds
```

### 6. Native LIVE_BLOCKBENCH acceptance

Use `docs/05-operations/local-acceptance-runbook.md`. Prove Active follows tab changes, existing Open becomes Switch without duplicate tab, Modified edit/save behavior, Save As identity/grouping, close/open lifecycle, plugin reload generation, custom userData profile correctness, multi-model Project grouping, Pin/Search/Continue/folder shortcuts, and persistent Gateway survives Runtime/plugin reload.

No native PASS may be claimed from CI.

### 7. Product lifecycle after native proof

Only after the above is stable:

1. Desktop upgrade smoke A → B preserving managed state/preferences.
2. Ownership-aware `Remove LazyDesigner integration`, preserving workspace by default.
3. Desktop self-update only after signed updater public-key/channel policy is finalized.
4. Dependency/security scanning and release hardening before broader distribution.

## LOCAL_CODE / LIVE_BLOCKBENCH Handoff — ACTIVE

LOCAL_CODE proves only environment/toolchain residue CI cannot prove. LIVE_BLOCKBENCH owns native Blockbench/session/visual proof.

Remaining live residue includes persistent Gateway survives Runtime/plugin reload, Blockbench close/open recovery, AUTHORING↔Animation handoff, Geometry↔Texturing shared surface, project affinity/rebind, interrupted mutation inspect-before-retry, authoring execution, Undo/playback/persistence/export, and representative accepted-result quality + efficiency.

## Stop Rules

- no second Control/router/profile/state system;
- no duplicate Desktop project database;
- no dependency graph/persistent revision DB without demonstrated need;
- no hybrid Gateway before Golden Task evidence;
- no capability reduction for context savings;
- no mutation auto-retry after unknown outcome;
- no hand-edited generated API/prompt output;
- no claim of Bun/typecheck/CI/local/live PASS until that proof actually ran.

## Proof Boundary

REMOTE_GITHUB proves only source/static/CI-verifiable contracts on the exact SHA. Installed Runtime behavior, native Blockbench project navigation, Undo/playback/persistence, visual quality, and measured end-to-end usage remain higher-context proof.
