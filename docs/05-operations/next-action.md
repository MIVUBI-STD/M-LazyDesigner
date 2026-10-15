# LazyDesigner Next Action

This file owns **continuation only**. Architecture: `docs/01-product/`, `docs/04-system/`; proof: `current-validation.md`; native procedure: `local-acceptance-runbook.md`. Patch history remains in Git.

## Active Desktop migration direction — 2026-10-15

The user explicitly corrected the design direction: **BlockIT is retired; LazyDesigner must not launch or depend on legacy BlockIT installs/plugins/managers as an active runtime**. Current source still hardcodes `blockit.exe`, `blockit_mcp.js`, `blockit_mcp`, `mcp_servers.blockit` and `%LOCALAPPDATA%\\BlockIT` across the production packaging/Desktop chain. The screenshot shows a welcome/setup screen with a conflict involving a pre-existing Blockbench plugin; it does not establish the plugin's binary version. The ProjectNavigator source is present but hidden in the `welcome` UI branch when manager detection fails. Treat this as a **migration-and-readiness root-cause task**, not a request to bypass the file-ownership protection.

Canonical design and migration acceptance: [compatibility-identifiers.md](../04-system/compatibility-identifiers.md#active-decision--canonical-lazydesigner-only-installation). First implement one coherent new package + install identity and independently safe Workspace navigation; map dependencies, exact-SHA tests, and native residue before changing active identifiers. Do not auto-`--adopt`, execute an old manager, delete old files, edit Blockbench native plugin trust, rewrite user Codex configuration, or claim native success. User models/textures and existing working project state must remain untouched. This is a **documented active goal**, not a completed code migration. R02 source work remains recorded below; R03 and new feature authoring are deferred while Desktop migration is prioritized.

## Current direction

The user authorized recovery snapshot `3.0` on 2026-10-15: backup branch and tag must point to the same snapshot commit as the saved `Local` state. Preserve that baseline before further improvements; continue normal work on `Local`, leaving `3.0` unchanged. The temporary prerelease does not close the retrospective findings or imply new native/source acceptance. Authored model workspaces are included under this explicit snapshot authorization; raw logs and private machine state remain local.

**Current R07 batch:** Source policy for high-cost expansion was committed at `7946698d4bc0`. Cross-asset R07 decision probes now exercise the **existing** visualObservation → minecraftQualityFocus/correctionLoop path on synthetic, clearly UNMEASURED fixtures. Probes include primary silhouette before detail, material-only variant reuse, grounded attachment/pivot, timing-before-followers, missing evidence and unknown cause. They do NOT run a generative AI, produce model images, prove user acceptance or measure reduced rework. Source tests/CI remain NOT_EXECUTED on this SHA. No additional Runtime/Gateway tool, model scoring engine or persistent decision registry was created.

**Current priority:** R02 context, Runtime-client and project-affinity safety is source-implemented on `Local` with bounded regression fixtures. Missing/unreadable required Skill/profile files retain Runtime health, block authoring, expose relative context diagnostics and invalidate cached guidance. Cold-start health probes that precede lazy MCP handshake no longer masquerade as broken connections; a previously connected but unready client stays degraded. Health-only Runtime with unexplained MCP client unready stays degraded; project affinity requires matching Runtime project-health evidence rather than assuming BOUND. Managed packages must include every required context. A stale ownership assertion was aligned with the revised resolver. Source-only: NOT exact-SHA executed tests or native/profile/build acceptance. Next R02 evidence: matching installed Gateway/Runtime/editor identity and wrong-profile/TLS/credential refusal/recovery; never disable trust checks. Other local-test findings remain open.
**R02 cold-start status follow-up:** A fresh Gateway's health-only `getStatus()` could report Runtime online while retaining the initial `offline` MCP session; Control's intentional lazy-handshake exception recognizes `probing` instead, producing a false `RUNTIME_CLIENT_NOT_READY` status. The canonical backend now advances only a never-ready, failure-free first healthy status to `probing`, without opening a client or clearing failed reconnect backoff. Two focused source regression fixtures cover repeated healthy first-status and recovery after an actual offline probe. SOURCE IMPLEMENTED; exact-SHA Bun/CI and matching installed native verification NOT_EXECUTED. Next: run `bun test gateway/control/snapshot.test.ts gateway/runtime/connectionManager.test.ts tests/gateway-control-status-economy.test.ts` in `mcp/` at the patched SHA, then validate actual cold-start/profile/build affinity without weakening TLS. 
**R02 recovery evidence gate (Batch 1):** Source review exposed a second risk: a healthy HTTP probe clears reconnect cooldown and historically could erase the failure clue before a new MCP handshake, allowing an old same-signature client/catalog to be reported ready. The existing Gateway connection manager now retains a process-local unverified MCP-failure marker across healthy /health probes until native MCP handshake success; public status remains DEGRADED and cached catalogs cannot bypass revalidation. The serialized execution path closes the old client before reconnecting. Positive/negative regression fixtures cover cold-start, offline→healthy, repeated health probes and same-signature stale catalog. SOURCE IMPLEMENTED, Bun/CI and matching native verification NOT_EXECUTED. Run targeted `bun test gateway/runtime/connectionManager.test.ts gateway/control/snapshot.test.ts tests/gateway-control-status-economy.test.ts` at exact patched HEAD; do not claim Runtime recovery without native proof. No new public tool or recovery system.
**R02 project/profile affinity follow-up (Batch 2):** The old project-creation exception cleared a bound UUID on any mismatched project health, including wrong requested UUID or UNKNOWN availability, and Control called any requested-unavailable result LOST even when it referred to another project. The canonical affinity policy now permits clearing only an explicit matching-UUID unavailable result, classifies unrelated failed lookup as unverified, and the Gateway validates phase and project jointly before updating either to avoid pinning the wrong Runtime phase after a failed first profile. Exact source reviewed; deterministic positive/negative regression cases added for project creation, mismatched health and recovery to a different correct phase. SOURCE IMPLEMENTED; exact-SHA Bun/CI, managed installation and LIVE_BLOCKBENCH profile/TLS acceptance NOT_EXECUTED. Run `bun test gateway/runtime/affinityPolicy.test.ts gateway/control/snapshot.test.ts tests/project-affinity-gateway.test.ts` at the patched SHA; inspect failures before considering more source changes. No security checks relaxed.
**R02 Stage-context supersession (Batch 2):** A Geometry profile handle previously survived a Geometry→Texturing/Animation switch because the new stage has no profile family in its active handles. The existing `filterContext` now invalidates unmatched authoring Specialist/Profile families even when their new stage has no member, while preserving unrelated known doc families. A concrete Geometry HUMANOID→Texturing regression fixture was added. SOURCE IMPLEMENTED, tests/CI NOT_EXECUTED at this SHA; native authoring handoff remains to be validated with matching build. Run `bun test tests/gateway-control-context-supersession.test.ts gateway/control/packet.test.ts` on exact patched SHA.
**R02 cross-mode Runtime readiness (Batch 3):** `SYSTEM_DEVELOPMENT` reported `runtime_ready=true` from HTTP online/catalog freshness even when the canonical Control snapshot explicitly contained `RUNTIME_CLIENT_NOT_READY`. The existing Control readiness owner now shares the same Runtime readiness predicate across system and asset modes, retains development context independence and reports the blocker without declaring asset authoring ready. A focused negative regression was authored; SOURCE IMPLEMENTED, exact-SHA Bun/CI and LIVE_BLOCKBENCH NOT_EXECUTED. Run `bun test gateway/control/readiness.test.ts gateway/control/snapshot.test.ts tests/gateway-control-status-economy.test.ts` at exact patched HEAD. Other R02 source changes still await tests on the final same SHA.
**R02 MCP reconnect cooldown (Batch 3):** The existing `markAvailable` health path also cleared MCP-handshake backoff when a healthy `/health` was polled after a degraded MCP connect; this could permit repeated retries against an unresolved TLS/credential failure. The canonical connection manager now clears health-outage backoff when recovering from `offline`, but keeps the `degraded` MCP reconnect cooldown until a true successful handshake (`markReady`). Existing health-offline recovery regression remains and a focused failed-MCP/repeated-healthy-status test has been authored. SOURCE IMPLEMENTED, Bun/CI/installed Runtime NOT_EXECUTED at this SHA. Run `bun test gateway/runtime/connectionManager.test.ts gateway/control/snapshot.test.ts gateway/runtime/reconnectPolicy.test.ts` at the exact patched SHA; profile/TLS native rejection and recovery remain unverified.

The persistent Gateway owns client stability and Runtime
recovery; Control owns context/readiness; Runtime/Plugin own Blockbench.
Retain exactly four public Gateway tools and the existing source owners.

Receipt/readiness and Golden Session comparability fixes are SOURCE IMPLEMENTED; this does not prove visual quality or AI savings.

## Next REMOTE_GITHUB work

### Deferred authoring follow-up 2026-10-15

The user closed the asset session and requested an honest improvement report. [The retrospective](mcp-session-retrospective-2026-10-15.md) owns that dated observation/backlog, not architecture or new PASS claims. Resume only on a new user instruction. First establish one profile/build/editor identity and correct the stale context-path/status boundary; then diagnose particle binding/emitter/render visibility with one disposable fixture. Next investigate the observed multi-channel batch-scale rejection and export/save-path control delta, before reducing payload/revision overhead. Do not repeat file-link-only particle advice, start a broad source rewrite, rerun the full acceptance matrix, or infer token savings from log size. Existing native restoration and visual/Golden proof boundaries below remain active.

The requested detailed foundation is now in the same retrospective: R01–R12 diagnosis cards, process/owner map, source anchors, evidence confidence, minimal experiments, negative cases, acceptance and measurement limits. R03 batch-scale transaction safety is SOURCE IMPLEMENTED: same-track near-collisions matching native replaceOthers tolerance are rejected before Undo; predicted unselected overwrite casualties are compared against actual object identity before the native edit completes, retaining the existing full-animation Undo/rollback owner (no redundant keyframe-only casualty hook). Native Undo/Redo and Bun tests remain NOT_EXECUTED. Earlier R03 cross-track collision correction is SOURCE IMPLEMENTED: `server/tools/animation/batch.ts` now passes selected animator/channel identities into `lib/animation/batchPlanning.ts`; validation retains snapped bounds and same-track collision refusal while accepting equal times on different tracks. Source regression tests have been added; Bun/native Undo verification NOT_EXECUTED. R02 remains a prerequisite for native claims; R01 source-side preview diagnostics are SOURCE IMPLEMENTED: native effect preview file is now inspectable, and manage_particle distinguishes loader invocation/error from unverified emitter trigger and viewport rendering. Actual missing particle visibility remains unresolved pending matching LIVE_BLOCKBENCH fixture. R01 native work remains deferred. R05 must reuse the existing compact texture inventory rather than implement it twice. R04 uncertain native write/afterSave diagnostics are SOURCE IMPLEMENTED: a write that throws, cannot be verified, or fails its native afterSave/lifecycle is marked EXPORT_WRITE_OUTCOME_UNKNOWN or EXPORT_LIFECYCLE_UNVERIFIED, preserving potentially written files without automatic retry/deletion and requiring inspection of both file and active editor state. Targeted filesystem failure-injection fixtures added; no claim of atomic save or native acceptance. R04 Save As metadata reporting is SOURCE IMPLEMENTED: project export receipts now carry before/after project identity, native save behavior and changed metadata keys, which Control Delta reports separately from appearance freshness. This is not a copy-only mode; executable/native Save As/persistence checks remain NOT_EXECUTED. This request only deepens the report; no repair is activated.

The user explicitly activated Windows local testing. Remote verification remains
optional and manual-only; do not change `main` or settings to enable workflows.
Reuse matching exact-SHA source proof and never substitute ancestor results.

## Active Windows sequence

Installed executable: `e9b3bca57a954fa858d4a077ceb000fedf10a627`, Local. Bun 1.3.14 baseline, Node 24, Rust 1.98.1.

The [consolidated Windows report](native-acceptance.md#consolidated-windows-local-test-report--2026-10-14) records every stage, repair, build/hash and local evidence location. No raw private profile, TLS, model or binary artifacts are published.

1. Source `561ee8e4d906654deed8bec6fadef6f8618a88ed`: exact-SHA `bun run verify:full` PASS; all 2060 runtime tests retained in separate Bun processes with unchanged deadlines/assertions. Installed e9 release: Desktop `verify:source` 52 Rust tests and managed/Desktop build/install PASS. `docs:check` passed in full gate. Only the canonical generators may update these artifacts.
2. Main twelve native steps and recovery PASS on fcf66179 with 6afc8989 harness; later targeted heartbeat/persistence/affinity/single-instance PASS on 4cd2fd06. Native IPC fault/recovery and release isolation PASS on e9b3bca5. These are named-build results, not twelve current-build passes.
3. Actual Windows DENIED/NO_WINDOW PASS on debug 59f0a6c2; process fixture removed and saved models reopened. Historical disappearance UNKNOWN: e9 responded for 120s, minimized/relaunch retained PID, no matching two-day fault entries. A future recurrence needs timestamp/PID/window state plus bounded lifecycle log; do not infer its cause from absence of faults.
4. Remaining: human visual acceptance (LD-Q01–Q03); six quality-gated Golden comparisons (F lacks reference); tokens unavailable; native sampler blocked (LD-Q04); newer Blockbench compatibility unvalidated. No further asset mutation or unrelated repair is implied by this reporting task. Data d824b35c, editor 5.2.0, updates OFF; ordinary e9 release retained.

Use existing runbook and proof owners. Setup/UI observations above are partial. Native
and visual checks remain NOT_EXECUTED until actually observed.

## Active animation safety — LD-Q04

`mcp/lib/animation/nativeRestorationContract.ts` compares caller-supplied
before/after digests for the same Project, Animation and evaluation identity
across ten native state domains. This is `DIAGNOSTIC_ONLY`.
`describeNativeAnimationRestorationBoundary` remains
`BLOCKED_NATIVE_VERIFICATION` with `native_sampler_enabled=false`.
Earlier isolated TypeScript/Node checks do not authorize native timeline
sampling or establish current exact-HEAD Bun PASS.

Future native sampling requires exact recovery even on failure of timeline,
controller, bones/Locators/mesh, Molang, texture frames, audio/particles,
overlays/UI and external extension callbacks. Do not create a second sampler
or bypass the existing gate.

## Deferred LIVE_BLOCKBENCH evidence — LD-Q01–Q03

- **LD-Q01:** actual Cube silhouette/reference capture.
- **LD-Q02:** actual cross-Cube texture atlas edge sampling.
- **LD-Q03:** rotated Cube anchor/pivot correctness.
- **Blockbench 5.2.2:** `compatible-unverified`, not `validated`;
  see `blockbench-5.2-native-adoption.md`.

Only exact installed-build Undo/Redo, save/reopen, playback, reconnect and
visual-review evidence from the existing runbook can close native claims.
Windows LIVE_BLOCKBENCH connection is proven; native quality/visual acceptance remains incomplete.

## Separate bounded source boundaries

- `mcp/lib/reference/partCorrespondence.ts` provides provisional image
  region/Cube links, never certified visual similarity.
- `manage_uv_layout` source planning exists but is **not registered**
  in Runtime. Prepared code is not a shipped public capability.
- `mcp/gateway/control/delta/receipts.ts` uses canonical
  `structuredContent`; unknown mutation results invalidate conservatively.
- `mcp/gateway/development/affectedExecution.ts` owns affected tests;
  `mcp/scripts/development/audit-data-inventory.ts` is read-only derived audit,
  not a separate registry.
- REA can investigate a concrete binary or runtime gap directly upstream.
  No REA execution is current-head native acceptance.

## Stop rules

No second engine, router, semantic database, shadow registry, speculative
vector store, or proof-of-proof framework. Compatibility re-export wrappers
are not dead code merely because first-party imports migrated; remove only
with complete caller and native compatibility evidence.

Complete one bounded source/verification task, record genuine proof and
remaining native-only uncertainty, then STOP.
