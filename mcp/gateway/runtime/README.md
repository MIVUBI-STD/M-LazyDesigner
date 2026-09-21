# Gateway Runtime Boundary

This folder owns the long-lived Gateway -> Blockbench Runtime connection boundary.

- `connectionManager.ts` — connection lifecycle coordinator.
- `reconnectPolicy.ts` — deterministic retry/backoff policy.
- `runtimeSession.ts` — process-local connection observability.
- `projectAffinity.ts` — project/authoring affinity headers and health parsing.
- `recovery.ts` — normalized recovery guidance for Gateway errors.
- `backendContract.ts` — pure backend error/status/result contracts and normalization helpers.
- `operationQueue.ts` — serialized authoring queue + operation metrics.
- `affinityPolicy.ts` — pure project/authoring affinity validation and binding policy.
- `identity.ts` — Runtime URL validation + stable Runtime signature.
- `interruptionPolicy.ts` — read-only vs mutation interruption retry classification.

The same-named files at `gateway/` are compatibility re-exports only. Keep backend orchestration in `gateway/backend.ts`; do not place capability search/control logic here.
