# LazyDesigner Native Acceptance

Updated: 2026-10-14 (Asia/Jakarta)
Scope: `LOCAL_CODE` + `LIVE_BLOCKBENCH` proof contract only.

This is **not** a second production workflow. It is a bounded acceptance contract used after a fresh installation or a material Gateway/Runtime/plugin/authoring-intelligence change.

## Evidence Record

Use `mcp/tests/fixtures/native-acceptance-manifest.json` as the canonical result shape for one exact-build native acceptance run.

The checked-in file is a template and must remain `UNVERIFIED`. A real run should copy that shape into a run artifact/result and populate exact source/build/environment provenance plus only the checks that were actually exercised.

Allowed verdicts are:

```text
PASS
FAIL
UNVERIFIED
```

Static CI may validate the manifest schema but must never upgrade a native verdict. Native technical PASS also does not imply visual/reference acceptance.

## Goal

Prove that the exact checked-out `Local` source works through the real execution chain:

```text
Codex / AI client
→ persistent LazyDesigner Gateway
→ Runtime
→ Blockbench plugin
→ native Blockbench project
→ save/export/reopen
```

Static source, simulated tests, CI, successful tool calls, numeric validators, screenshots, and export success alone do not prove the complete chain or visual acceptance.

## Acceptance Asset

Use one disposable but reference-driven Bedrock Entity prop with:

- several adjoining Cubes;
- at least one intentional positive-volume intersection or layered contact;
- one UV/texture atlas;
- one simple articulated part when Animation is being accepted;
- an approved reference image with enough views to judge silhouette/depth.

Do not use a production-critical asset for the acceptance run.

## 1. Exact-source and startup proof

Before native authoring:

```text
clean matching Local SHA
→ pinned dependencies installed
→ targeted tests/typecheck/build current
→ Gateway starts once
→ Runtime/Blockbench connects beneath the same Gateway
```

Required evidence:

- the checked-out SHA is recorded;
- Runtime/build identity corresponds to that source;
- Gateway exposes only `status`, `search_capabilities`, `describe_capability`, `invoke_capability`;
- no direct-Runtime connection is used as the normal client authoring path;
- project UUID/affinity is explicit and stable.

## 2. AUTHORING surface / focus proof

### Geometry → Texturing focus

Prove on the real transport:

```text
Geometry focus
→ apply Texturing focus
→ AUTHORING surface remains the same
→ capability set remains semantically identical
→ no new client task/chat
```

If the current Gateway still refreshes conservatively, record that behavior. Relax same-AUTHORING catalog invalidation only after matching transport tests prove it safe.

### AUTHORING → Animation → AUTHORING

Prove:

```text
AUTHORING
→ Animation surface applied
→ Animation catalog active
→ AUTHORING restored
→ AUTHORING catalog active
```

A Runtime/plugin reload must recover beneath the persistent Gateway. Replacing the Gateway process itself is the only expected client reconnect boundary.

## 3. Geometry evidence

After the final Geometry mutation and before review:

- `inspect_model_bounds` returns existing Geometry evidence plus `surface_integrity`;
- `COPLANAR_SURFACE_OVERLAP` is zero for supported/complete scan scope;
- positive-volume intersections are reviewed as structural evidence, not automatically treated as texture defects;
- if `surface_integrity.complete=false`, the unsupported rotated/group-transformed/mesh scope is reviewed natively rather than being treated as clean;
- degenerate geometry and duplicate-name/hierarchy evidence are resolved where material;
- reference comparison covers silhouette, depth, attachment, negative space and identity landmarks;
- technical evidence remains separate from visual/user approval.

## 4. UV / Texture evidence

Before Texturing completion:

- `list_textures(diagnostics=true)` returns `physical_uv_evidence`;
- invalid/degenerate physical-to-UV mappings are resolved;
- large non-uniform density/aspect evidence is reviewed against intentional mapping;
- exact shared UV regions with different physical dimensions are explicitly reviewed rather than silently accepted;
- Mesh UVs, when present, are reviewed separately if cube-face evidence reports incomplete scope;
- atlas organization remains editable and bounded to the approved logical resolution;
- mapped-model appearance, not atlas neatness alone, owns visual acceptance.

