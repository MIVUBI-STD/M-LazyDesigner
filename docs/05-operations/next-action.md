# LazyDesigner Next Action

This file owns **continuation only**. Stable architecture is in
`docs/01-product/` and `docs/04-system/`; proof interpretation is in
`docs/05-operations/current-validation.md`, and native procedures are in
`docs/05-operations/local-acceptance-runbook.md`. Previous detailed patch
narratives remain in Git history, not this active queue.

## Current direction

**Current priority:** complete Windows local acceptance one stage at a time.
The persistent Gateway owns client stability and Runtime
recovery; Control owns context/readiness; Runtime/Plugin own Blockbench.
Retain exactly four public Gateway tools and the existing source owners.

Geometry, Texture and Animation receipt/readiness corrections and recent
Golden Session input/model/token comparability fixes are SOURCE IMPLEMENTED,
not proven native quality or measured AI savings.

## Next REMOTE_GITHUB work

The user explicitly activated Windows local testing. Remote verification remains
optional and manual-only; do not change `main` or settings to enable workflows.
Reuse matching exact-SHA source proof and never substitute ancestor results.

## Active Windows sequence

Tested executable baseline: `b8e791bd8fe6b2857b2628b2861530aed9ce03a7`, branch `Local`. Bun 1.3.14 baseline, Node 24, Rust 1.98.1.

1. Source gate closed: clean exact-SHA `bun run verify:full` PASS, including canonical `docs:check`; only the canonical generators may update these artifacts; Desktop `verify:source` PASS (51 Rust tests). Managed build/install and Desktop Set up succeeded. Reuse this evidence for unchanged executable inputs; documentation-only recording does not relabel the tested artifact.
2. **Stage 2 current blocker:** b8e791bd fixes duplicates/consoles, but native Reload loses Desktop readiness after the lease heartbeat stops. Installed Blockbench scoped FS lacks utimesSync and its rmSync wrapper is asynchronous. Source repair now rewrites the owned bounded lease and uses unlinkSync; regression red→green and typecheck PASS. Pin/build the repair SHA and verify Ready beyond the 15-second TTL, including reload.
3. About observed: Desktop 0.1.0, Blockbench 5.2.0, managed b8e791bd. One native panel is visible at full window size. Then finish Section 6A: repeat launch, Smart Open, Workspace/Support, search/keyboard, stale status and two-model synchronization. Pending editor update must not silently change baseline. Data profile: `d824b35c`; last installed Desktop/evidence: `b8e791bd`.
4. Before authoring, resolve the observed managed-package omission of specialist reference files; reproduce compiled Gateway context loading before any packaged Control readiness claim. Prove matching Gateway/plugin identity and project affinity, then Geometry → Texturing → Animation → Particle and persistence prepare/reopen/verify with disposable fixtures.
5. Test recovery, then compare Golden Tasks only after quality passes, with matching reference/model fingerprints, build, client/model identity and actual telemetry. Missing tokens remain null.

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
Windows LOCAL_CODE is active. Native setup is partial; functioning LIVE_BLOCKBENCH connection has not yet been proven.

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
