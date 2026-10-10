# LazyDesigner Next Action

This file owns **continuation only**. Stable architecture belongs in
`docs/01-product/` and `docs/04-system/`; current proof interpretation belongs
in `docs/05-operations/current-validation.md`.

## Current direction

`Local` is development/source authority. GitHub Actions are manual-only: a source push does not create an executable proof result. `MCP Verify` runs the full source gate when explicitly dispatched; targeted/affected verifier scripts remain available on demand.

On 2026-10-10 the ten manual-only workflow definitions from `Local` were registered on default branch `main` by commit `1d026a1754033bb8c206b7f25660a906552ad72c`, without promoting product source. The maintainer has since reaffirmed that `Local` alone owns ongoing development; leave `main` unchanged unless a separate release or administrative change is explicitly authorized. Workflow registration is source evidence, not proof that a job was dispatched or passed.

## Next REMOTE_GITHUB work

The structural source-cleanup pass is complete for the current architecture. Repository-development knowledge routing uses existing canonical owners: the `mcp/lib/semantic/knowledge.ts` document-link parser and the bounded `mcp/scripts/development/plan-development-context.ts` consumer. Unresolved SYSTEM_DEVELOPMENT routes traverse only authored Markdown links from the docs router through the system router to the implementation map; exact source ownership bypasses this extra read. Missing required documents must fail visibly. Check relevant developer-context and knowledge-index regressions before claiming executable PASS.

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

Repository ownership audit: 71 explicit capability→implementation/anchor mappings resolved on the checked `Local` tree. The existing `gateway/development/affectedExecution.ts` planner now selects bounded repository and development-consumer checks for agent policy, knowledge, documentation and canonical ownership changes. Migration-sensitive benchmark/recovery paths were reconciled to current files. These source/static checks and unexecuted regression definitions do not prove current-head Bun, TypeScript, Actions or native Blockbench PASS.

Proof is activated by actual task need, not each commit:

```text
REMOTE_GITHUB review → current source/static claim
manual CI            → only when executed checks are necessary
LOCAL_CODE           → genuine toolchain or generator residue
LIVE_BLOCKBENCH      → native/installed/visual acceptance
```

Do not infer current-head executable PASS from history. Avoid package splits, routers, registries or migration frameworks without a real canonical-owner gap.

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

The optional full `MCP Verify` path remains authoritative when explicitly executed. If it continues to produce
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