No automatic atlas compaction is required for acceptance. Compaction is only justified after the native export/reimport path proves orientation, shared-region and padding preservation for the affected project class.

## 5. Animation craft / contact proof

When Animation is required:

- `inspect_animation(animation_id=<target>)` or the selected authored Animation returns existing animation/root-motion evidence plus `motion_craft_evidence`;
- `bone`, `state`, and `include_effect_keyframes` are used only when their focused detail is actually required; no invented diagnostics flag is part of this call;
- lockstep multi-bone timing and dense sampling are treated as review hints, never automatic failures;
- action intent establishes applicable anticipation/action-or-impact/follow-through/recovery phases without turning the phase scaffold into a mandatory keyframe checklist;
- contact/attachment invariants are inspected only for participating relationships;
- planted contact, grip/attachment, joint closure and clearance are checked through representative native playback;
- static start/middle/end captures do not prove smoothness or contact continuity;
- cyclic motion is observed for at least three consecutive cycles when applicable;
- a rig/pivot/contact geometry blocker returns to Geometry instead of being hidden with denser keys.

## 6. Review evidence freshness

At each user-review boundary:

- evidence belongs to the current project/revision;
- mutation invalidates only affected evidence classes;
- stale screenshots/review artifacts are not reused as current proof;
- internal `PASS` means `READY_FOR_USER_REVIEW`, never user approval;
- approval remains `USER_APPROVED` or explicitly authorized `AUTONOMOUS_VERIFIED` according to the canonical readiness contract.

## 7. Reload and interruption recovery

Prove each once on the current installed build:

```text
Runtime rebuild/reload
plugin reload
Blockbench close → reopen
```

Expected behavior:

- persistent Gateway survives temporary Runtime/plugin loss;
- Runtime reconnects demand-driven beneath it;
- project affinity is not silently rebound to another project;
- an interrupted mutation with uncertain outcome is inspected before retry;
- no mutation is automatically replayed after `OUTCOME_UNKNOWN`.

## 8. Native persistence / export / reopen

Save/export the acceptance asset, close/reopen as appropriate, then verify:

- expected Group/Cube hierarchy remains;
- pivots/locators remain where applicable;
- texture is attached and UV mapping preserved;
- dimensions and major silhouette remain unchanged;
- authored animation/controller state persists when included;
- Undo/playback remains functional before export;
- reopened visual result is coherent against the approved reference.

Minecraft in-game behavior is outside this acceptance unless separately tested.

### Parametric recipe Undo/Redo and pre-commit cancellation

On the same exact installed Blockbench build, create a recipe change that
**updates one existing Cube, removes one Cube, and adds one new Cube** as a
single affected-only apply. Verify all of these using native state and UUIDs:

- successful apply produces one named native Undo entry with unchanged
  unrelated Cubes and a post-state snapshot containing every surviving
  updated Cube plus every created Cube (not deleted Cubes);
- **Undo** restores the exact original instance IDs, Cube UUIDs, transforms
  and outliner hierarchy; **Redo** reconstructs the exact updated/created
  state while preserving deletions and unaffected neighbors;
- a forced read-only pre-commit failure occurs before `Undo.finishEdit`;
  `Undo.cancelEdit(true)` restores the baseline owned-state fingerprint
  without consuming another editor transaction;
- when another active editor Undo save has taken ownership, the recipe
  adapter refuses to cancel/finish it and returns explicit uncertainty;
- if readback does not match the original fingerprint after cancellation,
  report `RECIPE_APPLY_ROLLBACK_UNVERIFIED` rather than asserting recovery.

Add one explicit **post-commit receipt-bound recovery** scenario to the
same native acceptance session. Use `applyCompact`'s authoring evidence
handle and exact `native_source_fingerprint_after` with the existing
recipe service's internal `revertApplied` operation:

