# LazyDesigner Next Action

This file owns **continuation only**. Stable architecture belongs in
`docs/01-product/` and `docs/04-system/`; current proof interpretation belongs
in `docs/05-operations/current-validation.md`.

## Current direction

## Active: LD-Q04 — native animation restoration refusal contract

The canonical animation domain now adds a small pure
`mcp/lib/animation/nativeRestorationContract.ts` audit inventory,
**consumed by the existing** `prepareContactSamplingPlan`. It lists ten
required before/after recovery surfaces based on upstream Blockbench
animation preview behavior: Timeline/audio playback; Animation and
controller state; Group/Locator/mesh poses; Molang/preview variables;
texture selection and animated frames; model scale/ground/grid; particles
and sounds; onion skin/trails/deformation; editor selection and UI; and
unknown display-animation-frame event/plugin listeners.

Both prepared and rejected sampling plans now include
`restoration_contract`. A prepared source clock returns
`state=BLOCKED_NATIVE_VERIFICATION` with reason
`FULL_PREVIEW_RESTORATION_NOT_ATTESTED`; an invalid clock returns
`SAMPLING_PLAN_NOT_PREPARED`. Every required surface remains
`native_proof=NOT_EXECUTED`. The hard gate is deliberately not
satisfied by self-reported `preview_restoration_verified`, simulated
receipts or caller-declared PASS. It contains no native mutator,
Timeline.seek loop, Undo/retry, second animation executor, registry,
new Gateway tool or generated API edit.

The inventory is a **recovery requirement contract**, not a working
restoration executor or proof of exhaustiveness against arbitrary
external plugins. Blockbench `Animator.preview()` can change
controller-driven Timeline time, bone and mesh pose, effects, texture
selection/frame, preview scale, grid/ground, overlay resources, UI
selection and dispatched listener behavior. `Timeline.pause()` also
calls preview and may touch audio state. Merely returning playhead
time in a `finally` block cannot guarantee the previous user session.

New regressions: seven cases in
`mcp/tests/animation-native-restoration-contract.test.ts` and two
in the existing contact-marker-binding suite. They assert the ten
nonredundant surfaces, refusal despite a valid clock, refusal of fake
native authority, compatibility with the existing opt-in consumer,
and deterministic nonmutating output.

**Proof ceiling:** exact GitHub source and regression definitions; Bun,
full TypeScript/project verification, installed Blockbench, live
preview restoration and visual acceptance **NOT EXECUTED**.
The user cannot local-test; do not request local test or installation.

**Next:** execute the focused native-restoration and contact-marker
tests on the exact `Local` SHA in an authorized cloud Bun worktree.
Before any native sampler can be enabled, construct a disposable
installed Blockbench isolation harness proving each applicable
surface before/after under normal and failed evaluation, and explicit
external-listener isolation. If any requirement remains unknown, keep
`BLOCKED_NATIVE_VERIFICATION` and `native_sampling_state=NOT_EXECUTED`.
Do not substitute `Timeline.time` restoration for real full-scene
recovery or elevate geometric diagnostics into visual approval.

## Deferred native verification — LD-Q01, LD-Q02 and LD-Q03

The user cannot currently local-test. LD-Q01 silhouette captures,
LD-Q02 real cross-Cube edge atlas sampling, and LD-Q03 rotated Cube
pivot placement remain source-defined but **not native-accepted**.
Their exact commits/tests are preserved; do not ask for a local
checkout, local Blockbench, or installation as a prerequisite.

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

## Optional external REA investigation

The former `audit:rea` wrapper, its duplicate Evidence projection, synthetic
fixtures and child-process manager are retired. Use the upstream REA CLI
directly according to `mcp/scripts/audit/README.md`. REA owns its artifact
schemas, resource policies, authenticated Evidence and runtime authority.
Select the actual layer under investigation (editor ASAR, LazyDesigner source,
Tauri/native, or live Gateway/Blockbench); none is a substitute for another.
REA executable analysis and native acceptance are **NOT EXECUTED** here.

## Receipt authority — source hardening

`mcp/gateway/control/delta/receipts.ts` selects exactly one receipt authority:
an MCP envelope's `structuredContent`, if present; otherwise a flat Runtime
receipt. Contradictory outer/display fields cannot vote alongside the canonical
payload. Source regression definitions cover contradictory and malformed
envelopes. Matching Bun/live Blockbench validation is **NOT EXECUTED**.

## REA-informed authoring evidence hardening — source only

Current `Local` retains the single Gateway/Runtime/Control architecture while
removing wrong interpretation at its existing boundaries:

- `lib/receipts/cubeMutation.ts` owns the explicit native Cube changed-field
  vocabulary and canonical simplify no-change semantics. Unknown or
  mixed-malformed geometry effects invalidate dependent UV/Texture/Animation
  evidence conservatively, not as a precise partial effect.
- `gateway/control/delta/receipts.ts` chooses one canonical
  `structuredContent` receipt over conflicting envelope fields.
  `gateway/capabilities/graph.ts` shares the Cube no-change contract; Control
  also requires the requested `manage_cubes(operation=simplify)` branch.
  A create/update/batch_update response cannot launder a simplify preview into
  `NO_CHANGE`. Genuine simplify previews preserve existing UV/Texture facts.
- `gateway/control/delta/freshness.ts` uses existing typed
  `modifyGroupReceiptSchema`, `removeElementReceiptSchema` and
  `renameElementReceiptSchema` for narrow impact/no-op declarations;
  malformed or incomplete results use existing conservative default
  invalidation. `geometryInvalidation` and freshness no longer separately
  interpret Group changed fields.
