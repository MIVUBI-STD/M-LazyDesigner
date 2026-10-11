# LazyDesigner Next Action

This file owns **continuation only**. Stable architecture belongs in
`docs/01-product/` and `docs/04-system/`; current proof interpretation belongs
in `docs/05-operations/current-validation.md`.

## Current direction

Pre-localtest hardening (2026-10-11): `58fa7b9` closes twelve orphan Gateway test files in the full source gate using directory discovery. `d5e8862` moves Runtime URL parsing to the shared connection owner, removing the native Plugin's Gateway-barrel dependency without changing parsing behavior. Earlier Stage/type and process-global queue fixes also remain source-only until verified at the **current exact Local SHA**. No installed Blockbench, long-session, compiler or CI PASS is recorded.


`Local` is working source authority. GitHub Actions are **manual-only**:
a push does not prove executable correctness. Registration history belongs
in `current-validation.md`. ChatGPT + GitHub/cloud work does not require
the user's PC.

## Active: regression and data owners

`mcp/gateway/development/affectedExecution.ts` selects impacted tests and all
ten existing JSON fixture consumers. Unknown fixtures select full verification.
The full `verify:contracts` gate now discovers all Gateway test files, not
only historical hand-picked suites. No new verification framework or state
registry was added. Bun/CI proof on the current source SHA is **NOT EXECUTED**.

## Next REMOTE_GITHUB work

Full CI is user-authorized (2026-10-11) but remains manual-only. This
GitHub connector cannot dispatch `workflow_dispatch`; no Bun runner
is available here.
**Not executed** is the correct evidence state, never a waived gate.

**Confirmed pre-CI blockers:** `mcp/docs/index.html` still embeds the
retired HTTP listener guidance; `mcp/docs/api.json` lacks the new
`capture_model_views.reference_correspondence` input. Canonical
`generate:owned-artifacts` must regenerate these files using Bun and
commit exact generator output, not hand edits. The Hybrid-4 generator's
package-root bug and the verified CI bundle directory bug were corrected
in source but are not executable PASS. Regenerate before final CI;
`docs:check` otherwise cannot succeed.


On one final `Local` SHA, dispatch `MCP Verify`, `Repository Verify`,
`Authoring Policy Verify`, `Dependency Security`, `MCP Conformance`,
`Desktop Verify`, and `Managed Distribution` from the `Local` branch.
The last workflow's release jobs skip on a branch; its Windows package smoke
still runs. `Head Proof` is optional classification only. Do not dispatch
`Release Verify` or `Desktop Draft Release` as a substitute for acceptance.
Require each applicable job's successful steps and exact-SHA provenance;
skipped required work is missing evidence. Diagnose the first actual failure
at its canonical owner, never weaken assertions to obtain green. Only then
proceed to disposable `LIVE_BLOCKBENCH` acceptance in the existing runbook.

`docs/04-system/implementation-map.md` is the canonical development map;
`mcp/gateway/development/sourceOwners.ts` owns capability/source anchors;
`mcp/gateway/development/affectedExecution.ts` owns affected verification.
`mcp/lib/semantic/knowledge.ts` indexes authored Markdown knowledge.
Uncertain SYSTEM_DEVELOPMENT routing uses explicit documentation links,
not inferred graph edges. The cross-owner method regression lives at
`mcp/tests/development/development-context-plan.test.ts`.

## Reference correspondence - separate active topic

Source implementation lives in `mcp/lib/reference/partCorrespondence.ts`.
The optional `capture_model_views.reference_correspondence` consumer uses
recipe-native Cube identity and capture-image hashes for provisional part
correspondence. Source pixel review, hidden-part completeness and visual
quality cannot be inferred from region boxes or missing mappings.
Design: [Visual Part Correspondence](../04-system/visual-part-correspondence.md).
No new GPU service, Gateway tool, Runtime or persistent registry.
Current source still lacks matching Bun/native/visual acceptance.

## Other source lanes pending proof

`docs/04-system/data-lifecycle.md` owns Desktop metadata recovery and
inventory; source includes rotating last-valid snapshots, safe restore,
stale-write refusal, fixture consumers and compatibility alias diagnostics.
`mcp/lib/semantic/knowledge.ts` owns content-hashed Markdown knowledge,
revision deltas and explicit source provenance. None of these source claims
is Windows/Rust/Bun/native PASS; external knowledge revisions are still
caller-provided until independently verified.

## Runtime and proof boundaries

The persistent Gateway owns client stability and Runtime recovery. Control
owns context/readiness; Runtime and Plugin own native Blockbench operations.
Preserve the four-tool Gateway surface, semantic freshness, receipt safety
and fail-closed unknown mutation outcomes.

`REMOTE_GITHUB` may establish source/static facts, never live acceptance.
`LOCAL_CODE` is for genuine toolchain/generator residue unavailable via
connected cloud execution. `LIVE_BLOCKBENCH` is needed for native Undo,
playback, persistence, reconnect, capture and visual approval. A historical,
skipped, different-SHA or prepared test is not current-head PASS. See
`current-validation.md` and `local-acceptance-runbook.md`.

## Stop rules

No second authoring engine or semantic-state database, speculative vector
store, parallel routers, incompatible transport, shadow registry or
proof-of-proof system. Do not hand-edit generated outputs, fabricate
CI-trigger commits, silently change `main`, or require a user-local PC.
Stop when the bounded owner-level task is complete.