- after the recipe's native commit, with no intervening edits, recovery
  must undo exactly that history entry and restore the original fingerprint;
- a different project's active editor or a newer intervening native edit
  must reject recovery **without modifying** the current Undo index;
- an open unrelated native edit, a changed Cube, a substituted receipt,
  expired receipt, already-undone edit, or missing native provenance must
  fail closed, not guess based on an action label;
- when `Undo.undo()` or native readback fails, report
  `RECIPE_POSTCOMMIT_UNDO_UNVERIFIED`; never automatically retry Undo;
- verify that source-only/mock adapters cannot produce native rollback
  eligibility without an attributable Blockbench history entry.

This is a LIVE_BLOCKBENCH acceptance scenario **not executed by this
document**. Landmark residual deterioration after a commit never performs
automatic Undo; it may only trigger a separately authorized recovery
decision through the existing native owner. No fifth Gateway tool is
introduced.

## 9. Cost to Accepted Result

Record only actionable measurements:

```text
discovery calls
schema-description calls
focused reads
mutations
review captures
phase/focus changes
recovery events
correction rounds
```

Optimization target is fewer unnecessary operations/context reloads **without lowering the accepted result**. Do not optimize tool count, source size, or character count as a proxy for end-to-end quality.

## Pass rule

The installation/build is accepted only when the relevant sections above pass on the exact source/build being evaluated.

If one section fails:

1. preserve the failing project/revision evidence;
2. identify the single owning layer/cause;
3. repair the shared source when the defect is generic;
4. rerun the smallest affected acceptance section;
5. continue remaining sections only after that boundary is restored.

Do not mark a native incident resolved from static/source/simulated evidence alone.

## Consolidated Windows local test report — 2026-10-14

This records the completed local sequence against branch `Local`, following
[the local acceptance runbook](local-acceptance-runbook.md). It is a report of
observed results across named builds, not an assertion that every scenario was
rerun on the latest source or that the full visual acceptance contract passed.
Current proof interpretation remains in [current-validation.md](current-validation.md);
remaining work belongs to [next-action.md](next-action.md).

### Environment and source/build identity

Windows testing used Node 24.14.1, Bun 1.3.14 and Rust 1.98.1. Desktop version
was 0.1.0; installed Blockbench was 5.2.0. The disposable data profile was
`mcp/.cache/local-acceptance/d824b35c`, under the same Windows account, with
separate user data, workspace, Codex configuration, managed files, TLS and
WebView2 storage. These tests do not establish separate Windows-account isolation.
App/plugin automatic updates were disabled in the test profile to retain the
tested versions; this is a version pin, not proof of newer-editor compatibility.

| Checkpoint | Source / harness | Proof scope |
| --- | --- | --- |
| Initial checkout | `c03fc30915868def461532d37c6f8b70e12a3507` | Unaccepted: initial source suite reported 196 failures; source gates were repaired before native installation continued. |
| Main native matrix | installed `fcf6617982d94a4e5ddb8162956a00f0c0d99d55`; verifier correction `6afc89893f640a093b24f946289e96f6e65bda70` | Twelve main native steps and supplemental recovery/delivery; Runtime identity `sha256:de0efeb758292191c09912ec3c2849ae26a88d40e34ae979eeb56789beda1ae2`. |
| Background/relaunch fixes | `4cd2fd06895a7a99c3d382c97ba27c5f856cf23f` | Exact source/build/install; targeted persistence, affinity, background heartbeat and duplicate launch. |
| Installed ordinary release | `e9b3bca57a954fa858d4a077ceb000fedf10a627` | Exact source/build/install; native controlled IPC faults, release isolation and lifecycle evidence. |
| Physical Windows focus | debug `59f0a6c2b6ece40f9fd3fae0f5714a4135284b45` | Delayed invocation of unchanged Windows focus owner; actual `DENIED` and `NO_WINDOW`, without result substitution. |
| Latest complete MCP/repository source gate | `561ee8e4d906654deed8bec6fadef6f8618a88ed` | `bun run verify:full` exit 0; later reporting-only commits do not constitute fresh executable runs. |

