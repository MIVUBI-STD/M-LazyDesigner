# Gateway Execution

Owns cross-layer capability invocation orchestration after a capability has already been selected.

This domain may coordinate:

- Runtime invocation;
- Control delta / receipt handling;
- capability precondition graph updates;
- session fact updates;
- Gateway result compaction;
- benchmark tracing.

It does **not** own Runtime connection/recovery, Control policy, capability semantics, or session state.

Dependency direction:

```text
execution -> runtime
execution -> control
execution -> capabilities
execution -> providers/session/presentation

runtime -X-> control
runtime -X-> execution
```

The former `gateway/runtime/capabilityExecutor.ts` path is compatibility-only.
