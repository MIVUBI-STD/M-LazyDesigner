# Gateway Execution

Owns Gateway-side capability execution orchestration between client-facing handlers, Control, capability semantics, local providers, session state, and the Runtime backend.

```text
capabilityExecutor.ts
  precondition evaluation
  Runtime/local capability dispatch
  Control receipt/delta integration
  session fact updates
  result compaction
  benchmark trace hooks
```

This domain is above the Runtime transport layer.

Dependency direction:

```text
execution -> runtime
execution -> control
execution -> capabilities
execution -> providers
execution -> session

runtime -X-> execution
runtime -X-> control
```

Runtime owns connection/affinity/recovery/queue mechanics only. Do not place workflow orchestration back under `gateway/runtime/`.


`orchestrationRecoveryState.ts` owns process/project-scoped verification evidence and correction-loop recovery across Runtime generation changes and project-affinity epochs.

`benchmarkTrace.ts` owns optional Gateway call telemetry for benchmark/evaluation runs; it is execution observability, not Runtime transport.


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

Evidence/correction handles are scoped by process identity plus project-affinity epoch. Returning to a previously used project creates a new epoch; earlier handles do not become valid again.

Runtime-generation reconnect within the same project enters recovery and requires fresh evidence. Project-affinity change hard-resets project-scoped orchestration state instead of transferring it between projects.

## Gateway process restart

Execution registries are intentionally process-local. A Gateway process restart does not restore verification evidence, correction loops, continuation groups, or their handles.

Durable/reconstructible truth remains elsewhere:

```text
Runtime / open Blockbench project
→ authored geometry, texture, animation, active project identity

Workspace README / Reference Package
→ Stage, gates, next step, blockers, approved reference context

Control status + fresh inspection
→ reconstruct current orientation after Gateway restart
```

Control continuation checkpoints are conversation-compaction metadata only and do not resurrect process-local evidence/correction registries.