The installed ordinary release and 4cd2fd06 share Runtime identity
`sha256:b436485f538fe3efc18b40d2db8adbc32dc2077c1263b147c9a2a5178244549c`.
SHA256 values rechecked for the installed e9b3bca5 artifacts:

| Artifact | SHA256 |
| --- | --- |
| Desktop executable | `02f5ba543db20db81393b2edc523d3933da94d452f58e1565e193927dc7afd2e` |
| NSIS installer | `a4327b33ecf1cce9767101ddc5ca4879b0bdf0a21b41ba24fda0b8418257efc1` |
| Installed `blockit_mcp.js` | `00f7a413be78d48c7e10c1753fa15e9c21104af33625b72c6c4b36b48a364c82` |

The plugin is under the disposable profile's
`AppData/Roaming/Blockbench/plugins/blockit_mcp.js`; its workspace is
`User/BlockIT-Workspace`. Later debug-harness/test-command edits did not replace
this ordinary installed release.

### Results against the seven-stage plan

| Stage | Observed outcome | Qualification |
| --- | --- | --- |
| 1 — Baseline | Checkout identity recorded; initial failing source gates repaired; pinned toolchain and subsequent exact-SHA gates PASS. | Commit history mapped scope; historical commits were not each installed/tested. |
| 2 — Build/setup | Canonical managed package and Desktop build, NSIS installation, first setup, plugin location/version and matched hashes PASS. | Disposable profile; multiple repaired build baselines, individually identified above. |
| 3 — Desktop flow | First run/relaunch, Workspace/Support, nine-model search, keyboard/filter retention at 980×680 and 780×560, two-model switching, Smart Open, Modified/save, Save As, close/recent and Continue PASS. | No duplicate tabs or lost edits in these bounded observations. Missing last-model hides Continue; restoring it resumes that exact model. |
| 4 — Native connection | TLS-backed Gateway/Runtime connection, project-affinity verifier, foreign-profile isolation, endpoint mismatch and occupied-port failure handling PASS. | A listening unrelated TCP service never counted as Ready; failed bind reported `RUNTIME_START_FAILED`; cleanup/reload restored connection. |
| 5 — Authoring | Geometry → texturing → animation → particle native verifiers PASS. | Disposable technical fixtures; no human visual/reference approval inferred. |
| 6 — Persistence/additional coverage | Persistence prepare/reopen, surface-gap, template, UV-density prepare/reopen and texture-runtime PASS. | Main matrix on fcf66179 with 6afc8989 harness correction; later targeted persistence repeated on 4cd2fd06. |
| 7 — Recovery/efficiency | Plugin reload, offline/online, AUTHORING↔Animation, Blockbench close/open under persistent Gateway, Gateway replacement and isolation PASS. | Functional recovery passed; real Golden baseline/zero-waste comparisons remain NOT_EXECUTED. |

The twelve main verifier steps are: project-affinity, geometry, texturing,
animation, particle, persistence-prepare, persistence-reopen, surface-gap,
template, UV-density, UV-density-reopen and texture-runtime. Their primary
receipt is `fcf66179/acceptance-summary.json`, with the corresponding
`verify-*-live*.log` files. A twelve-step historical PASS is not a twelve-step
PASS on e9b3bca5 or 561ee8e4.

Additional native checks passed:

- Modified plugin blocks Open/Open model with `PLUGIN_INTEGRITY`, without
  overwrite. Missing plugin with a running editor refuses replacement/forced
  close. Offline missing-file repair restores the exact hash; modified-file
  overwrite and online repair are refused.
- Two user-data profiles refuse ambiguous setup without changing either
  plugin. Malformed installed metadata shows Action required and disables
  launch while retaining Refresh/diagnostics; original bytes were restored.
- Pin order remains stable; Continue selects the exact latest model rather
  than the first pin. Missing-after-render Open refuses without changing the
  active model; the disposable file was restored.
