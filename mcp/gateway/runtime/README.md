# Gateway Runtime Boundary

This folder owns the long-lived Gateway -> Blockbench Runtime connection boundary.

- `connectionManager.ts` — connection lifecycle coordinator.
- `reconnectPolicy.ts` — deterministic retry/backoff policy.
- `runtimeSession.ts` — process-local connection observability.
- `projectAffinity.ts` — project/authoring affinity headers and health parsing.
- `recovery.ts` — normalized recovery guidance for Gateway errors.

The same-named files at `gateway/` are compatibility re-exports only. Keep backend orchestration in `gateway/backend.ts`; do not place capability search/control logic here.
