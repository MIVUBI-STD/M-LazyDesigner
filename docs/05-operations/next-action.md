# LazyDesigner Next Action

This file owns **continuation only**. Stable architecture belongs in
`docs/01-product/` and `docs/04-system/`; current proof interpretation belongs
in `docs/05-operations/current-validation.md`.

## Current direction

Continue in `REMOTE_GITHUB`.

The canonical source-verification workflow is `MCP Verify`. Current proof
state is intentionally not mirrored in this continuation document; resolve it
from the exact current `Local` SHA and its GitHub Actions/check results:

```text
Local push
→ exact-SHA proof
→ affected verification when safe
→ full verify:full when bounded proof is insufficient

manual/non-push
→ exact-SHA proof
→ full verify:full
```

Do not claim typecheck, Runtime/Gateway tests, build, remote acceptance,
local/live behavior, or visual/reference acceptance without matching evidence
for the exact current source SHA.

## Next REMOTE_GITHUB work

The structural source-cleanup pass is complete for the current architecture.

Current canonical boundaries are now explicit:

```text
lib domain truth
→ Authoring Recipe
→ Orchestration
→ Runtime
→ Gateway

Gateway:
context/       neutral authoring context contract
capabilities/  discovery/semantic capability truth
control/       product context/readiness/projection
development/   repository diagnosis/source ownership
execution/     capability Runtime + Control coordination
runtime/       transport/affinity/queue/recovery mechanics
session/       process-local facts/continuation/recovery state
surface/       stable client-surface profile
experimental/  opt-in implementation only
```

Do not continue structural refactoring merely for appearance. Remaining compatibility wrappers are intentionally retained until matching local/live compatibility evidence exists.

The next proof stage is deferred by current instruction:

```text
full source verification / CI  → deferred
LOCAL_CODE                     → deferred
LIVE_BLOCKBENCH                → deferred
```

Until proof is reactivated, limit REMOTE_GITHUB work to defects discovered from authoritative source evidence. Do not create new package splits, routers, registries, or migration frameworks.

## Runtime boundary

The persistent Gateway remains the client-stability boundary; Runtime owns
Blockbench execution. Do not move Runtime/native authoring state into Control.

## Zero-Waste rules

Optimize cost to accepted result, not raw tool count.

- known capability → direct invoke;
- search only when identity is unknown/stale;
- describe only for real schema uncertainty;
- status only for orientation, authority change or recovery;
- reuse content-addressed context;
- invalidate only materially affected evidence;
- complete authoritative receipts may replace reassurance reads;
- visual verification must be decision-changing and bounded;
- unknown mutation outcome never auto-retries.

## Proof discipline

A missing, pending, or failed exact-SHA proof is not an invitation to fabricate
a trigger or redesign the product around CI state.

Do not create:

```text
trigger-only commits
temporary proof workflows
temporary branches
proof-marker files
history rewrites
```

The normal `MCP Verify` path remains authoritative. If it continues to produce
no run, diagnose Actions execution/settings through an authorized capability
when available; do not redesign product architecture around that limitation.

## Higher-context residue

`LOCAL_CODE` is only for executable checkout/toolchain residue that cannot be
completed remotely.

`LIVE_BLOCKBENCH` is only for installed/native/session/visual evidence such as
Runtime reconnect, Blockbench Undo/Redo, persistence, native UV/Painter/
Animation/Particle execution, app close/open recovery and visual acceptance.

These are deferred. Do not redo accepted REMOTE_GITHUB analysis when they are
reactivated.

## Stop rules

- no duplicate authoring engine;
- no second semantic state database;
- no speculative planner/vector store/heartbeat;
- No hand-editing generated docs/output; generated API/prompt artifacts remain generator-owned;
- no capability reduction solely for context savings;
- no current-head PASS claim without matching evidence;
- no proof-of-proof infrastructure when an existing owner already answers the
  decision.
