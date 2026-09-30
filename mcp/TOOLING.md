# MCP Tooling Boundary

These directories support Runtime build, development, verification, benchmarking, generation, and local operations. They are not production Runtime owners.

```text
build/         Runtime bundle/watch + prompt-manifest build input
scripts/       verification, measurement, deploy, and maintenance entrypoints
compatibility/ compatibility policy data consumed by Runtime/distribution/Desktop
```

## Dependency direction

```text
tooling → production source : allowed when tooling needs product contracts
production source → tooling : forbidden
```

Production source means `gateway/`, `lib/`, `plugin/`, `server/`, and `ui/`.

Do not move production behavior into a script because it is easier to call there. If behavior affects Runtime/Gateway/Blockbench semantics, place it under its production owner and let tooling call that owner.

These folders remain at the MCP package root during the current compatibility phase because package scripts and GitHub workflows reference their paths. Consolidation into a physical `tooling/` directory should happen only when those references can be migrated atomically and the move reduces navigation cost more than it adds path churn.

Product install/update/repair/recovery ownership is repository-root `../distribution/`. Benchmark fixtures are colocated under `scripts/benchmark/fixtures/` rather than a parallel package-root benchmark domain.