- Background/minimized focus, foreign executable titled Blockbench and
  ambiguous-window fallback were exercised. Six frontend result branches and
  hung/rejected status handling also have explicitly MOCKED IPC coverage.
- Real Tauri debug acceptance exercised repeated probe rejection, full-status
  rejection, locked stale actions after clearing the fault, and full Refresh
  recovery. Injected focus results exercised fallback without a false focus
  success. Release compilation refuses the acceptance feature; the ordinary
  release ignores the fault-file environment and lacks injection markers.
- Physical Windows `DENIED` was returned with another native foreground
  window. Physical `NO_WINDOW` used the real Blockbench executable suspended
  before startup after saved editor windows closed. The process fixture was
  verified and removed; both saved models were reopened afterward.
- Sixteen duplicate Desktop launches retained one primary process; background
  health stayed fresh during 128 seconds minimized. Normal close and forced
  test termination produced distinguishable lifecycle trails; Runtime/model
  survived Desktop termination.
- Native discovery/input guards, Bedrock JSON/PNG export delivery and
  overwrite protection passed. Export's memory metadata changes were separated
  from saved `.bbmodel` bytes. Original LIFT was preserved; disposable copies
  were excluded from visual/efficiency scoring.

### Failures found, repairs and verification

| Failure / first wrong owner | Delivered correction | Follow-up proof |
| --- | --- | --- |
| Initial source gate: 196 failures, including tests/imports left behind module moves | `5e63f4b0` closes executable source gate at canonical owners. | Subsequent exact-SHA full gates PASS; initial SHA remains unaccepted. |
| Packaged Gateway entry, standard editor discovery, profile-bound launch and Windows version metadata | `7e64505e`, `6b619a05`, `61704550`, `d824b35c`. | Managed build/setup and native launch/version PASS. |
| Two plugin owners and visible helper consoles | `b8e791bd` retires the old owner through lifecycle cleanup and hides background helpers. | Regression red→green; one installed plugin/panel and no flashes in bounded startup/reload observations. This is not an OS bluescreen diagnosis. |
| Lease filesystem compatibility and nonreactive navigation/filter input | `823aaf98`, `ae096f7c`. | Native healthy lease and Desktop search/keyboard/model-flow checks PASS. |
| Damaged metadata treated as first run; launch paths bypassed manager state | `5323070f`, `5bbdc511`, `93a82f50`, `77e52fc5`. | Native fault/refusal cases PASS; corrupted inputs restored. |
| Reload lost native master settings; packaged authoring contexts could not resolve | `ee167ae3`, `fcf66179`. | Reload and installed authoring chain PASS. |
| Texturing verifier requested inventory without UV diagnostics | `6afc8989` corrects verifier requests. | Original failure retained; texturing and remaining authoring verifiers PASS. |
| Hanging status IPC retained healthy actions; background renderer throttling expired health | `1a3b1ecd` bounds read-only waits; `4cd2fd06` uses native Runtime/navigation timers with teardown. | Hung IPC simulation/recovery, real native rejection, minimized heartbeat and relaunch PASS. |
| Unobservable native failure paths and ambiguous disappearance reports | `e9b3bca5` adds debug-only fault seam and bounded lifecycle/panic PID metadata; `59f0a6c2` adds delayed real focus. | Native faults, actual Win32 focus results and normal/forced termination PASS; old disappearance cause still UNKNOWN. |
| Installer cases timed out only within combined runtime suite | `c5e8285e`/`561ee8e4` run installer tests in a fresh Bun process and align command contract. | All 2,060 runtime tests PASS, same assertions/deadlines; exact-SHA full gate PASS. |

