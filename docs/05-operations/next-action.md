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

Baseline checkout: `c03fc30915868def461532d37c6f8b70e12a3507`, branch `Local`.
Use Bun 1.3.14, Node 24 and Rust 1.98.1. Local repairs are not baseline-SHA proof.

1. Source closure passed locally: `bun run verify:full` completed through build.
   Canonical generated artifacts pass `docs:check`. Only the canonical generators may
   update these artifacts. Pin the repair commit and retain its clean exact-SHA
   gate log before packaging; the initial SHA remains unaccepted.
2. Desktop `verify:source` passed locally, including 49 Rust tests. Complete
   the repair baseline before building the exact-SHA managed package;
   packaging requires a clean tracked checkout.
3. Follow runbook Section 6A on a disposable profile: install, first/repeat
   launch, Smart Open, keyboard navigation, stale-state behavior and two-model
   synchronization. Check Runtime status hydration, About version, Plugin file
   action and staged-update reporting against observed native behavior.
4. Prove matching Gateway/plugin identity and project affinity, then execute
   Geometry → Texturing → Animation → Particle and persistence prepare/reopen/
   verify. Keep the shared fixture and Gateway; run independent fixtures later.
5. Test recovery, then compare Golden Tasks only after quality passes. Require
   identical reference/model fingerprints, source/build, model/client identity
   and actual telemetry. Missing tokens remain null.

Use the existing runbook and proof owner rather than adding a parallel ledger.
Do not repeat accepted source gates merely because they ran elsewhere. Native
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
Windows LOCAL_CODE is active. Source verification is local evidence; native testing has not run.

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
