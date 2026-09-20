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

Current source authority is the actual `Local` branch HEAD; this continuation file does not embed a self-referential commit SHA.

### 1. Stable Project identity — SOURCE IMPLEMENTED

`.lazydesigner-project.json` now owns only `schema = 1`, stable `project_uuid`, and `display_name`. Model membership remains filesystem/Blockbench-derived. Explicit Pin creates the minimal manifest when absent or upgrades only an empty legacy marker; malformed/unsupported manifests are never overwritten. Duplicate observed UUIDs fail closed to separate path-scoped identities and Pin is refused rather than merging Projects.

Legacy path-scoped Projects remain readable, and legacy path Pins remain recognized at their current location. Once Pin stores the manifest-backed identity, folder move/rename no longer changes the Pin key. Native move/rename + Pin proof remains LIVE_BLOCKBENCH residue.

### 2. Correct Continue semantics — SOURCE IMPLEMENTED

`Continue` now resolves one exact last active saved `.bbmodel` pointer from the profile-scoped Plugin snapshot. Pin/Favorite/Recent display ordering no longer decides the target.

```text
last active saved model
→ exact file still exists
→ Continue

missing/moved exact file
→ no Continue
→ user chooses from Recent Projects
```

The pointer survives Plugin/Desktop restarts through the same bounded navigation snapshot and does not create a second project database. Native LIVE_BLOCKBENCH proof is still required.

### 3. Single-instance Desktop — SOURCE IMPLEMENTED

Desktop now acquires a Windows session-local named mutex before Tauri startup. A second launch receives the existing-owner signal from the kernel, restores/focuses the canonical `LazyDesigner` window, and exits before creating a second watcher/controller/preferences writer.

The implementation uses Win32 FFI directly from Rust, so there is no Tauri single-instance dependency, lockfile regeneration, filesystem lease, background service, or second state system. Kernel object lifetime also removes stale-file/PID-reuse recovery races. Native second-launch focus behavior remains Windows acceptance residue.

### 4. Split oversized owners without redesign — IN PROGRESS

Current maintainability hotspots:

```text
apps/desktop/src-tauri/src/system_status.rs
apps/desktop/src/App.svelte
```

The Blockbench detection/compatibility/open owner is now isolated in `apps/desktop/src-tauri/src/blockbench.rs`; workstation orchestration calls that owner instead of retaining discovery/version logic inline.

Remaining Rust targets: runtime_health, readiness, project_navigation, managed. Svelte targets: Overview, ProjectNavigator, ProjectDetails, Support, bounded operation state. Refactor only by existing ownership; no new framework/router.

### 5. Behavioral Project Navigator tests — REMOTE COVERAGE EXPANDED

Rust behavior tests now cover multi-model Project identity, manifest/conventional/direct-parent grouping fallback, Project move identity, malformed/unsupported manifests, duplicate UUID fail-closed behavior, Save As model identity, session-live clearing, profile/generation revision identity, Continue exact-last-model semantics, and exact 64-open / 128-recent bounds.

Still native-only: real Blockbench tab/Save/Save As event emission, missing-file UI interaction, Pin persistence across actual Desktop restart, and plugin reload lifecycle. Those remain in the LIVE_BLOCKBENCH acceptance set rather than being faked in CI.

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
