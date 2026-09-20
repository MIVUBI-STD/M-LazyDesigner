# LazyDesigner Next Action

Updated: 2026-09-20
Branch: `Local` only.

Owns current implementation continuation only. Product/system/proof owners remain `docs/01-product/`, `docs/04-system/`, and `docs/05-operations/current-validation.md`. Canonical Control: `mcp/gateway/control/`. Former `mcp/gateway/navigator/` source is removed with no alias.

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

Historical baselines only; changed SHAs require their owning verifier. No hand-editing generated docs/output; generated prompt/API output remains generator-owned.

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

Normal UI hides paths/UUIDs/revisions. Quick Command, thumbnails, file browser/crawler, tags, cloud DB, and arbitrary hierarchy remain out of scope.

Project grouping fallback:

```text
nearest bounded .lazydesigner-project.json marker
→ parent of Models/Model
→ direct .bbmodel parent folder
```

## High-End Audit Remediation — NEXT TO DO

No more user-facing features before this list. Already hardened; do not redo without evidence:

1. Persistent Recent separated from ephemeral Active/Open/Dirty.
2. Stale Plugin sessions cannot retain live `Switch`/`Modified` after session loss.
3. Plugin navigation is generation/session aware.
4. Navigation snapshot is bound to the managed Blockbench userData profile.
5. Runtime readiness is bound to the owned/configured Runtime listener rather than hardcoded port-only readiness.

Source authority is current `Local` HEAD.

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

The pointer survives Plugin/Desktop restarts through the bounded snapshot; native proof remains required.

### 3. Single-instance Desktop — SOURCE IMPLEMENTED

Desktop now acquires a Windows session-local named mutex before Tauri startup. A second launch receives the existing-owner signal from the kernel, restores/focuses the canonical `LazyDesigner` window, and exits before creating a second watcher/controller/preferences writer.

Win32 FFI avoids new dependencies, lockfile changes, filesystem leases, services, and stale-file/PID-reuse races. Window-focus proof remains native residue.

### 4. Split oversized owners without redesign — IN PROGRESS

Current maintainability hotspots:

```text
apps/desktop/src-tauri/src/system_status.rs
apps/desktop/src/App.svelte
```

Blockbench detection/compatibility/open now lives in `apps/desktop/src-tauri/src/blockbench.rs`.

Runtime health lives in `runtime_health.rs`; readiness/product/maintenance policy lives in `readiness.rs`; Project backend lives in `project_navigation.rs`; Project Navigator presentation lives in `ProjectNavigator.svelte`; shared Project Navigation types live in `projectNavigationTypes.ts`. App retains command orchestration. Further splits are deferred unless audit evidence shows clear value.

### 5. Behavioral Project Navigator tests — REMOTE COVERAGE EXPANDED

Rust tests now cover multi-model identity, grouping fallbacks, move identity, malformed/duplicate manifests, Save As identity, session clearing, profile/generation identity, Continue semantics, and 64-open/128-recent bounds.

Native-only: real tab/Save/Save As events, missing-file UI, Pin across Desktop restart, and plugin reload lifecycle.

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

LOCAL_CODE owns only environment/toolchain residue. LIVE_BLOCKBENCH owns native/session/visual proof: Gateway reload survival, close/open recovery, phase handoffs, affinity/rebind, interrupted mutation recovery, authoring, Undo/playback/persistence/export, and accepted-result quality/efficiency.

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


## Zero-Waste Usage — LIVE RESIDUE

Remote/source hardening is complete. Do not resume speculative payload trimming. Run `verify:astra-usage-ready`, Golden A–F, and `eval:astra-usage -- <file>`; only source-provided response/compaction telemetry plus quality PASS can prove Codex/Astra savings.
