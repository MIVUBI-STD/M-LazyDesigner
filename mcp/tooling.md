# MCP Tooling Boundary

These directories support development, verification, benchmarking, packaging, and distribution. They are not production Runtime owners.

```text
build/         bundle/docs/prompt generation
scripts/       verification, measurement, deploy, and maintenance entrypoints
benchmarks/    benchmark fixtures/corpora
distribution/ managed install/update/repair/recovery tooling
compatibility/ compatibility policy data consumed by distribution/Desktop
```

## Dependency direction

```text
tooling → production source : allowed when tooling needs product contracts
production source → tooling : forbidden
```

Production source means `gateway/`, `lib/`, `plugin/`, `server/`, and `ui/`.

Do not move production behavior into a script because it is easier to call there. If behavior affects Runtime/Gateway/Blockbench semantics, place it under its production owner and let tooling call that owner.

These folders remain at the MCP package root during the current compatibility phase because package scripts and GitHub workflows reference their paths. Consolidation into a physical `tooling/` directory should happen only when those references can be migrated atomically and the move reduces navigation cost more than it adds path churn.
