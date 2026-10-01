# Persistent Gateway Connection Architecture

## Goal

Keep the AI client connected to one long-lived Gateway process while allowing the Blockbench Runtime/plugin to reload, rebuild, change phase, or temporarily disappear without requiring a Codex restart or a Blockbench restart.

```text
Codex / AI client
      │ stable stdio session
      ▼
LazyDesigner Gateway (long-lived)
      │ reconnectable loopback session
      ▼
LazyDesigner Runtime / Blockbench plugin
      │
      ▼
Blockbench
```

The Gateway is the persistence boundary. Runtime connectivity is disposable and recoverable.

## Invariants

1. The Gateway process survives Runtime/plugin reloads.
2. Runtime transport objects and capability catalogs are disposable.
3. Runtime build/signature changes invalidate only the backend connection/catalog, not the AI-client session.
4. Mutations are never automatically replayed after an interrupted call.
5. Read-only discovery may recover on the next explicit request.
6. Project affinity fails closed and is never silently moved to another Blockbench tab.
7. Authoring-phase affinity is preserved across reconnects when Runtime still honors it.
8. Reconnect attempts use bounded exponential backoff; no heartbeat or background polling is required.
9. Cached authored model state never lives in Gateway.
10. The public MCP surface remains exactly four tools.
11. Capability-specific affinity behavior is declared in canonical capability metadata, not as new tool-name branches inside Gateway.

## Connection state

```text
offline
  ↓ explicit request
probing
  ↓ health valid
connecting
  ↓ MCP handshake + catalog
ready

failure at probe/connect/call
  ↓
degraded/offline
  ↓ bounded backoff
next explicit request retries
```

There is intentionally no background reconnect loop. Recovery is demand-driven, which avoids idle traffic and keeps token/network/runtime overhead negligible.

## Hot Runtime replacement

On every backend operation that needs Runtime authority:

1. Probe `/health` with current affinity headers.
2. Build a stable Runtime signature.
3. If signature matches the connected signature, reuse the MCP client and cached catalog.
4. If signature differs, close only the old backend client.
5. Connect to the new Runtime instance.
6. Refresh the catalog once.
7. Continue the same Gateway/Codex session.

Expected examples:

```text
plugin reload      → signature changes → backend reconnect only
Runtime rebuild    → signature changes → backend reconnect only
phase handoff      → catalog invalidated → reconnect on next request
Blockbench closed  → Gateway remains alive/offline
Blockbench reopened→ next request reconnects automatically
```

## Backoff

Repeated unavailable probes must not create a tight retry loop.

Default policy:

```text
250ms → 500ms → 1s → 2s cap
```

Repeated observations while already offline/degraded do not inflate the backoff again. A successful Runtime reachability check may clear the cooldown so recovery can proceed without waiting for an obsolete failure delay.

The backoff controls Gateway→Runtime attempts only. It never shuts down the Gateway and never asks the AI client to reconnect.

## Mutation interruption

A transport failure after `tools/call` may occur after Blockbench already applied a mutation. Therefore:

```text
read-only interrupted → safe_to_retry=true
mutation interrupted  → OUTCOME_UNKNOWN, safe_to_retry=false
```

The next step for `OUTCOME_UNKNOWN` is inspection/reconciliation, not automatic replay.

## Control-plane efficiency

The capability catalog should be treated as local Gateway cache after one successful Runtime handshake. Search and description should use that cache while its Runtime signature is current. Runtime mutations remain serialized because Blockbench has process-global active-project state.

No background heartbeat, automatic confirmation read, duplicate catalog fetch, or mutation retry should be introduced.

## Declarative capability effects

Capability semantics that affect Gateway-owned state are declared in `mcp/lib/capabilities/metadata.ts`.

```text
ordinary tool
→ projectAffinity: preserve
→ phaseAffinity: preserve
→ invalidateCatalog: false

project-creating tool
→ projectAffinity: adopt_created_project
→ invalidateCatalog: true

phase-changing tool
→ phaseAffinity: update_from_result
→ invalidateCatalog: true
```

`mcp/gateway/capabilities/effects.ts` is the single parser for these result receipts. Gateway backend code should consume that resolver rather than add new `if (capability === "...")` branches. This keeps future tools extensible through metadata instead of Gateway rewrites.

## Ownership boundary

Gateway owns only:

- stable MCP boundary;
- Runtime transport/reconnect;
- capability catalog cache;
- project/phase affinity;
- bounded scheduling/reliability;
- compact connection observability.

Gateway does not own modelling, texturing, animation, particle, or other authoring knowledge. Capability semantics should progressively move to canonical Runtime metadata rather than capability-name special cases in Gateway.


## Canonical Root Owners

The Gateway root intentionally keeps one non-test implementation entry owner; the backend implementation lives under the Runtime integration domain:

```text
index.ts                 public MCP stdio entrypoint and composition root
runtime/backend.ts        Gateway ↔ Runtime backend adapter
```

Canonical subdomains own the rest:

```text
capabilities/  discovery, metadata, graph, effects, semantic dependency/freshness core
contracts/     Gateway protocol + output schemas
control/       context/routing/readiness projection
development/   repository-development diagnosis, impact and verification planning
surface/       stable Gateway surface-profile contract
experimental/  opt-in implementation loaded only for an explicit experimental profile
handlers/      public tool registration/handlers
presentation/  result/status projection and compaction
providers/     Gateway-local capability providers
execution/     capability dispatch, error/result adaptation, benchmark trace
runtime/       connection, queue, affinity and recovery mechanics
session/       process-local facts, continuation and orchestration recovery state
```

Root compatibility facades may remain temporarily for migrated imports, but new implementation must target the canonical subdomain.


## Execution boundary

Execution sits above Runtime transport.

```text
handlers
  ↓
execution/capabilityExecutor.ts
  ├─ Control receipt/delta
  ├─ capability preconditions/effects
  ├─ local provider dispatch
  ├─ session facts
  └─ runtime/backend.ts

execution/gatewayErrors.ts
  = AI-facing error/result adaptation + trace metadata

execution/benchmarkTrace.ts
  = opt-in benchmark telemetry writer

session/orchestrationRecoveryState.ts
  = process/project-scoped verification/correction recovery state

runtime/
  = transport, affinity, queue, reconnect, recovery
```

Runtime must not depend on Control or execution orchestration. The former `runtime/capabilityExecutor.ts` path is compatibility-only.