- `lib/receipts/renameElement.ts` parses batch Group rename before its
  overlapping single-element shape, preserving `affected_animations`
  when the Runtime sends `element` and `changes` together.
- `manage_material_instances` read/mutation intent comes from existing
  branch metadata, not a response-shaped no-op heuristic.
  `manage_material(operation=save)` and direct `save_material_config` no-op
  both require the existing typed material persistence receipt. The consolidated
  branch must be `operation=save`; missing or mismatched branch identity
  cannot launder an unrelated create/configure/assign mutation as NO_CHANGE.
  Missing or contradictory persistence evidence is conservatively stale.
- `manage_render_profile` uses the requested canonical operation branch
  together with source-owned zero-write receipts for compiled-only bind and
  assignment. A mismatched `execution: "read"` response cannot suppress
  invalidation of an authoring mutation. Actual inspect remains a QUERY with
  `verification_class=not_applicable`.
- Two legacy source-string tests were corrected to inspect the current
  `gateway/execution/capabilityExecutor.ts` owner rather than the
  compatibility-only `gateway/runtime/capabilityExecutor.ts` facade.
  This is a source/test-representativeness correction, not an executed PASS.

### Capability Graph readiness — source correction

Producer/consumer contracts now distinguish a non-error call from confirmed
authoring evidence:

- `manage_cubes.create` only promotes `geometry_available` when the Cube
  creation receipt has a coherent positive count, unique UUIDs, and finite
  native geometry. The visual framing scope may legitimately be unavailable.
- `create_texture` only promotes `texture_available` from the actual
  branch-specific Runtime result: `blank/template` return nested native
  inventory `bitmap` metadata, while the **shipped** `variant` branch returns
  flat texture dimensions and a source-owned variant plan. The variant receipt
  must bind the new UUID, target group, name and source bitmap coherently.
  The `variant` executor is composed by
  `server/runtime/contracts/texture.ts`; it is **not** dead or unsupported.
  Incomplete success is UNKNOWN unless prior texture existence was proven.
  No texture receipt implies painting/UV visual approval.
- `create_animation` only promotes `animation_available` with the native
  codec's reported clip identity, requested name and nonnegative effect/bone
  counts. Missing identity preserves UNKNOWN; no playback or motion fidelity
  follows from creation alone.
- `manage_animation_timeline` now projects one canonical Graph contract onto
  all six actual Runtime branches. Mutating keyframe/graph/batch/timeline/
  paste/properties actions require existing Animation and invalidate old visual
  proof; requested CONTROL actions (play/selection/clipboard copy) retain it.
  The native unchanged loop receipt only preserves proof when its requested
  action and loop mode match. A branchless fake timeline call is not proof.
- `manage_animation_controller(resource_kind=...)` compile-only no-change now
  requires a matching caller branch and source-owned `runtime_resource`
  receipt with `source_path=null` and `write=null`. An actual native
  controller edit or mismatched resource result cannot borrow that no-op.
  `lib/receipts/animationController.ts` owns the shared receipt schema.
- `manage_cubes.simplify` plans/unchanged results require the actual
  source-shaped dry-run receipt; `NO_CHANGE` cannot be claimed from a label.
- `manage_uv_layout.plan` only promotes `uv_plan_available` with a
  source-fingerprint-bound, applicable plan report without hard violations.
  **Availability boundary:** `manage_uv_layout` is still intentionally NOT
  registered in Runtime (see `mcp/tests/uv-registration-readiness.test.ts`).
  These Graph checks protect future wiring only; they are not a shipped or
  live-authoring feature. Register it only with canonical generated artifacts
  and matching native acceptance, never by bypassing docs or tests.
- `manage_uv_layout.apply` only promotes `uv_layout_current` when the
  native transaction receipt binds to the requested source fingerprint.
  An incomplete successful apply makes existing UV currency unknown.
  Runtime registry/fingerprint checks remain final plan authority.

**Capability/schema audit:** a stale `build/docs-manifest` import in branch
tests and the SDK subprocess test has been corrected to the canonical
`scripts/generate/internal/docs-manifest.ts` owner. The old
`semantic-history-contract` file-name assertion is replaced with actual
Control-delta behavior for valid and malformed Undo receipts. Branch consistency
checks read the composed Runtime texture schema, including the active
`type=variant` branch; normal runtime extensions also own animation properties.
These source tests still require Bun execution; their presence is not PASS.

Focused executable proof owners: `mcp/gateway/capabilities/graph.test.ts`,
`mcp/tests/contracts/cube-receipt-contract.test.ts`,
`mcp/tests/uv-plan-branch-semantics.test.ts`, and
`mcp/tests/gateway-control-invalidation.test.ts`.
This is **source implemented only**; these newly added checks, REA executable
analysis and native Blockbench were **NOT EXECUTED** for this HEAD.

All of the above are **SOURCE IMPLEMENTED**, not performance or native PASS.
Focused regression definitions were added/updated at canonical consumers.
**Bun, exact-head CI, real REA executable investigation and LIVE_BLOCKBENCH
were NOT EXECUTED** for these commits. Do not claim fewer tool calls, better
visual fidelity, current Blockbench compatibility or successful native Undo
until the corresponding measured/installed evidence exists.

Next practical proof priority: first resolve generator-owned stale
`mcp/docs/api.json` and `mcp/docs/index.html` through the canonical Bun
generator (never hand-edit compiled docs), then run the exact final-HEAD
source gate and only subsequently the native acceptance runbook. Keep the
source/cost/visual proof levels separate; no new auditing framework needed.

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
