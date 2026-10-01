# Gateway Session State

Owns process-local Gateway session state that must survive individual tool calls but must not become durable authored truth.

```text
state.ts
  capability fact state
  current project binding
  Control execution continuation state
  Runtime-generation/project change coordination

orchestrationRecoveryState.ts
  process-session identity
  project-affinity epoch
  verification evidence registry
  correction-loop recovery state
```

Dependency direction:

```text
execution -> session
session   -> control types + capability facts + lib orchestration registries

session -X-> execution
session -X-> runtime transport implementation
```

Session state is process-local. Durable authored truth remains in Runtime/Blockbench, Workspace, and Reference Package sources.
