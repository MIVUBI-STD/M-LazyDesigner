# LazyDesigner Next Action

Updated: 2026-09-22
Branch: `Local` only.

This file owns **current continuation only**. Stable architecture belongs in
`docs/01-product/` and `docs/04-system/`; exact proof interpretation belongs in
`docs/05-operations/current-validation.md`. Do not turn this file into a history
log, research archive, or duplicate roadmap.

## Current Direction

`REMOTE_GITHUB` remains the source-development authority until the current
source head has matching repository/MCP CI proof.

Historical reusable baseline includes:

```text
generated freshness PASS
modern MCP 2026 negotiation/list/call PASS
legacy 2025 JSON initialize/list/call PASS
```

Historical proof does not automatically transfer to changed SHAs.

Current architecture remains:

```text
user intent / approved reference
→ LazyDesigner Control
→ four-tool Gateway
→ Runtime
→ Blockbench
→ structured receipt
→ control_delta
→ deterministic continuation action
```

Public Gateway surface stays:

```text
status
search_capabilities
describe_capability
invoke_capability
```

The persistent Gateway survives Runtime/plugin reload. Runtime owns Blockbench
execution. Canonical Control source is `mcp/gateway/control/`; former `mcp/gateway/navigator/` source is removed and remains retired. Control owns bounded routing/context projection, not authored truth.

## Remote Work Boundary

Remote work may finish:

- source/type correctness;
- deterministic routing/orchestration contracts;
- repository/runtime regression tests;
- generated-freshness checks;
- static Zero-Waste guards and benchmarks;
- build/provenance preparation that CI can prove.

Current authoring automation must continue through existing owners rather than
new public capability families:

```text
Geometry / parametric recipe → existing Geometry owners
UV                        → existing UV/Texturing owners
Texture/material          → existing Painter/Texture owners
Rig                       → add_group / bone_rigging owners
Animation                 → existing animation owners
Control continuation      → Gateway Control reducer
```

Keep the system additive and deterministic. No second
Control/router/profile/state system.

## Zero-Waste Rules

Optimize **cost to accepted result**, not tool count in isolation.

Hot-path rules:

- known capability → invoke directly;
- search only for unknown/stale capability identity;
- describe only for real schema uncertainty;
- status only for orientation, authority change, or recovery;
- reuse content-addressed specialist/profile context;
- invalidate only materially affected evidence;
- authoritative mutation receipts replace reassurance reads;
- visual verification must be decision-changing and scope-bounded;
- batch mechanical operations when existing capability semantics allow it;
- unknown mutation outcome never auto-retries.

Do not add an AI planner, vector store, background heartbeat, persistent
dependency database, duplicate authoring engine, or new tool family merely to
reduce prompt size.

## Proof Discipline

Source/static/CI claims are exact-SHA claims.

A changed source head must not inherit earlier wording such as Runtime/Gateway
typecheck PASS, Runtime regression PASS, or build PASS unless matching current
CI actually completed successfully.

There is no claim of Bun/typecheck/CI/local/live PASS until that proof actually ran.

Read exact current proof from GitHub Actions and
`docs/05-operations/current-validation.md`.

## LOCAL_CODE

After REMOTE_GITHUB source gates are clean, `LOCAL_CODE` owns only residue that
requires an executable checkout/toolchain, including:

- canonical generator/filesystem work unavailable remotely;
- local benchmark telemetry not produced by CI;
- prepared harness execution whose result depends on the local environment.

Do not redo repository audits already proven by matching CI.

## LIVE_BLOCKBENCH

`LIVE_BLOCKBENCH` owns native/session/visual evidence:

- installed Runtime identity and reconnect behavior;
- real Blockbench Undo/Redo and persistence;
- project/tab Save and Save As behavior;
- native UV/Painter/animation/particle execution;
- plugin reload and app close/open recovery;
- visual/reference acceptance;
- accepted-result correction rounds and real usage telemetry.

Use `docs/05-operations/local-acceptance-runbook.md` for that residue.

## Stop Rules

- no second Control/router/profile/state system;
- no duplicate Desktop project database;
- no capability reduction solely for context savings;
- no mutation auto-retry after unknown outcome;
- No hand-editing generated docs/output; generated API/prompt artifacts remain generator-owned;
- no speculative abstraction after the current owner can express the need;
- no claim above the current execution-context proof ceiling.

When REMOTE_GITHUB checks are green, stop remote feature expansion and hand off
only the remaining LOCAL_CODE / LIVE_BLOCKBENCH proof.
