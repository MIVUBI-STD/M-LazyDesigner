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


## Orchestration recovery ownership

Runtime reconnection after a previously-ready session is a hard orchestration recovery
boundary. `BlockitRuntimeBackend` emits `onRuntimeGenerationChange` only after the
replacement connection reaches `ready`; initial startup does not trigger invalidation.

The Gateway process owns one shared
`GatewayOrchestrationRecoveryState`:

```text
Runtime generation/surface reconnect
→ VerificationEvidenceRegistry.clear()
→ CorrectionLoopRegistry.invalidateRuntimeGeneration()
→ active correction continuations enter VERIFY_PENDING recovery
→ correction attempts remain unchanged
→ complete fresh stale-view evidence is required before correction resumes
```

The runtime signature includes process/build identity plus the active authoring surface.
Therefore a Runtime restart, reconnect onto a different instance/build, project-affinity
rebind that forces a fresh connection, or authoring-surface generation change is treated
conservatively as an evidence boundary. This is intentional: context savings never
authorize reuse across a connection generation whose evidence ownership is uncertain.

Unknown continuation bases still fall back to FULL delivery, and
`UNKNOWN_OUTCOME` remains a separate fail-closed mutation-recovery path.


## Project-affinity isolation

Project affinity is a harder boundary than Runtime-generation recovery.

```text
same project UUID
→ keep orchestration state

Project A → Project B / unbound
→ increment project-affinity epoch
→ clear VerificationEvidenceRegistry
→ clear CorrectionLoopRegistry
→ reset Control execution continuation
→ reset capability facts for the new binding
```

Evidence and correction handles are salted with the current project-affinity epoch.
Therefore identical payloads authored in different project bindings still receive different
handles and continuation identities. Returning to a previously used project creates a new
epoch; handles from the earlier visit do not become valid again.

Runtime-generation reconnect within the same project uses recovery
(`VERIFY_PENDING` + fresh evidence). Project-affinity change uses hard isolation instead:
Project A correction loops, pending groups, evidence handles, continuation IDs, and
recovery metadata are discarded rather than transferred to Project B.