Latest full-gate command: `bun run verify:full` from `mcp/`, Bun 1.3.14,
source `561ee8e4d906654deed8bec6fadef6f8618a88ed`, exit 0. Recorded suites:
248 repository, 2,039 runtime plus 21 isolated installer, 164 authoring,
175 Gateway/manifest and 41 surface guards; all zero failures. Type checks,
generated freshness, evaluations/benchmarks and plugin build also completed.
These suite counts are not a count of unique end-to-end scenarios.
Desktop's e9b3bca5 `npm run verify:source` passed 52 Rust tests; its separate
debug acceptance Rust run passed 53. This is separate evidence, not a Rust
run on 561ee8e4. Reporting-only changes use targeted documentation contracts.

### Remaining evidence and limits

| Item | Status | Requirement to close |
| --- | --- | --- |
| Historical Desktop disappearance | UNKNOWN / not reproduced | Capture an actual recurrence with time, PID/window state and bounded lifecycle log; identify the causal owner before claiming a fix. |
| Current bounded stability | PASS for installed e9b3bca5 | 120/120 responding samples over approximately 120 seconds; minimized/relaunch retained primary PID. No matching Desktop/WebView fault or display-reset entries in the two-day query. This does not establish the old cause or indefinite stability. |
| Human visual/reference acceptance; LD-Q01–Q03 | UNVERIFIED | Review actual silhouette/reference, cross-Cube texture edges and rotated anchor/pivot behavior on the intended build. Numeric/verifier PASS is insufficient. |
| Six Golden A–F baseline/zero-waste pairs | NOT_EXECUTED | Comparable approved inputs and accepted quality, then measured runs. Golden F lacks an approved reference package. Usage-ready is preparation only. |
| Token/cost reduction | NOT CLAIMED | Actual source telemetry; `token_claim_available=false`, `total_tokens=null`. Static benchmarks are not model-token savings. |
| Native animation sampler LD-Q04 | BLOCKED_NATIVE_VERIFICATION | Exact recovery proof across all protected native state domains; sampler remains disabled. |
| Blockbench 5.2.2 or later | Compatible-unverified where documented | Separate matching-build validation; no automatic upgrade of 5.2.0 proof. |

The ordinary release is restored; debug acceptance is not shipped. No API
expansion, release publication or blanket current-build native/visual sign-off
is part of this report.

### Evidence locations and retention

The checked-in report is the durable consolidated result. Raw machine receipts
remain ignored local artifacts under `mcp/.cache/`; a fresh clone will not
contain them. Local paths below identify evidence, not downloadable GitHub
attachments. TLS keys, private configuration, model files, binaries and UI
captures are not included in this documentation update.

| Local evidence relative to `mcp/.cache/` | Contents |
| --- | --- |
| `local-acceptance/ae096f7c/` | Desktop flow, plugin integrity, pin/Continue, focus/missing-model and profile refusal. |
| `local-acceptance/77e52fc5/` | Metadata fault, endpoint mismatch and occupied-port bind failure. |
| `local-acceptance/fcf66179/acceptance-summary.json` | Twelve native steps, recovery receipts, first texturing failure and supplemental guards/export. |
| `local-acceptance/4cd2fd06/acceptance-summary.json` | Background heartbeat, duplicate launches, persistence, affinity, mocked hangs and native module coverage. |
| `local-acceptance/e9b3bca5/acceptance-summary.json` | Source/build/install, native IPC injection, release isolation and lifecycle/model survival. |
| `local-acceptance/59f0a6c2/physical-focus-acceptance.json` | Actual Windows focus outcomes and process-fixture cleanup. |
| `local-acceptance/59f0a6c2/desktop-{stability-observation,visibility-recovery,webview-fault-check}.json` | Bounded stability, minimized recovery and historical fault query. |
| `localtest-real-focus-full*.log`, `localtest-real-focus-runtime-time-budget.log` | Failed combined-suite attempts, including insufficient timeout-only workaround. |
| `localtest-runtime-installer-isolation.log`, `localtest-final-focus-full.log` | Isolated diagnostic proof and final successful exact-SHA full gate. |

Historical receipt fields such as `NOT_EXECUTED` remain valid for their original
checkpoint; later rows in this report explicitly close only the matching
residue. Do not rewrite old receipts to suggest those actions ran earlier.
