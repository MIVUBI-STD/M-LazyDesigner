# Gateway Execution

Owns capability invocation orchestration across Runtime, Control, capability policy, local providers, session state, and benchmark tracing.

```text
capabilityExecutor.ts
  Runtime invocation
  precondition evaluation
  Control receipt/delta projection
  session fact updates
  result compaction
  trace recording
```

This domain is intentionally above `runtime/` and `control/`.

Dependency direction:

```text
execution -> runtime
execution -> control
execution -> capabilities
execution -> providers
execution -> session

runtime -X-> control
runtime -X-> execution
```

Do not move transport/reconnect state, authored state, or capability metadata ownership into this folder.


`gatewayErrors.ts` owns AI-facing error/result adaptation and trace metadata extraction for Gateway tool execution. Runtime owns backend error contracts and recovery policy inputs, not MCP result shaping.
