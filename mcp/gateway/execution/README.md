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
